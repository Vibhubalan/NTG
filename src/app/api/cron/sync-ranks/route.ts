import { isCronAuthorized } from "@/lib/cron-auth";
import {
  getLeaderboardSyncNotifyEmail,
  isLeaderboardSyncNotifyEnabled,
  notifyLeaderboardSyncComplete,
} from "@/lib/leaderboard-sync-notify";
import { serverEnv } from "@core/config/env.server";
import {
  RANK_SYNC_MAX_BATCH_SIZE,
  syncAllLinkedPlayers,
  syncUserRank,
  type SyncAllResult,
} from "@tournaments-leagues/index";
import { after, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** Up to 26 Henrik calls × ~2.1s ≈ 55s per batch; continuation via `after()`. */
export const maxDuration = 120;

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

async function continueDailyRankRefresh(
  runStartedAt: Date,
  initialTotals: RunTotals,
): Promise<RunTotals> {
  let totals = initialTotals;
  let hasMore = true;

  while (hasMore) {
    const next = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      maxBatchSize: RANK_SYNC_MAX_BATCH_SIZE,
    });
    totals = accumulate(totals, next);
    hasMore = next.hasMore;
  }

  return totals;
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

  const userId = new URL(req.url).searchParams.get("userId");

  if (userId) {
    try {
      const result = await syncUserRank(userId);
      return NextResponse.json({
        ok: result.ok,
        ...(result.ok ? { synced: 1 } : { error: result.error }),
      });
    } catch {
      return NextResponse.json({ error: "Sync failed." }, { status: 500 });
    }
  }

  const runStartedAt = new Date();

  try {
    const result = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      maxBatchSize: RANK_SYNC_MAX_BATCH_SIZE,
    });

    if (result.hasMore) {
      const firstBatchTotals = accumulate(emptyTotals(), result);

      after(async () => {
        try {
          const totals = await continueDailyRankRefresh(runStartedAt, firstBatchTotals);
          await sendSyncNotify(runStartedAt, totals, "ok");
        } catch (err) {
          await sendSyncNotify(
            runStartedAt,
            firstBatchTotals,
            "error",
            err instanceof Error ? err.message : "Sync failed.",
          );
        }
      });

      return NextResponse.json({
        ok: true,
        mode: "daily-full-refresh",
        runStartedAt: runStartedAt.toISOString(),
        notifyEnabled: isLeaderboardSyncNotifyEnabled(),
        notifyEmail: getLeaderboardSyncNotifyEmail(),
        notifySent: false,
        notifyReason: "continuing_in_background",
        ...result,
      });
    }

    const totals = accumulate(emptyTotals(), result);
    const notify = await notifyLeaderboardSyncComplete({
      runStartedAt,
      finishedAt: new Date(),
      ...totals,
      status: "ok",
    });

    return NextResponse.json({
      ok: true,
      mode: "daily-full-refresh",
      runStartedAt: runStartedAt.toISOString(),
      notifyEnabled: isLeaderboardSyncNotifyEnabled(),
      notifyEmail: getLeaderboardSyncNotifyEmail(),
      notifySent: notify.sent,
      notifyReason: notify.reason,
      ...result,
    });
  } catch (err) {
    await sendSyncNotify(
      runStartedAt,
      emptyTotals(),
      "error",
      err instanceof Error ? err.message : "Sync failed.",
    );
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}
