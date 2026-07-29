import { LeaderboardRefreshRunKind, LeaderboardRefreshRunStatus } from "@prisma/client";

import {
  markLeaderboardCronComplete,
  markLeaderboardCronError,
  markLeaderboardCronProgress,
  markLeaderboardCronStarted,
} from "@/lib/leaderboard-cron-status";
import {
  getHenrikRequestCount,
  resetHenrikRequestCount,
} from "@/lib/henrik-client";
import {
  acquireLeaderboardRefreshLock,
  clearLeaderboardRefreshLock,
  getLeaderboardRefreshLock,
  getLeaderboardRefreshLockRaw,
  heartbeatLeaderboardRefreshLock,
  LEADERBOARD_DAILY_REFRESH_LOCK_KEY,
  LEADERBOARD_HOURLY_REFRESH_LOCK_KEY,
  type LeaderboardRefreshLockKey,
} from "@/lib/leaderboard-refresh-lock";
import { setLeaderboardLastCompletedRefresh } from "@/lib/leaderboard-last-refresh";
import {
  notifyLeaderboardSyncComplete,
  notifyLeaderboardSyncStarted,
} from "@/lib/leaderboard-sync-notify";
import { getEnvValorantActKey } from "@/lib/valorant-sync-act";
import { prisma } from "@core/database/client";

import {
  listLinkedValorantPlayerIds,
  snapshotTownBoardRanks,
  syncUserRankWithRetryForHourly,
  type RankSyncContext,
  type RankSyncSource,
} from "./rank-sync.service";

/** Leave headroom for cold start, DB, snapshot, and Resend on mode=start (Vercel max 60s). */
const RUN_TIME_BUDGET_MS = 38_000;
/** Don't start another player if we are close to timeout. */
const PLAYER_PROCESSING_SAFETY_MS = 12_000;

export type LeaderboardRefreshKind = "daily" | "hourly";

export type LeaderboardRefreshResult = {
  status: "started" | "continued" | "complete" | "skipped" | "error";
  runId?: string;
  reason?: string;
  totalPlayers: number;
  processed: number;
  successCount: number;
  failedCount: number;
  pending: number;
  henrikRequestCount: number;
  complete: boolean;
  errorMessage?: string;
};

/** @deprecated use LeaderboardRefreshResult */
export type HourlyRefreshResult = LeaderboardRefreshResult;

function prismaKind(kind: LeaderboardRefreshKind): LeaderboardRefreshRunKind {
  return kind === "daily" ? LeaderboardRefreshRunKind.DAILY : LeaderboardRefreshRunKind.HOURLY;
}

function lockKeyForKind(kind: LeaderboardRefreshKind): LeaderboardRefreshLockKey {
  return kind === "daily"
    ? LEADERBOARD_DAILY_REFRESH_LOCK_KEY
    : LEADERBOARD_HOURLY_REFRESH_LOCK_KEY;
}

function syncSourceForKind(kind: LeaderboardRefreshKind): RankSyncSource {
  return kind === "daily" ? "cron" : "hourly_cron";
}

function logPrefix(kind: LeaderboardRefreshKind): string {
  return kind === "daily" ? "[daily-refresh]" : "[hourly-refresh]";
}

export function playersAfterCursor(allIds: string[], cursorUserId: string | null): string[] {
  if (!cursorUserId) return allIds;
  const index = allIds.indexOf(cursorUserId);
  if (index === -1) return allIds;
  return allIds.slice(index + 1);
}

async function failStaleRun(
  runId: string,
  kind: LeaderboardRefreshKind,
  message: string,
): Promise<void> {
  const run = await prisma.leaderboardRefreshRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== LeaderboardRefreshRunStatus.RUNNING) return;

  const finishedAt = new Date();
  await prisma.leaderboardRefreshRun.update({
    where: { id: runId },
    data: {
      status: LeaderboardRefreshRunStatus.ERROR,
      finishedAt,
      errorMessage: message,
    },
  });

  const lockKey = lockKeyForKind(kind);
  const lock = await getLeaderboardRefreshLock(lockKey);
  if (lock?.runId === runId) {
    await clearLeaderboardRefreshLock(lockKey);
  }

  if (kind === "daily") {
    await markLeaderboardCronError({
      runStartedAt: run.startedAt,
      currentAct: getEnvValorantActKey(),
      synced: run.successCount,
      failed: run.failedCount,
      pending: Math.max(0, run.totalPlayers - run.successCount - run.failedCount),
      totalPlayers: run.totalPlayers,
      errorMessage: message,
    }).catch(() => {});
    void notifyLeaderboardSyncComplete({
      runStartedAt: run.startedAt,
      finishedAt,
      synced: run.successCount,
      failed: run.failedCount,
      skipped: 0,
      batches: 0,
      pending: Math.max(0, run.totalPlayers - run.successCount - run.failedCount),
      status: "error",
      errorMessage: message,
    }).catch(() => {});
  }
}

