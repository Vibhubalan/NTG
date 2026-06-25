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
  notifyLeaderboardSyncStarted,
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
/** 1 player per batch (~6.3s Henrik: v2+v3+card); continue in-process via after(), not HTTP. */
export const maxDuration = 60;

/** Stay under maxDuration while processing multiple 1-player batches per segment. */
const RUN_TIME_BUDGET_MS = 52_000;
/** Safety cap on background segments (not HTTP hops). */
const MAX_BACKGROUND_SEGMENTS = 200;

type RunTotals = {
  synced: number;
  failed: number;
  skipped: number;
  batches: number;
  pending: number;
};

type SyncRunState = {
  runStartedAt: Date;
  totals: RunTotals;
  currentAct: string;
  totalPlayers: number;
  snapshotRanks: boolean;
  segment: number;
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

function readRunTotals(searchParams: URLSearchParams): RunTotals {
  return {
    synced: Number(searchParams.get("synced") ?? "0") || 0,
    failed: Number(searchParams.get("failed") ?? "0") || 0,
    skipped: Number(searchParams.get("skipped") ?? "0") || 0,
    batches: Number(searchParams.get("batchesDone") ?? "0") || 0,
    pending: Number(searchParams.get("pending") ?? "0") || 0,
  };
}

async function processSyncBatches(
  state: SyncRunState,
  deadlineMs: number,
): Promise<{ totals: RunTotals; hasMore: boolean }> {
  const runId = state.runStartedAt.toISOString();
  let totals = state.totals;
  let snapshotRanks = state.snapshotRanks;

  while (Date.now() < deadlineMs) {
    const result = await syncAllLinkedPlayers({
      fullRefreshBefore: state.runStartedAt,
      maxBatchSize: RANK_SYNC_BATCH_SIZE,
      tryAllRegions: false,
      skipPlayerCard: false,
      snapshotRanks,
      context: { source: "cron", runId, currentActOverride: state.currentAct },
    });
    snapshotRanks = false;
    totals = accumulate(totals, result);
    if (!result.hasMore) {
      return { totals, hasMore: false };
    }
  }

  return { totals, hasMore: true };
}

function resolveTotalPlayers(state: SyncRunState, totals: RunTotals): number {
  const derived = totals.synced + totals.failed + totals.skipped + totals.pending;
  return Math.max(state.totalPlayers, derived);
}

async function finishSyncRun(
  state: SyncRunState,
  totals: RunTotals,
  totalPlayers: number,
): Promise<{ sent: boolean; reason?: string }> {
  await markLeaderboardCronComplete({
    runStartedAt: state.runStartedAt,
    currentAct: state.currentAct,
    synced: totals.synced,
    failed: totals.failed,
    skipped: totals.skipped,
    totalPlayers,
  });
  console.info("[cron/sync-ranks] Daily run complete", {
    runStartedAt: state.runStartedAt.toISOString(),
    synced: totals.synced,
    failed: totals.failed,
    skipped: totals.skipped,
    segments: state.segment,
  });
  return notifyLeaderboardSyncComplete({
    runStartedAt: state.runStartedAt,
    finishedAt: new Date(),
    synced: totals.synced,
    failed: totals.failed,
    skipped: totals.skipped,
    batches: totals.batches,
    pending: 0,
    status: "ok",
  });
}

async function failSyncRun(
  state: SyncRunState,
  totals: RunTotals,
  totalPlayers: number,
  errorMessage: string,
): Promise<void> {
  await markLeaderboardCronError({
    runStartedAt: state.runStartedAt,
    currentAct: state.currentAct,
    synced: totals.synced,
    failed: totals.failed,
    skipped: totals.skipped,
    pending: totals.pending,
    totalPlayers,
    errorMessage,
  }).catch(() => {});
  await notifyLeaderboardSyncComplete({
    runStartedAt: state.runStartedAt,
    finishedAt: new Date(),
    synced: totals.synced,
    failed: totals.failed,
    skipped: totals.skipped,
    batches: totals.batches,
    pending: totals.pending,
    status: "error",
    errorMessage,
  }).catch(() => {});
}

/** Continue sync in-process — avoids Vercel INFINITE_LOOP_DETECTED from self-HTTP. */
async function runDailyRankSyncSegment(state: SyncRunState): Promise<void> {
  if (state.segment >= MAX_BACKGROUND_SEGMENTS) {
    await failSyncRun(
      state,
      state.totals,
      state.totalPlayers,
      `Rank sync stopped after ${MAX_BACKGROUND_SEGMENTS} background segments (safety limit).`,
    );
    return;
  }

  try {
    const deadline = Date.now() + RUN_TIME_BUDGET_MS;
    const { totals, hasMore } = await processSyncBatches(state, deadline);
    const totalPlayers = resolveTotalPlayers(state, totals);

    if (hasMore) {
      await markLeaderboardCronProgress({
        runStartedAt: state.runStartedAt,
        currentAct: state.currentAct,
        synced: totals.synced,
        failed: totals.failed,
        skipped: totals.skipped,
        pending: totals.pending,
        totalPlayers,
      });
      scheduleBackgroundSegment({
        runStartedAt: state.runStartedAt,
        totals,
        currentAct: state.currentAct,
        totalPlayers,
        snapshotRanks: false,
        segment: state.segment + 1,
      });
      return;
    }

    await finishSyncRun(state, totals, totalPlayers);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Sync failed.";
    await failSyncRun(state, state.totals, state.totalPlayers, errorMessage);
  }
}

function scheduleBackgroundSegment(state: SyncRunState): void {
  after(() => runDailyRankSyncSegment(state));
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

  let totalPlayers =
    priorTotals.synced + priorTotals.failed + priorTotals.skipped + priorTotals.pending;

  if (!isContinuation) {
    const stats = await getLeaderboardSyncStats();
    totalPlayers = stats.linkedPlayers;
    await markLeaderboardCronStarted({
      runStartedAt,
      currentAct: envAct,
      totalPlayers,
    });
    await notifyLeaderboardSyncStarted({
      runStartedAt,
      totalPlayers,
      currentAct: envAct,
    }).catch(() => {});
    console.info("[cron/sync-ranks] Daily run started", {
      runStartedAt: runStartedAt.toISOString(),
      totalPlayers,
      currentAct: envAct,
    });
  }

  const initialState: SyncRunState = {
    runStartedAt,
    totals: priorTotals,
    currentAct: envAct,
    totalPlayers,
    snapshotRanks: !isContinuation,
    segment: isContinuation ? 1 : 0,
  };

  try {
    const deadline = Date.now() + RUN_TIME_BUDGET_MS;
    const { totals, hasMore } = await processSyncBatches(initialState, deadline);
    const resolvedTotal = resolveTotalPlayers(initialState, totals);

    if (hasMore) {
      await markLeaderboardCronProgress({
        runStartedAt,
        currentAct: envAct,
        synced: totals.synced,
        failed: totals.failed,
        skipped: totals.skipped,
        pending: totals.pending,
        totalPlayers: resolvedTotal,
      });
      scheduleBackgroundSegment({
        runStartedAt,
        totals,
        currentAct: envAct,
        totalPlayers: resolvedTotal,
        snapshotRanks: false,
        segment: initialState.segment + 1,
      });

      return NextResponse.json({
        ok: true,
        mode: isContinuation ? "daily-full-refresh-continuation" : "daily-full-refresh",
        runStartedAt: runStartedAt.toISOString(),
        batchesDone: totals.batches,
        notifyEnabled: isLeaderboardSyncNotifyEnabled(),
        notifyEmail: getLeaderboardSyncNotifyEmail(),
        notifySent: false,
        notifyReason: "continuing_in_background",
        currentAct: envAct,
        synced: totals.synced,
        failed: totals.failed,
        skipped: totals.skipped,
        hasMore: true,
        pending: totals.pending,
      });
    }

    const notify = await finishSyncRun(
      { ...initialState, totals },
      totals,
      resolvedTotal,
    );

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
      synced: totals.synced,
      failed: totals.failed,
      skipped: totals.skipped,
      hasMore: false,
      pending: 0,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Sync failed.";
    await failSyncRun(initialState, priorTotals, totalPlayers, errorMessage);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
