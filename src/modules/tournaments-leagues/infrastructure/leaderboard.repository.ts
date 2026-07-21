import { prisma } from "@core/database/client";
import type { LeaderboardPreview } from "@core/contracts";
import { sortValorantBoardEntries } from "@/lib/leaderboard-sort";
import { getLeaderboardLastCompletedRefresh } from "@/lib/leaderboard-last-refresh";
import { serverEnv } from "@core/config/env.server";
import type { GameSlug } from "@prisma/client";

const POINTS_WIN = 3;
const POINTS_LOSS = 0;

export type ListValorantRankingsOptions = {
  limit?: number;
  search?: string;
};

export class LeaderboardRepository {
  async listValorantRankings(
    options: ListValorantRankingsOptions = {},
  ): Promise<LeaderboardPreview> {
    const { limit = 250, search } = options;
    const q = search?.trim().toLowerCase();

    const entries = await prisma.leaderboardEntry.findMany({
      where: {
        game: "VALORANT",
        scope: "TOWN",
        seasonId: null,
        user: {
          signupCompleted: true,
          riotPuuid: { not: null },
          ...(q
            ? {
                OR: [
                  { riotGameName: { contains: q, mode: "insensitive" } },
                  { riotTagLine: { contains: q, mode: "insensitive" } },
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
    });

    const mapped = entries.map((e) => ({
      rank: e.rank ?? 0,
      storedBoardRank: e.rank ?? Number.MAX_SAFE_INTEGER,
      displayName:
        e.user.playerProfile?.displayName ?? e.user.name ?? "Player",
      riotId:
        e.user.riotGameName && e.user.riotTagLine
          ? `${e.user.riotGameName}#${e.user.riotTagLine}`
          : null,
      riotPlayerCard: e.user.riotPlayerCard,
      riotPlayerCardWide: e.user.riotPlayerCardWide,
      mmr: e.mmr,
      rankTier: e.rankTier,
      rankTierId: e.rankTierId,
      currentAct: e.currentAct,
      lastSyncedAt: e.lastSyncedAt?.toISOString() ?? null,
      game: e.game,
    }));

    return {
      game: "VALORANT",
      scope: "TOWN",
      entries: sortValorantBoardEntries(mapped).slice(0, limit),
      lastRefreshedAt: await getLeaderboardLastCompletedRefresh(),
      hourlyRefreshEnabled: serverEnv.leaderboardHourlyRefreshEnabled,
    };
  }

  /** @deprecated Use listValorantRankings for rankings page. */
  async listPreview(game: GameSlug, limit = 10): Promise<LeaderboardPreview> {
    if (game === "VALORANT") {
      return this.listValorantRankings({ limit });
    }
    return { game, scope: "TOWN", entries: [] };
  }

  /** Recompute town leaderboard from completed match results in DB. */
  async recomputeFromCompletedMatches(): Promise<void> {
    const results = await prisma.matchResult.findMany({
      include: {
        match: {
          include: {
            participants: { include: { user: true } },
          },
        },
      },
    });

    const stats = new Map<
      string,
      { userId: string; game: GameSlug; wins: number; losses: number; points: number }
    >();

    for (const r of results) {
      const game = await this.resolveGameForMatch(r.matchId);
      if (!game) continue;

      for (const p of r.match.participants) {
        if (!p.userId) continue;
        const key = `${p.userId}:${game}`;
        const row = stats.get(key) ?? {
          userId: p.userId,
          game,
          wins: 0,
          losses: 0,
          points: 0,
        };
        if (p.slot === r.winnerSlot) {
          row.wins += 1;
          row.points += POINTS_WIN;
        } else {
          row.losses += 1;
          row.points += POINTS_LOSS;
        }
        stats.set(key, row);
      }
    }

    for (const row of stats.values()) {
      const existing = await prisma.leaderboardEntry.findFirst({
        where: {
          game: row.game,
          scope: "TOWN",
          seasonId: null,
          userId: row.userId,
        },
      });

      if (existing) {
        await prisma.leaderboardEntry.update({
          where: { id: existing.id },
          data: {
            wins: row.wins,
            losses: row.losses,
            points: row.points,
          },
        });
      } else {
        await prisma.leaderboardEntry.create({
          data: {
            game: row.game,
            scope: "TOWN",
            userId: row.userId,
            wins: row.wins,
            losses: row.losses,
            points: row.points,
          },
        });
      }
    }
  }

  private async resolveGameForMatch(matchId: string): Promise<GameSlug | null> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { bracket: { include: { tournament: true } } },
    });
    return match?.bracket.tournament.game ?? null;
  }
}
