import { prisma } from "@core/database/client";

export const LEADERBOARD_REFRESH_LOCK_KEY = "leaderboard_refresh_lock";

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

async function readLock(): Promise<LockPayload | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: LEADERBOARD_REFRESH_LOCK_KEY },
    select: { value: true },
  });
  return parseLock(row?.value);
}

async function writeLock(payload: LockPayload): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: LEADERBOARD_REFRESH_LOCK_KEY },
    create: { key: LEADERBOARD_REFRESH_LOCK_KEY, value: JSON.stringify(payload) },
    update: { value: JSON.stringify(payload) },
  });
}

export async function clearLeaderboardRefreshLock(): Promise<void> {
  await prisma.platformSetting.deleteMany({
    where: { key: LEADERBOARD_REFRESH_LOCK_KEY },
  });
}

export function isLockFresh(lock: LockPayload): boolean {
  const heartbeat = Date.parse(lock.heartbeatAt);
  if (Number.isNaN(heartbeat)) return false;
  return Date.now() - heartbeat < STALE_LOCK_MS;
}

export async function getLeaderboardRefreshLock(): Promise<LockPayload | null> {
  const lock = await readLock();
  if (!lock) return null;
  if (!isLockFresh(lock)) return null;
  return lock;
}

export async function acquireLeaderboardRefreshLock(
  runId: string,
): Promise<{ ok: true } | { ok: false; reason: "already_running"; runId: string }> {
  const existing = await readLock();
  if (existing && isLockFresh(existing) && existing.runId !== runId) {
    return { ok: false, reason: "already_running", runId: existing.runId };
  }

  await writeLock({ runId, heartbeatAt: new Date().toISOString() });
  return { ok: true };
}

export async function heartbeatLeaderboardRefreshLock(runId: string): Promise<boolean> {
  const existing = await readLock();
  if (!existing || existing.runId !== runId) return false;
  await writeLock({ runId, heartbeatAt: new Date().toISOString() });
  return true;
}
