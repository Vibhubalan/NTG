/** Pure helpers for team-scoped tournament stats aggregation. */

export type StatsGamePlayer = {
  riotId: string;
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
  mvpRiotId: string | null;
  players: StatsGamePlayer[];
};

export type AggregatedTeamPlayerStats = {
  key: string;
  riotId: string;
  userName: string | null;
  teamId: string | null;
  teamName: string | null;
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

export function statsPlayerKey(riotId: string, teamId: string | null): string {
  return `${riotId.toLowerCase()}::${teamId ?? "unknown"}`;
}

export function teamNameForId(
  game: Pick<StatsGame, "teamAId" | "teamBId" | "teamAName" | "teamBName">,
  teamId: string | null,
): string | null {
  if (!teamId) return null;
  if (teamId === game.teamAId) return game.teamAName;
  if (teamId === game.teamBId) return game.teamBName;
  return null;
}

/**
 * Aggregate published game appearances by riotId + teamId so poached players
 * keep separate rows per team instead of merging all games.
 */
export function aggregateTeamScopedPlayerStats(
  games: StatsGame[],
  opts?: { agentRoleFilter?: (agent: string) => boolean },
): AggregatedTeamPlayerStats[] {
  const map = new Map<
    string,
    {
      riotId: string;
      userName: string | null;
      teamId: string | null;
      teamName: string | null;
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
      const mvpPlayer = game.players.find(
        (p) => p.riotId.toLowerCase() === game.mvpRiotId!.toLowerCase() && p.agent,
      );
      if (mvpPlayer) {
        gameMvpKey = statsPlayerKey(mvpPlayer.riotId, mvpPlayer.teamId);
      }
    }
    if (!gameMvpKey && game.players.length > 0) {
      let maxAcs = -1;
      for (const p of game.players) {
        if (p.acs > maxAcs && p.riotId && p.agent) {
          maxAcs = p.acs;
          gameMvpKey = statsPlayerKey(p.riotId, p.teamId);
        }
      }
    }

    for (const p of game.players) {
      if (!p.agent) continue;
      if (opts?.agentRoleFilter && !opts.agentRoleFilter(p.agent)) continue;

      const key = statsPlayerKey(p.riotId, p.teamId);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          riotId: p.riotId,
          userName: p.userName ?? null,
          teamId: p.teamId,
          teamName: teamNameForId(game, p.teamId),
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
      } else if (!entry.teamName) {
        entry.teamName = teamNameForId(game, p.teamId);
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

  const result: AggregatedTeamPlayerStats[] = [];
  for (const [key, e] of map.entries()) {
    const g = e.games;
    const mostPlayedAgent =
      Object.entries(e.agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    result.push({
      key,
      riotId: e.riotId,
      userName: e.userName,
      teamId: e.teamId,
      teamName: e.teamName,
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