async function resumeRunningRefresh(
  kind: LeaderboardRefreshKind,
  runId: string,
  currentAct: string,
): Promise<LeaderboardRefreshResult> {
  const lockKey = lockKeyForKind(kind);
  const acquired = await acquireLeaderboardRefreshLock(runId, lockKey);
  if (!acquired.ok) {
    const running = await getRunningRun(kind);
    return {
      status: "skipped",
      reason: "already_running",
      runId: acquired.runId,
      totalPlayers: running?.totalPlayers ?? 0,
      processed: running ? running.successCount + running.failedCount : 0,
      successCount: running?.successCount ?? 0,
      failedCount: running?.failedCount ?? 0,
      pending: running
        ? Math.max(0, running.totalPlayers - running.successCount - running.failedCount)
        : 0,
      henrikRequestCount: running?.henrikRequestCount ?? 0,
      complete: false,
    };
  }

  const segment = await processRunSegment(kind, runId, currentAct);
  if (segment.status === "error") return segment;
  return {
    ...segment,
    status: segment.complete ? "complete" : "continued",
  };
}

async function tryRecoverStaleRefreshLock(
  kind: LeaderboardRefreshKind,
  runId: string,
  currentAct: string,
): Promise<LeaderboardRefreshResult | null> {
  const lockKey = lockKeyForKind(kind);
  const { lock, fresh } = await getLeaderboardRefreshLockRaw(lockKey);
  if (lock && fresh && lock.runId !== runId) {
    return null;
  }
  return resumeRunningRefresh(kind, runId, currentAct);
}

async function getRunningRun(kind: LeaderboardRefreshKind) {
  return prisma.leaderboardRefreshRun.findFirst({
    where: {
      kind: prismaKind(kind),
      status: LeaderboardRefreshRunStatus.RUNNING,
    },
    orderBy: { startedAt: "desc" },
  });
}

async function processRunSegment(
  kind: LeaderboardRefreshKind,
  runId: string,
  currentAct: string,
): Promise<LeaderboardRefreshResult> {
  const prefix = logPrefix(kind);
  const lockKey = lockKeyForKind(kind);
  const run = await prisma.leaderboardRefreshRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== LeaderboardRefreshRunStatus.RUNNING) {
    return {
      status: "error",
      reason: "run_not_active",
      totalPlayers: 0,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      pending: 0,
      henrikRequestCount: 0,
      complete: false,
      errorMessage: "Refresh run is not active.",
    };
  }

  const henrikAtStart = getHenrikRequestCount();
  const allIds = await listLinkedValorantPlayerIds();
  const remaining = playersAfterCursor(allIds, run.cursorUserId);
  const deadline = Date.now() + RUN_TIME_BUDGET_MS;

  let successCount = run.successCount;
  let failedCount = run.failedCount;
  let lastCursor = run.cursorUserId;
  let processedThisSegment = 0;

  const context: RankSyncContext = {
    source: syncSourceForKind(kind),
    runId,
    currentActOverride: currentAct,
  };

  for (const userId of remaining) {
    if (Date.now() >= deadline) break;
    if (deadline - Date.now() < PLAYER_PROCESSING_SAFETY_MS) break;

    const result = await syncUserRankWithRetryForHourly(userId, context);
    if (result.ok) {
      successCount += 1;
    } else {
      failedCount += 1;
      console.warn(
        `${prefix} player failed runId=${runId} userId=${userId} error=${result.error}`,
      );
    }

    lastCursor = userId;
    processedThisSegment += 1;
    // Persist progress per player so an invocation timeout cannot strand a stale RUNNING row.
    await prisma.leaderboardRefreshRun.update({
      where: { id: runId },
      data: {
        totalPlayers: Math.max(run.totalPlayers, allIds.length),
        successCount,
        failedCount,
        henrikRequestCount:
          run.henrikRequestCount + (getHenrikRequestCount() - henrikAtStart),
        cursorUserId: lastCursor,
      },
    });
    await heartbeatLeaderboardRefreshLock(runId, lockKey);
  }

  const henrikRequestCount =
    run.henrikRequestCount + (getHenrikRequestCount() - henrikAtStart);
  const totalPlayers = Math.max(run.totalPlayers, allIds.length);
  const processed = successCount + failedCount;
  const pending = Math.max(0, totalPlayers - processed);
  const complete = pending === 0;

  if (complete) {
    await snapshotTownBoardRanks();
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - run.startedAt.getTime();

    await prisma.leaderboardRefreshRun.update({
      where: { id: runId },
      data: {
        status: LeaderboardRefreshRunStatus.COMPLETE,
        finishedAt,
        durationMs,
        totalPlayers,
        successCount,
        failedCount,
        henrikRequestCount,
        cursorUserId: lastCursor,
      },
    });

    await setLeaderboardLastCompletedRefresh(finishedAt);
    await clearLeaderboardRefreshLock(lockKey);

    if (kind === "daily") {
      await markLeaderboardCronComplete({
        runStartedAt: run.startedAt,
        currentAct,
        synced: successCount,
        failed: failedCount,
        skipped: 0,
        totalPlayers,
      }).catch(() => {});
      void notifyLeaderboardSyncComplete({
        runStartedAt: run.startedAt,
        finishedAt,
        synced: successCount,
        failed: failedCount,
        skipped: 0,
        batches: processedThisSegment,
        pending: 0,
        status: "ok",
      }).catch(() => {});
    }

    console.info(`${prefix} complete`, {
      runId,
      totalPlayers,
      successCount,
      failedCount,
      henrikRequestCount,
      durationMs,
    });

    return {
      status: "complete",
      runId,
      totalPlayers,
      processed,
      successCount,
      failedCount,
      pending: 0,
      henrikRequestCount,
      complete: true,
    };
  }

  await prisma.leaderboardRefreshRun.update({
    where: { id: runId },
    data: {
      totalPlayers,
      successCount,
      failedCount,
      henrikRequestCount,
      cursorUserId: lastCursor,
    },
  });

  if (kind === "daily") {
    await markLeaderboardCronProgress({
      runStartedAt: run.startedAt,
      currentAct,
      synced: successCount,
      failed: failedCount,
      skipped: 0,
      pending,
      totalPlayers,
    }).catch(() => {});
  }

  return {
    status: "continued",
    runId,
    totalPlayers,
    processed,
    successCount,
    failedCount,
    pending,
    henrikRequestCount,
    complete: false,
  };
}

