import { LeaderboardRefreshRunStatus } from "@prisma/client";

import {
  getHenrikRequestCount,
  resetHenrikRequestCount,
} from "@/lib/henrik-client";
import {
  acquireLeaderboardRefreshLock,
  clearLeaderboardRefreshLock,
  getLeaderboardRefreshLock,
  heartbeatLeaderboardRefreshLock,
  isLockFresh,
  LEADERBOARD_REFRESH_LOCK_KEY,
} from "@/lib/leaderboard-refresh-lock";
import { setLeaderboardLastCompletedRefresh } from "@/lib/leaderboard-last-refresh";
import { getEnvValorantActKey } from "@/lib/valorant-sync-act";
import { prisma } from "@core/database/client";

import {
  listLinkedValorantPlayerIds,
  snapshotTownBoardRanks,
  syncUserRankWithRetryForHourly,
  type RankSyncContext,
} from "./rank-sync.service";

/** Stay under Vercel maxDuration while processing players sequentially. */
const RUN_TIME_BUDGET_MS = 52_000;

export type HourlyRefreshResult = {
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

export function playersAfterCursor(allIds: string[], cursorUserId: string | null): string[] {
  if (!cursorUserId) return allIds;
  const index = allIds.indexOf(cursorUserId);
  if (index === -1) return allIds;
  return allIds.slice(index + 1);
}

async function failStaleRun(runId: string, message: string): Promise<void> {
  await prisma.leaderboardRefreshRun.updateMany({
    where: { id: runId, status: LeaderboardRefreshRunStatus.RUNNING },
    data: {
      status: LeaderboardRefreshRunStatus.ERROR,
      finishedAt: new Date(),
      errorMessage: message,
    },
  });
  const lock = await getLeaderboardRefreshLock();
  if (lock?.runId === runId) {
    await clearLeaderboardRefreshLock();
  }
}

async function getRunningRun(): Promise<{
  id: string;
  cursorUserId: string | null;
  totalPlayers: number;
  successCount: number;
  failedCount: number;
  henrikRequestCount: number;
  startedAt: Date;
} | null> {
  const run = await prisma.leaderboardRefreshRun.findFirst({
    where: { status: LeaderboardRefreshRunStatus.RUNNING },
    orderBy: { startedAt: "desc" },
  });
  if (!run) return null;
  return run;
}

async function processRunSegment(
  runId: string,
  currentAct: string,
): Promise<HourlyRefreshResult> {
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
    source: "hourly_cron",
    runId,
    currentActOverride: currentAct,
  };

  for (const userId of remaining) {
    if (Date.now() >= deadline) break;

    const result = await syncUserRankWithRetryForHourly(userId, context);
    if (result.ok) {
      successCount += 1;
    } else {
      failedCount += 1;
      console.warn(
        `[hourly-refresh] player failed runId=${runId} userId=${userId} error=${result.error}`,
      );
    }

    lastCursor = userId;
    processedThisSegment += 1;
    await heartbeatLeaderboardRefreshLock(runId);
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
    await clearLeaderboardRefreshLock();

    console.info("[hourly-refresh] complete", {
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

export async function runHourlyLeaderboardRefresh(
  mode: "start" | "continue",
): Promise<HourlyRefreshResult> {
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
    const running = await getRunningRun();
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

    const lock = await getLeaderboardRefreshLock();
    if (!lock || lock.runId !== running.id) {
      const rawLock = await prisma.platformSetting.findUnique({
        where: { key: LEADERBOARD_REFRESH_LOCK_KEY },
        select: { value: true },
      });
      const parsed = rawLock?.value ? (JSON.parse(rawLock.value) as { runId: string; heartbeatAt: string }) : null;
      if (parsed && !isLockFresh(parsed)) {
        await failStaleRun(running.id, "Refresh lock expired.");
      }
      return {
        status: "skipped",
        reason: "lock_missing",
        runId: running.id,
        totalPlayers: running.totalPlayers,
        processed: running.successCount + running.failedCount,
        successCount: running.successCount,
        failedCount: running.failedCount,
        pending: Math.max(0, running.totalPlayers - running.successCount - running.failedCount),
        henrikRequestCount: running.henrikRequestCount,
        complete: false,
      };
    }

    return processRunSegment(running.id, currentAct);
  }

  const existingLock = await getLeaderboardRefreshLock();
  if (existingLock) {
    const running = await getRunningRun();
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

  const staleRun = await getRunningRun();
  if (staleRun) {
    await failStaleRun(staleRun.id, "Superseded by new hourly refresh.");
  }

  const allIds = await listLinkedValorantPlayerIds();
  const run = await prisma.leaderboardRefreshRun.create({
    data: {
      status: LeaderboardRefreshRunStatus.RUNNING,
      totalPlayers: allIds.length,
      successCount: 0,
      failedCount: 0,
      henrikRequestCount: 0,
    },
  });

  const acquired = await acquireLeaderboardRefreshLock(run.id);
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

  await snapshotTownBoardRanks();

  console.info("[hourly-refresh] started", {
    runId: run.id,
    totalPlayers: allIds.length,
    currentAct,
  });

  const segment = await processRunSegment(run.id, currentAct);
  return { ...segment, status: segment.complete ? "complete" : "started" };
}

export async function listLeaderboardRefreshRuns(limit = 20) {
  const rows = await prisma.leaderboardRefreshRun.findMany({
    orderBy: { startedAt: "desc" },
    take: Math.min(limit, 100),
  });
  return rows.map((r) => ({
    id: r.id,
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
