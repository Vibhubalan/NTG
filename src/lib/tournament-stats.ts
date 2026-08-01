/** Pure helpers for tournament stats aggregation. */

export type StatsGamePlayer = {
  riotId: string;
  userId?: string | null;
  userName?: string | null;
  teamId: string | null;
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPercent: number;
};

export type StatsGame = {
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  startedAt?: string | null;
  publishedAt?: string | null;
  mvpRiotId: string | null;
  players: StatsGamePlayer[];
};

export type StatsTeamMembership = {
  teamId: string;
  kind: "PRIMARY" | "POACH";
  /** ISO timestamp; POACH games only count at/after this time. */
  since: string | null;
};

export type TournamentStatsEligibility = {
  byUserId: Record<string, StatsTeamMembership[]>;
  byRiotId: Record<string, StatsTeamMembership[]>;
};

export type AggregatedPlayerStats = {
  key: string;
  riotId: string;
  userName: string | null;
  gamesPlayed: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  avgAcs: number;
  avgAdr: number;
  avgHsPercent: number;
  mostPlayedAgent: string | null;
  agentCounts: Record<string, number>;
  mvpCount: number;
};

/** @deprecated Use AggregatedPlayerStats */
export type AggregatedTeamPlayerStats = AggregatedPlayerStats;

export function statsPlayerKey(riotId: string): string {
  return riotId.toLowerCase();
}

function membershipsForPlayer(
  player: Pick<StatsGamePlayer, "riotId" | "userId">,
  eligibility?: TournamentStatsEligibility | null,
): StatsTeamMembership[] {
  if (!eligibility) return [];
  const byUser = player.userId ? eligibility.byUserId[player.userId] ?? [] : [];
  const byRiot = eligibility.byRiotId[statsPlayerKey(player.riotId)] ?? [];
  const merged = new Map<string, StatsTeamMembership>();
  for (const m of [...byUser, ...byRiot]) {
    const existing = merged.get(m.teamId);
    if (!existing) {
      merged.set(m.teamId, m);
      continue;
    }
    if (existing.kind === "POACH" && m.kind === "PRIMARY") {
      merged.set(m.teamId, m);
    }
  }
  return [...merged.values()];
}

/**
 * Count a game appearance only if the player was attributed to a team they
 * officially belong to (PRIMARY roster/registration, or admin POACH).
 * Poach-team games only count at/after the poach was created.
 */
export function isStatsAppearanceEligible(
  player: Pick<StatsGamePlayer, "riotId" | "userId" | "teamId">,
  game: Pick<StatsGame, "startedAt" | "publishedAt">,
  eligibility?: TournamentStatsEligibility | null,
): boolean {
  if (!player.teamId) return false;
  const memberships = membershipsForPlayer(player, eligibility);
  if (memberships.length === 0) return false;

  const membership = memberships.find((m) => m.teamId === player.teamId);
  if (!membership) return false;

  if (membership.kind === "PRIMARY" || !membership.since) return true;

  const gameTime = game.startedAt ?? game.publishedAt;
  if (!gameTime) return true;
  return new Date(gameTime).getTime() >= new Date(membership.since).getTime();
}

/**
 * Aggregate published appearances into one row per Riot ID.
 * Only official team games count (primary + post-poach).
 */
export function aggregatePlayerStats(
  games: StatsGame[],
  opts?: {
    agentRoleFilter?: (agent: string) => boolean;
    eligibility?: TournamentStatsEligibility | null;
  },
): AggregatedPlayerStats[] {
  const map = new Map<
    string,
    {
      riotId: string;
      userName: string | null;
      kills: number;
      deaths: number;
      assists: number;
      acsSum: number;
      adrSum: number;
      hsSum: number;
      agentCounts: Record<string, number>;
      games: number;
      mvpCount: number;
    }
  >();

  for (const game of games) {
    let gameMvpKey: string | null = null;
    if (game.mvpRiotId) {
      gameMvpKey = statsPlayerKey(game.mvpRiotId);
    }
    if (!gameMvpKey && game.players.length > 0) {
      let maxAcs = -1;
      for (const p of game.players) {
        if (p.acs > maxAcs && p.riotId && p.agent) {
          maxAcs = p.acs;
          gameMvpKey = statsPlayerKey(p.riotId);
        }
      }
    }

    for (const p of game.players) {
      if (!p.agent) continue;
      if (opts?.agentRoleFilter && !opts.agentRoleFilter(p.agent)) continue;
      if (!isStatsAppearanceEligible(p, game, opts?.eligibility)) continue;

      const key = statsPlayerKey(p.riotId);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          riotId: p.riotId,
          userName: p.userName ?? null,
          kills: 0,
          deaths: 0,
          assists: 0,
          acsSum: 0,
          adrSum: 0,
          hsSum: 0,
          agentCounts: {},
          games: 0,
          mvpCount: 0,
        };
        map.set(key, entry);
      }
      if (!entry.userName && p.userName) entry.userName = p.userName;

      entry.kills += p.kills;
      entry.deaths += p.deaths;
      entry.assists += p.assists;
      entry.acsSum += p.acs;
      entry.adrSum += p.adr;
      entry.hsSum += p.hsPercent;
      entry.games += 1;
      entry.agentCounts[p.agent] = (entry.agentCounts[p.agent] ?? 0) + 1;

      if (gameMvpKey && key === gameMvpKey) {
        entry.mvpCount += 1;
      }
    }
  }

  const result: AggregatedPlayerStats[] = [];
  for (const [key, e] of map.entries()) {
    const g = e.games;
    const mostPlayedAgent =
      Object.entries(e.agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    result.push({
      key,
      riotId: e.riotId,
      userName: e.userName,
      gamesPlayed: g,
      totalKills: e.kills,
      totalDeaths: e.deaths,
      totalAssists: e.assists,
      avgAcs: g > 0 ? Math.round(e.acsSum / g) : 0,
      avgAdr: g > 0 ? Math.round((e.adrSum / g) * 10) / 10 : 0,
      avgHsPercent: g > 0 ? Math.round((e.hsSum / g) * 10) / 10 : 0,
      mostPlayedAgent,
      agentCounts: e.agentCounts,
      mvpCount: e.mvpCount,
    });
  }
  return result;
}

/** @deprecated Use aggregatePlayerStats */
export const aggregateTeamScopedPlayerStats = aggregatePlayerStats;
