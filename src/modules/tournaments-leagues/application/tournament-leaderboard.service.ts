import { GameSlug, TournamentGameStatus } from "@prisma/client";
import { cache } from "react";
import type { LeaderboardPreview } from "@core/contracts";
import { prisma } from "@core/database/client";
import { withDbFallback } from "@core/database/transient-error";
import {
  aggregatePlayerStats,
  rankCrossCupPlayers,
  type StatsGame,
} from "@/lib/tournament-stats";
import {
  listPublishedTournamentGames,
  listTournamentStatsEligibility,
} from "./tournament-games.service";
import { BEST_ROLE_BADGE_KEYS } from "@/lib/player-badge-presets";

function parseRiotId(riotId: string): { gameName: string; tagLine: string } | null {
  const hash = riotId.lastIndexOf("#");
  if (hash <= 0 || hash >= riotId.length - 1) return null;
  return {
    gameName: riotId.slice(0, hash),
    tagLine: riotId.slice(hash + 1),
  };
}

function toStatsGames(
  games: Awaited<ReturnType<typeof listPublishedTournamentGames>>,
): StatsGame[] {
  if (!games.ok) return [];
  return games.games.map((g) => ({
    teamAId: g.teamAId,
    teamBId: g.teamBId,
    teamAName: g.teamAName,
    teamBName: g.teamBName,
    teamARounds: g.teamARounds,
    teamBRounds: g.teamBRounds,
    mapName: g.mapName,
    startedAt: g.startedAt,
    publishedAt: g.publishedAt ?? null,
    mvpRiotId: g.mvpRiotId,
    players: g.players.map((p) => ({
      riotId: p.riotId,
      userId: p.userId,
      userName: p.userName,
      teamId: p.teamId,
      agent: p.agent,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      acs: p.acs,
      adr: p.adr,
      hsPercent: p.hsPercent,
      firstKills: p.firstKills,
      firstDeaths: p.firstDeaths,
    })),
  }));
}

