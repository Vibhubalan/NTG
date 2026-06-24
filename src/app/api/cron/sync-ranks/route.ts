import { isCronAuthorized } from "@/lib/cron-auth";
import {
  markLeaderboardCronComplete,
  markLeaderboardCronError,
  markLeaderboardCronProgress,
  markLeaderboardCronStarted,
} from "@/lib/leaderboard-cron-status";
import {
  getLeaderboardSyncNotifyEmail,
  isLeaderboardSyncNotifyEnabled,
  notifyLeaderboardSyncComplete,
} from "@/lib/leaderboard-sync-notify";
import {
  getEnvValorantActKey,
  SYNC_ACT_NOT_CONFIGURED,
} from "@/lib/valorant-sync-act";
import { serverEnv } from "@core/config/env.server";
import {
  getLeaderboardSyncStats,
  RANK_SYNC_BATCH_SIZE,
  syncAllLinkedPlayers,
  syncUserRank,
  type SyncAllResult,
} from "@tournaments-leagues/index";
import { after, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** 1 player per batch (~6.3s Henrik: v2+v3+card); chain via follow-up HTTP calls. */
export const maxDuration = 60;

type RunTotals = {
  synced: number;
  failed: number;
  skipped: number;
  batches: number;
  pending: number;
};

const emptyTotals = (): RunTotals => ({
  synced: 0,
  failed: 0,
  skipped: 0,
  batches: 0,
  pending: 0,
});

function accumulate(totals: RunTotals, batch: SyncAllResult): RunTotals {
  return {
    synced: totals.synced + batch.synced,
    failed: totals.failed + batch.failed,
    skipped: totals.skipped + batch.skipped,
    batches: totals.batches + 1,
    pending: batch.pending,
  };
}

function cronSiteOrigin(): string {
  const raw =
    serverEnv.authUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.ntgesports.com";
  return raw.replace(/\/$/, "");
}

function scheduleNextRankBatch(
  runStartedAt: Date,
  totals: RunTotals,
  currentAct: string,
  totalPlayers: number,
): void {
  const secret = serverEnv.cronSecret;
  if (!secret) return;

  const params = new URLSearchParams({
    runStartedAt: runStartedAt.toISOString(),
    synced: String(totals.synced),
    failed: String(totals.failed),
    skipped: String(totals.skipped),
    batchesDone: String(totals.batches),
    pending: String(totals.pending),
  });
  const url = `${cronSiteOrigin()}/api/cron/sync-ranks?${params.toString()}`;

  after(async () => {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text.slice(0, 200) || `Continuation failed (${res.status})`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Sync continuation failed.";
      await markLeaderboardCronError({
        runStartedAt,
        currentAct,
        synced: totals.synced,
        failed: totals.failed,
        skipped: totals.skipped,
        pending: totals.pending,
        totalPlayers,
        errorMessage,
      }).catch(() => {});
      await notifyLeaderboardSyncComplete({
        runStartedAt,
        finishedAt: new Date(),
        synced: totals.synced,
        failed: totals.failed,
        skipped: totals.skipped,
        batches: totals.batches,
        pending: totals.pending,
        status: "error",
        errorMessage,
      });
    }
  });
}

function readRunTotals(searchParams: URLSearchParams): RunTotals {
  return {
    synced: Number(searchParams.get("synced") ?? "0") || 0,
    failed: Number(searchParams.get("failed") ?? "0") || 0,
    skipped: Number(searchParams.get("skipped") ?? "0") || 0,
    batches: Number(searchParams.get("batchesDone") ?? "0") || 0,
    pending: Number(searchParams.get("pending") ?? "0") || 0,
  };
}

