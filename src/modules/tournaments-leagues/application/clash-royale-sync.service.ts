import { prisma } from "@core/database/client";
import type { ClashRoyaleLeaderboardPreview } from "@core/contracts/clash-royale-leaderboard";

const CLASH_ROYALE_GAME = "CLASH_ROYALE" as const;
const LAST_SYNC_KEY = "CLASH_ROYALE_LAST_SYNC_AT";
const LAST_SYNC_SUMMARY_KEY = "CLASH_ROYALE_LAST_SYNC_SUMMARY";

export type ClashPlayerExport = {
  userId: string;
  tag: string;
};

export type ClashPlayerImportRow = {
  userId: string;
  tag: string;
  name: string;
  trophies: number;
  bestTrophies: number;
  wins?: number;
  losses?: number;
};

export async function listLinkedClashPlayers(): Promise<ClashPlayerExport[]> {
  const users = await prisma.user.findMany({
    where: {
      signupCompleted: true,
      clashRoyaleTag: { not: null },
    },
    select: {
      id: true,
      clashRoyaleTag: true,
    },
    orderBy: { clashRoyaleLinkedAt: "asc" },
  });

  return users
    .filter((u): u is { id: string; clashRoyaleTag: string } => Boolean(u.clashRoyaleTag))
    .map((u) => ({ userId: u.id, tag: u.clashRoyaleTag }));
}

export async function importClashPlayerStats(
  rows: ClashPlayerImportRow[],
): Promise<{ synced: number; failed: number }> {
  const now = new Date();
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { id: true, clashRoyaleTag: true },
      });
      if (!user?.clashRoyaleTag) {
        failed += 1;
        continue;
      }

      await prisma.user.update({
        where: { id: row.userId },
        data: { clashRoyaleName: row.name },
      });

      const where = {
        userId: row.userId,
        game: CLASH_ROYALE_GAME,
        scope: "TOWN",
        seasonId: null,
      } as const;

      const existing = await prisma.leaderboardEntry.findFirst({ where });
      const entryData = {
        mmr: row.trophies,
        peakMmr: row.bestTrophies,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        lastSyncedAt: now,
      };

      if (existing) {
        await prisma.leaderboardEntry.update({
          where: { id: existing.id },
          data: entryData,
        });
      } else {
        await prisma.leaderboardEntry.create({
          data: {
            ...where,
            ...entryData,
          },
        });
      }
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  await prisma.platformSetting.upsert({
    where: { key: LAST_SYNC_KEY },
    create: { key: LAST_SYNC_KEY, value: now.toISOString() },
    update: { value: now.toISOString() },
  });

  await prisma.platformSetting.upsert({
    where: { key: LAST_SYNC_SUMMARY_KEY },
    create: {
      key: LAST_SYNC_SUMMARY_KEY,
      value: JSON.stringify({ synced, failed, at: now.toISOString() }),
    },
    update: {
      value: JSON.stringify({ synced, failed, at: now.toISOString() }),
    },
  });

  return { synced, failed };
}

export async function getClashSyncStatus() {
  const [lastSync, summary] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: LAST_SYNC_KEY } }),
    prisma.platformSetting.findUnique({ where: { key: LAST_SYNC_SUMMARY_KEY } }),
  ]);

  const linkedCount = await prisma.user.count({
    where: { signupCompleted: true, clashRoyaleTag: { not: null } },
  });

  let lastSummary: { synced: number; failed: number; at: string } | null = null;
  if (summary?.value) {
    try {
      lastSummary = JSON.parse(summary.value) as { synced: number; failed: number; at: string };
    } catch {
      lastSummary = null;
    }
  }

  return {
    linkedCount,
    lastSyncedAt: lastSync?.value ?? null,
    lastSummary,
  };
}

export async function getClashRankings(
  mode: "current" | "peak",
  limit = 250,
  search?: string,
): Promise<ClashRoyaleLeaderboardPreview> {
  const q = search?.trim().toLowerCase();
  const sortField = mode === "peak" ? "peakMmr" : "mmr";

  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      game: CLASH_ROYALE_GAME,
      scope: "TOWN",
      seasonId: null,
      user: {
        signupCompleted: true,
        clashRoyaleTag: { not: null },
        ...(q
          ? {
              OR: [
                { clashRoyaleTag: { contains: q, mode: "insensitive" } },
                { clashRoyaleName: { contains: q, mode: "insensitive" } },
                {
                  playerProfile: {
                    displayName: { contains: q, mode: "insensitive" },
                  },
                },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      user: {
        include: { playerProfile: true },
      },
    },
    orderBy: [{ [sortField]: "desc" }, { updatedAt: "asc" }],
    take: limit,
  });

  const mapped = entries.map((e, index) => ({
    rank: index + 1,
    displayName:
      e.user.playerProfile?.displayName ?? e.user.clashRoyaleName ?? e.user.name ?? "Player",
    playerTag: e.user.clashRoyaleTag,
    playerName: e.user.clashRoyaleName,
    trophies: e.mmr,
    bestTrophies: e.peakMmr,
    wins: e.wins,
    losses: e.losses,
    lastSyncedAt: e.lastSyncedAt?.toISOString() ?? null,
    game: CLASH_ROYALE_GAME,
  }));

  const status = await getClashSyncStatus();

  return {
    game: CLASH_ROYALE_GAME,
    scope: "TOWN",
    mode,
    entries: mapped,
    lastRefreshedAt: status.lastSyncedAt,
    refreshIntervalMinutes: 5,
  };
}
