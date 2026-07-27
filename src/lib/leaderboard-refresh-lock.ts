import { prisma } from "@core/database/client";

/** Hourly staging refresh (cron-job.org). */
export const LEADERBOARD_HOURLY_REFRESH_LOCK_KEY = "leaderboard_refresh_lock";
/** Daily production refresh (GitHub Actions driver). */
export const LEADERBOARD_DAILY_REFRESH_LOCK_KEY = "leaderboard_daily_refresh_lock";
/** @deprecated use LEADERBOARD_HOURLY_REFRESH_LOCK_KEY */
export const LEADERBOARD_REFRESH_LOCK_KEY = LEADERBOARD_HOURLY_REFRESH_LOCK_KEY;

export type LeaderboardRefreshLockKey =
  | typeof LEADERBOARD_HOURLY_REFRESH_LOCK_KEY
  | typeof LEADERBOARD_DAILY_REFRESH_LOCK_KEY;

const STALE_LOCK_MS = 10 * 60 * 1000;

type LockPayload = {
  runId: string;
  heartbeatAt: string;
};

function parseLock(raw: string | null | undefined): LockPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as LockPayload;
    if (!data.runId || !data.heartbeatAt) return null;
    return data;
  } catch {
    return null;
  }
}

async function readLock(lockKey: LeaderboardRefreshLockKey): Promise<LockPayload | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: lockKey },
    select: { value: true },
  });
  return parseLock(row?.value);
}

async function writeLock(lockKey: LeaderboardRefreshLockKey, payload: LockPayload): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: lockKey },
    create: { key: lockKey, value: JSON.stringify(payload) },
    update: { value: JSON.stringify(payload) },
  });
}

export async function clearLeaderboardRefreshLock(
  lockKey: LeaderboardRefreshLockKey = LEADERBOARD_HOURLY_REFRESH_LOCK_KEY,
): Promise<void> {
  await prisma.platformSetting.deleteMany({
    where: { key: lockKey },
  });
}

export function isLockFresh(lock: LockPayload): boolean {
  const heartbeat = Date.parse(lock.heartbeatAt);
  if (Number.isNaN(heartbeat)) return false;
  return Date.now() - heartbeat < STALE_LOCK_MS;
}

export async function getLeaderboardRefreshLock(
  lockKey: LeaderboardRefreshLockKey = LEADERBOARD_HOURLY_REFRESH_LOCK_KEY,
): Promise<LockPayload | null> {
  const lock = await readLock(lockKey);
  if (!lock) return null;
  if (!isLockFresh(lock)) return null;
  return lock;
}

/** Raw lock row including stale entries (for recovery when a segment ended without clearing). */
export async function getLeaderboardRefreshLockRaw(
  lockKey: LeaderboardRefreshLockKey = LEADERBOARD_HOURLY_REFRESH_LOCK_KEY,
): Promise<{ lock: LockPayload | null; fresh: boolean }> {
  const lock = await readLock(lockKey);
  if (!lock) return { lock: null, fresh: false };
  return { lock, fresh: isLockFresh(lock) };
}

export async function acquireLeaderboardRefreshLock(
  runId: string,
  lockKey: LeaderboardRefreshLockKey = LEADERBOARD_HOURLY_REFRESH_LOCK_KEY,
): Promise<{ ok: true } | { ok: false; reason: "already_running"; runId: string }> {
  const existing = await readLock(lockKey);
  if (existing && isLockFresh(existing) && existing.runId !== runId) {
    return { ok: false, reason: "already_running", runId: existing.runId };
  }

  await writeLock(lockKey, { runId, heartbeatAt: new Date().toISOString() });
  return { ok: true };
}

export async function heartbeatLeaderboardRefreshLock(
  runId: string,
  lockKey: LeaderboardRefreshLockKey = LEADERBOARD_HOURLY_REFRESH_LOCK_KEY,
): Promise<boolean> {
  const existing = await readLock(lockKey);
  if (!existing || existing.runId !== runId) return false;
  await writeLock(lockKey, { runId, heartbeatAt: new Date().toISOString() });
  return true;
}
