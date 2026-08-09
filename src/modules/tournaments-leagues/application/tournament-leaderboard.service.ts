import { GameSlug, TournamentGameStatus } from "@prisma/client";
import { cache } from "react";
import type { LeaderboardPreview } from "@core/contracts";
import { prisma } from "@core/database/client";
import {
  aggregatePlayerStats,
  computeStandoutBaseline,
  weightedAcs,
  type StatsGame,
  type TournamentStatsEligibility,
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

function mergeEligibility(
  into: TournamentStatsEligibility,
  from: TournamentStatsEligibility,
): void {
  for (const [userId, memberships] of Object.entries(from.byUserId)) {
    const list = into.byUserId[userId] ?? [];
    into.byUserId[userId] = [...list, ...memberships];
  }
  for (const [riotId, memberships] of Object.entries(from.byRiotId)) {
    const list = into.byRiotId[riotId] ?? [];
    into.byRiotId[riotId] = [...list, ...memberships];
  }
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

/**
 * Cross-cup Valorant tournament leaderboard: same Bayesian Rating as cup Stats,
 * aggregated across every Valorant cup that has published games.
 */
export const getValorantTournamentLeaderboard = cache(
  async (limit = 250): Promise<LeaderboardPreview> => {
    const cups = await prisma.tournament.findMany({
      where: {
        game: GameSlug.VALORANT,
        tournamentGames: { some: { status: TournamentGameStatus.PUBLISHED } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const allGames: StatsGame[] = [];
    const eligibility: TournamentStatsEligibility = { byUserId: {}, byRiotId: {} };
    let latestAt: Date | null = null;

    const cupPayloads = await Promise.all(
      cups.map(async (cup) => {
        const [gamesResult, cupEligibility] = await Promise.all([
          listPublishedTournamentGames(cup.slug),
          listTournamentStatsEligibility(cup.slug),
        ]);
        return { cup, gamesResult, cupEligibility };
      }),
    );

    for (const { cup, gamesResult, cupEligibility } of cupPayloads) {
      allGames.push(...toStatsGames(gamesResult));
      mergeEligibility(eligibility, cupEligibility);
      if (!latestAt || cup.updatedAt > latestAt) latestAt = cup.updatedAt;
    }

    const aggregated = aggregatePlayerStats(allGames, { eligibility });
    const baseline = computeStandoutBaseline(aggregated);

    const ranked = [...aggregated]
      .map((p) => ({
        ...p,
        rating: weightedAcs(p.avgAcs, p.gamesPlayed, baseline),
      }))
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.mvpCount !== a.mvpCount) return b.mvpCount - a.mvpCount;
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        if (b.avgAcs !== a.avgAcs) return b.avgAcs - a.avgAcs;
        return a.riotId.localeCompare(b.riotId);
      })
      .slice(0, limit);

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
  },
);