async function sendSyncNotify(
  runStartedAt: Date,
  totals: RunTotals,
  status: "ok" | "error",
  errorMessage?: string,
) {
  await notifyLeaderboardSyncComplete({
    runStartedAt,
    finishedAt: new Date(),
    synced: totals.synced,
    failed: totals.failed,
    skipped: totals.skipped,
    batches: totals.batches,
    pending: totals.pending,
    status,
    errorMessage,
  });
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const envAct = getEnvValorantActKey();
  if (!envAct) {
    if (!req.url.includes("runStartedAt=")) {
      const now = new Date();
      await markLeaderboardCronError({
        runStartedAt: now,
        errorMessage: SYNC_ACT_NOT_CONFIGURED,
      }).catch(() => {});
      await notifyLeaderboardSyncComplete({
        runStartedAt: now,
        finishedAt: new Date(),
        synced: 0,
        failed: 0,
        skipped: 0,
        batches: 0,
        pending: 0,
        status: "error",
        errorMessage: SYNC_ACT_NOT_CONFIGURED,
      }).catch(() => {});
    }
    return NextResponse.json({ error: SYNC_ACT_NOT_CONFIGURED }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId) {
    try {
      const result = await syncUserRank(userId, {
        tryAllRegions: true,
        skipPlayerCard: false,
        context: {
          source: "cron",
          currentActOverride: envAct,
        },
      });
      return NextResponse.json({
        ok: result.ok,
        ...(result.ok ? { synced: 1 } : { error: result.error }),
      });
    } catch {
      return NextResponse.json({ error: "Sync failed." }, { status: 500 });
    }
  }

  const runStartedAtRaw = searchParams.get("runStartedAt");
  const runStartedAt = runStartedAtRaw ? new Date(runStartedAtRaw) : new Date();
  if (Number.isNaN(runStartedAt.getTime())) {
    return NextResponse.json({ error: "Invalid runStartedAt." }, { status: 400 });
  }

  const isContinuation = Boolean(runStartedAtRaw);
  const priorTotals = isContinuation ? readRunTotals(searchParams) : emptyTotals();

  let totalPlayers = priorTotals.synced + priorTotals.failed + priorTotals.skipped + priorTotals.pending;
  if (!isContinuation) {
    const stats = await getLeaderboardSyncStats();
    totalPlayers = stats.linkedPlayers;
    await markLeaderboardCronStarted({
      runStartedAt,
      currentAct: envAct,
      totalPlayers,
    });
    console.info("[cron/sync-ranks] Daily run started", {
      runStartedAt: runStartedAt.toISOString(),
      totalPlayers,
      currentAct: envAct,
    });
  }

  try {
    const runId = runStartedAt.toISOString();
    const result = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      maxBatchSize: RANK_SYNC_BATCH_SIZE,
      tryAllRegions: false,
      skipPlayerCard: false,
      snapshotRanks: !isContinuation,
      context: { source: "cron", runId, currentActOverride: envAct },
    });

    const totals = accumulate(priorTotals, result);
    if (totalPlayers < totals.synced + totals.failed + totals.skipped + totals.pending) {
      totalPlayers = totals.synced + totals.failed + totals.skipped + totals.pending;
    }

    if (result.hasMore) {
      await markLeaderboardCronProgress({
        runStartedAt,
        currentAct: envAct,
        synced: totals.synced,
        failed: totals.failed,
        skipped: totals.skipped,
        pending: totals.pending,
        totalPlayers,
      });
      scheduleNextRankBatch(runStartedAt, totals, envAct, totalPlayers);

      return NextResponse.json({
        ok: true,
        mode: isContinuation ? "daily-full-refresh-continuation" : "daily-full-refresh",
        runStartedAt: runStartedAt.toISOString(),
        batchesDone: totals.batches,
        notifyEnabled: isLeaderboardSyncNotifyEnabled(),
        notifyEmail: getLeaderboardSyncNotifyEmail(),
        notifySent: false,
        notifyReason: "continuing_via_http",
        currentAct: envAct,
        ...result,
      });
    }

    await markLeaderboardCronComplete({
      runStartedAt,
      currentAct: envAct,
      synced: totals.synced,
      failed: totals.failed,
      skipped: totals.skipped,
      totalPlayers,
    });
    console.info("[cron/sync-ranks] Daily run complete", {
      runStartedAt: runStartedAt.toISOString(),
      synced: totals.synced,
      failed: totals.failed,
      skipped: totals.skipped,
    });

    const notify = await notifyLeaderboardSyncComplete({
      runStartedAt,
      finishedAt: new Date(),
      synced: totals.synced,
      failed: totals.failed,
      skipped: totals.skipped,
      batches: totals.batches,
      pending: 0,
      status: "ok",
    });

    return NextResponse.json({
      ok: true,
      mode: isContinuation ? "daily-full-refresh-continuation" : "daily-full-refresh",
      runStartedAt: runStartedAt.toISOString(),
      batchesDone: totals.batches,
      complete: true,
      notifyEnabled: isLeaderboardSyncNotifyEnabled(),
      notifyEmail: getLeaderboardSyncNotifyEmail(),
      notifySent: notify.sent,
      notifyReason: notify.reason,
      currentAct: envAct,
      ...result,
      hasMore: false,
      pending: 0,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Sync failed.";
    await markLeaderboardCronError({
      runStartedAt,
      currentAct: envAct,
      synced: priorTotals.synced,
      failed: priorTotals.failed,
      skipped: priorTotals.skipped,
      pending: priorTotals.pending,
      totalPlayers,
      errorMessage,
    }).catch(() => {});
    await sendSyncNotify(
      runStartedAt,
      priorTotals,
      "error",
      errorMessage,
    );
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