export async function runLeaderboardRefresh(
  kind: LeaderboardRefreshKind,
  mode: "start" | "continue",
): Promise<LeaderboardRefreshResult> {
  const prefix = logPrefix(kind);
  const lockKey = lockKeyForKind(kind);
  const currentAct = getEnvValorantActKey();
  if (!currentAct) {
    return {
      status: "error",
      totalPlayers: 0,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      pending: 0,
      henrikRequestCount: 0,
      complete: false,
      errorMessage: "VALORANT_CURRENT_ACT is not configured.",
    };
  }

  resetHenrikRequestCount();

  if (mode === "continue") {
    const running = await getRunningRun(kind);
    if (!running) {
      return {
        status: "skipped",
        reason: "no_active_run",
        totalPlayers: 0,
        processed: 0,
        successCount: 0,
        failedCount: 0,
        pending: 0,
        henrikRequestCount: 0,
        complete: false,
      };
    }

    const lock = await getLeaderboardRefreshLock(lockKey);
    if (!lock || lock.runId !== running.id) {
      const recovered = await tryRecoverStaleRefreshLock(kind, running.id, currentAct);
      if (recovered) return recovered;

      return {
        status: "skipped",
        reason: "lock_missing",
        runId: running.id,
        totalPlayers: running.totalPlayers,
        processed: running.successCount + running.failedCount,
        successCount: running.successCount,
        failedCount: running.failedCount,
        pending: Math.max(
          0,
          running.totalPlayers - running.successCount - running.failedCount,
        ),
        henrikRequestCount: running.henrikRequestCount,
        complete: false,
      };
    }

    return processRunSegment(kind, running.id, currentAct);
  }

  const existingLock = await getLeaderboardRefreshLock(lockKey);
  if (existingLock) {
    const running = await getRunningRun(kind);
    return {
      status: "skipped",
      reason: "already_running",
      runId: existingLock.runId,
      totalPlayers: running?.totalPlayers ?? 0,
      processed: running ? running.successCount + running.failedCount : 0,
      successCount: running?.successCount ?? 0,
      failedCount: running?.failedCount ?? 0,
      pending: running
        ? Math.max(0, running.totalPlayers - running.successCount - running.failedCount)
        : 0,
      henrikRequestCount: running?.henrikRequestCount ?? 0,
      complete: false,
    };
  }

  const staleRun = await getRunningRun(kind);
  if (staleRun) {
    if (kind === "daily") {
      const lock = await getLeaderboardRefreshLock(lockKey);
      if (lock?.runId === staleRun.id) {
        return {
          status: "skipped",
          reason: "already_running",
          runId: staleRun.id,
          totalPlayers: staleRun.totalPlayers,
          processed: staleRun.successCount + staleRun.failedCount,
          successCount: staleRun.successCount,
          failedCount: staleRun.failedCount,
          pending: Math.max(
            0,
            staleRun.totalPlayers - staleRun.successCount - staleRun.failedCount,
          ),
          henrikRequestCount: staleRun.henrikRequestCount,
          complete: false,
        };
      }

      return resumeRunningRefresh(kind, staleRun.id, currentAct);
    }
    await failStaleRun(staleRun.id, kind, `Superseded by new ${kind} refresh.`);
  }

  const allIds = await listLinkedValorantPlayerIds();
  const run = await prisma.leaderboardRefreshRun.create({
    data: {
      kind: prismaKind(kind),
      status: LeaderboardRefreshRunStatus.RUNNING,
      totalPlayers: allIds.length,
      successCount: 0,
      failedCount: 0,
      henrikRequestCount: 0,
    },
  });

  const acquired = await acquireLeaderboardRefreshLock(run.id, lockKey);
  if (!acquired.ok) {
    await prisma.leaderboardRefreshRun.update({
      where: { id: run.id },
      data: {
        status: LeaderboardRefreshRunStatus.SKIPPED,
        finishedAt: new Date(),
        errorMessage: "Another refresh is already running.",
      },
    });
    return {
      status: "skipped",
      reason: "already_running",
      runId: acquired.runId,
      totalPlayers: allIds.length,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      pending: allIds.length,
      henrikRequestCount: 0,
      complete: false,
    };
  }

  if (kind === "daily") {
    void markLeaderboardCronStarted({
      runStartedAt: run.startedAt,
      currentAct,
      totalPlayers: allIds.length,
    }).catch(() => {});
    void notifyLeaderboardSyncStarted({
      runStartedAt: run.startedAt,
      totalPlayers: allIds.length,
      currentAct,
    }).catch(() => {});
  }

  console.info(`${prefix} started`, {
    runId: run.id,
    totalPlayers: allIds.length,
    currentAct,
  });

  const segment = await processRunSegment(kind, run.id, currentAct);
  return { ...segment, status: segment.complete ? "complete" : "started" };
}