function emptyTournamentBoard(): LeaderboardPreview {
  return {
    game: GameSlug.VALORANT,
    scope: "TOURNAMENTS",
    entries: [],
    lastRefreshedAt: null,
    hourlyRefreshEnabled: false,
  };
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/**
 * Cross-cup Valorant tournament leaderboard: each cup is scored on its own,
 * then combined so consistent multi-cup ACS outranks a one-tournament spike.
 */
export const getValorantTournamentLeaderboard = cache(
  async (limit = 250): Promise<LeaderboardPreview> => {
    return withDbFallback("tournament-leaderboard", emptyTournamentBoard(), async () => {
    const cups = await prisma.tournament.findMany({
      where: {
        game: GameSlug.VALORANT,
        tournamentGames: { some: { status: TournamentGameStatus.PUBLISHED } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const latestAt = cups[0]?.updatedAt ?? null;

    const cupPayloads = await mapInBatches(cups, 2, async (cup) => {
      const [gamesResult, cupEligibility] = await Promise.all([
        listPublishedTournamentGames(cup.slug),
        listTournamentStatsEligibility(cup.slug),
      ]);
      return { cup, gamesResult, cupEligibility };
    });

    const cupPools = cupPayloads.map(({ gamesResult, cupEligibility }) =>
      aggregatePlayerStats(toStatsGames(gamesResult), {
        eligibility: cupEligibility,
      }),
    );

    const ranked = rankCrossCupPlayers(cupPools).slice(0, limit);

    const linkedUserIds = ranked
      .map((p) => (p.key.startsWith("user:") ? p.key.slice(5) : null))
      .filter((id): id is string => Boolean(id));

    const riotParts = ranked
      .filter((p) => !p.key.startsWith("user:"))
      .map((p) => parseRiotId(p.riotId))
      .filter((p): p is { gameName: string; tagLine: string } => Boolean(p));

    const [linkedUsers, riotMatchedUsers, roleBadgeHolders] = await Promise.all([
      linkedUserIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: linkedUserIds } },
            select: {
              id: true,
              name: true,
              riotGameName: true,
              riotTagLine: true,
              riotPlayerCard: true,
              riotPlayerCardWide: true,
            },
          })
        : Promise.resolve([]),
      riotParts.length > 0
        ? prisma.user.findMany({
            where: {
              OR: riotParts.map((r) => ({
                riotGameName: { equals: r.gameName, mode: "insensitive" as const },
                riotTagLine: { equals: r.tagLine, mode: "insensitive" as const },
              })),
            },
            select: {
              id: true,
              name: true,
              riotGameName: true,
              riotTagLine: true,
              riotPlayerCard: true,
              riotPlayerCardWide: true,
            },
          })
        : Promise.resolve([]),
      // Always pull global Best-* role awards so podium can show them when held.
      prisma.playerBadge.findMany({
        where: {
          kind: "CUSTOM",
          iconKey: { in: [...BEST_ROLE_BADGE_KEYS] },
        },
        select: { id: true, userId: true, label: true, kind: true, iconKey: true },
      }),
    ]);

    const userById = new Map(linkedUsers.map((u) => [u.id, u]));
    const userByRiot = new Map<string, (typeof linkedUsers)[number]>();
    for (const u of [...linkedUsers, ...riotMatchedUsers]) {
      userById.set(u.id, u);
      if (u.riotGameName && u.riotTagLine) {
        userByRiot.set(
          `${u.riotGameName}#${u.riotTagLine}`.toLowerCase(),
          u,
        );
      }
    }

    const allUserIds = [
      ...new Set([
        ...linkedUserIds,
        ...riotMatchedUsers.map((u) => u.id),
        ...roleBadgeHolders.map((b) => b.userId),
      ]),
    ];

    const badgeRows =
      allUserIds.length > 0
        ? await prisma.playerBadge.findMany({
            where: { userId: { in: allUserIds } },
            select: {
              id: true,
              userId: true,
              label: true,
              kind: true,
              iconKey: true,
            },
            orderBy: { awardedAt: "desc" },
          })
        : [];

    const badgesByUserId = new Map<
      string,
      { id: string; label: string; kind?: string; iconKey?: string | null }[]
    >();
    for (const badge of badgeRows) {
      const list = badgesByUserId.get(badge.userId) ?? [];
      list.push({
        id: badge.id,
        label: badge.label,
        kind: badge.kind,
        iconKey: badge.iconKey,
      });
      badgesByUserId.set(badge.userId, list);
    }

    const entries = ranked.map((p, index) => {
      const linkedId = p.key.startsWith("user:") ? p.key.slice(5) : null;
      const riotUser = userByRiot.get(p.riotId.toLowerCase()) ?? null;
      const userId = linkedId ?? riotUser?.id ?? null;
      const user = userId ? userById.get(userId) ?? riotUser : null;
      const riotId =
        user?.riotGameName && user.riotTagLine
          ? `${user.riotGameName}#${user.riotTagLine}`
          : p.riotId;
      const displayName =
        user?.name?.trim() ||
        p.userName?.trim() ||
        riotId.split("#")[0] ||
        riotId;

      return {
        rank: index + 1,
        storedBoardRank: index + 1,
        displayName,
        riotId,
        riotPlayerCard: user?.riotPlayerCard ?? null,
        riotPlayerCardWide: user?.riotPlayerCardWide ?? null,
        // Store Rating in mmr so the shared board sort/view path works.
        mmr: Math.round(p.rating * 10) / 10,
        tournamentsPlayed: p.tournamentsPlayed,
        rankTier: p.mostPlayedAgent,
        rankTierId: null,
        currentAct: null,
        lastSyncedAt: latestAt?.toISOString() ?? null,
        game: GameSlug.VALORANT,
        badges: userId ? badgesByUserId.get(userId) ?? [] : [],
      };
    });

    return {
      game: GameSlug.VALORANT,
      scope: "TOURNAMENTS",
      entries,
      lastRefreshedAt: latestAt?.toISOString() ?? null,
      hourlyRefreshEnabled: false,
    };
    });
  },
);
