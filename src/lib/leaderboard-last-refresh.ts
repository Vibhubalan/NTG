import { prisma } from "@core/database/client";

export const LEADERBOARD_LAST_COMPLETED_REFRESH_KEY =
  "leaderboard_last_completed_refresh_at";

export async function getLeaderboardLastCompletedRefresh(): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: LEADERBOARD_LAST_COMPLETED_REFRESH_KEY },
    select: { value: true },
  });
  if (!row?.value) return null;
  const parsed = Date.parse(row.value);
  return Number.isNaN(parsed) ? null : row.value;
}

export async function setLeaderboardLastCompletedRefresh(
  finishedAt: Date,
): Promise<void> {
  const value = finishedAt.toISOString();
  await prisma.platformSetting.upsert({
    where: { key: LEADERBOARD_LAST_COMPLETED_REFRESH_KEY },
    create: { key: LEADERBOARD_LAST_COMPLETED_REFRESH_KEY, value },
    update: { value },
  });
}