export async function runHourlyLeaderboardRefresh(
  mode: "start" | "continue",
): Promise<LeaderboardRefreshResult> {
  return runLeaderboardRefresh("hourly", mode);
}

export async function runDailyLeaderboardRefresh(
  mode: "start" | "continue",
): Promise<LeaderboardRefreshResult> {
  return runLeaderboardRefresh("daily", mode);
}

/**
 * Repairs stale daily runs that are fully processed but left RUNNING due to an invocation timeout
 * between progress/write and completion/finalize steps.
 */
export async function reconcileStaleDailyRefreshRun(): Promise<void> {
  const run = await prisma.leaderboardRefreshRun.findFirst({
    where: {
      kind: LeaderboardRefreshRunKind.DAILY,
      status: LeaderboardRefreshRunStatus.RUNNING,
    },
    orderBy: { startedAt: "desc" },
  });
  if (!run) return;

  const processed = run.successCount + run.failedCount;
  if (processed < run.totalPlayers) return;

  const finishedAt = run.finishedAt ?? run.updatedAt ?? new Date();
  const durationMs = Math.max(0, finishedAt.getTime() - run.startedAt.getTime());

  await prisma.leaderboardRefreshRun.update({
    where: { id: run.id },
    data: {
      status: LeaderboardRefreshRunStatus.COMPLETE,
      finishedAt,
      durationMs,
    },
  });

  await setLeaderboardLastCompletedRefresh(finishedAt);
  await clearLeaderboardRefreshLock(LEADERBOARD_DAILY_REFRESH_LOCK_KEY);

  await markLeaderboardCronComplete({
    runStartedAt: run.startedAt,
    currentAct: getEnvValorantActKey() ?? "unknown",
    synced: run.successCount,
    failed: run.failedCount,
    skipped: 0,
    totalPlayers: run.totalPlayers,
  }).catch(() => {});
}

export async function listLeaderboardRefreshRuns(
  limit = 20,
  kind?: LeaderboardRefreshKind,
) {
  const rows = await prisma.leaderboardRefreshRun.findMany({
    where: kind ? { kind: prismaKind(kind) } : undefined,
    orderBy: { startedAt: "desc" },
    take: Math.min(limit, 100),
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
    durationMs: r.durationMs,
    totalPlayers: r.totalPlayers,
    successCount: r.successCount,
    failedCount: r.failedCount,
    henrikRequestCount: r.henrikRequestCount,
    errorMessage: r.errorMessage,
  }));
}
