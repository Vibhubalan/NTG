/** Pure helpers for tournament stats aggregation. */

import { getAgentRole, type AgentRole } from "@/lib/valorant-agent";

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
  teamARounds?: number;
  teamBRounds?: number;
  mapName?: string | null;
  startedAt?: string | null;
  publishedAt?: string | null;
  mvpRiotId: string | null;
  players: StatsGamePlayer[];
};

/** Minimum appearances before agent/comp win% is shown. */
export const META_SAMPLE_FLOOR = 2;
/** Include anyone with ≥1 counted game; fairness is in the score, not a hard GP cutoff. */
export const STANDOUT_GP_FLOOR = 1;

/**
 * Fair standout score: quality × confidence from sample size.
 * - 1-game ACS spikes are tempered (log2(2)=1)
 * - More games earn trust, but raw ACS still matters
 * - A strong 3-game stretch can beat a weak 5-game stretch
 */
export function fairStandoutScore(avgAcs: number, gamesPlayed: number): number {
  if (gamesPlayed <= 0) return 0;
  return avgAcs * Math.log2(1 + gamesPlayed);
}

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

// ─── Meta aggregations (teams / maps / agents / comps) ───────────────────────

export type TeamMapCompStat = {
  agents: string[];
  /** Stable key: agents sorted + joined */
  key: string;
  count: number;
  wins: number;
  winRate: number;
};

export type TeamMapStat = {
  mapName: string;
  played: number;
  wins: number;
  winRate: number;
  /** Share of this team's maps played on this map */
  pickRate: number;
  comps: TeamMapCompStat[];
};

export type TeamMapStatsRow = {
  teamId: string;
  teamName: string;
  totalMaps: number;
  maps: TeamMapStat[];
};

export type MapAgentMeta = {
  agent: string;
  appearances: number;
  wins: number;
  winRate: number;
};

export type MapCompMeta = {
  agents: string[];
  key: string;
  appearances: number;
  wins: number;
  winRate: number;
};

export type MapMetaRow = {
  mapName: string;
  games: number;
  /** Tournament-wide pick rate for this map */
  pickRate: number;
  agents: MapAgentMeta[];
  comps: MapCompMeta[];
};

export type StandoutPlayer = {
  riotId: string;
  userName: string | null;
  gamesPlayed: number;
  avgAcs: number;
  kd: number;
  mostPlayedAgent: string | null;
  agentCounts: Record<string, number>;
};

export type RoleStandouts = {
  bestOverall: StandoutPlayer | null;
  byRole: Partial<Record<AgentRole, StandoutPlayer | null>>;
  bestFlex: StandoutPlayer | null;
};

/** Winner team id, or null on tie / missing rounds. */
export function winningTeamId(game: StatsGame): string | null {
  const a = game.teamARounds ?? 0;
  const b = game.teamBRounds ?? 0;
  if (a === b) return null;
  return a > b ? game.teamAId : game.teamBId;
}

/** Normalized 5-stack identity (sorted agent names). */
export function normalizeCompKey(agents: string[]): string {
  return [...agents].map((a) => a.trim()).filter(Boolean).sort((x, y) => x.localeCompare(y)).join("|");
}

export function teamCompAgents(
  game: StatsGame,
  teamId: string,
): string[] {
  const agents = game.players
    .filter((p) => p.teamId === teamId && p.agent)
    .map((p) => p.agent as string);
  // Prefer unique sorted list for identity; keep multiplicity only if <5 unique
  const unique = [...new Set(agents)];
  return unique.sort((a, b) => a.localeCompare(b));
}

function roundRate(wins: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((wins / total) * 1000) / 10;
}

/**
 * Per-team map win %, pick rate, and comps run on each map.
 */
export function aggregateTeamMapStats(games: StatsGame[]): TeamMapStatsRow[] {
  type CompAcc = { agents: string[]; count: number; wins: number };
  type MapAcc = { played: number; wins: number; comps: Map<string, CompAcc> };
  type TeamAcc = { teamName: string; maps: Map<string, MapAcc>; totalMaps: number };

  const teams = new Map<string, TeamAcc>();

  function ensureTeam(id: string, name: string): TeamAcc {
    let t = teams.get(id);
    if (!t) {
      t = { teamName: name, maps: new Map(), totalMaps: 0 };
      teams.set(id, t);
    } else if (name && t.teamName !== name) {
      t.teamName = name;
    }
    return t;
  }

  for (const game of games) {
    const mapName = game.mapName?.trim();
    if (!mapName) continue;

    const winner = winningTeamId(game);
    const sides: { id: string; name: string }[] = [
      { id: game.teamAId, name: game.teamAName },
      { id: game.teamBId, name: game.teamBName },
    ];

    for (const side of sides) {
      const team = ensureTeam(side.id, side.name);
      team.totalMaps += 1;
      let mapAcc = team.maps.get(mapName);
      if (!mapAcc) {
        mapAcc = { played: 0, wins: 0, comps: new Map() };
        team.maps.set(mapName, mapAcc);
      }
      mapAcc.played += 1;
      const won = winner === side.id;
      if (won) mapAcc.wins += 1;

      const agents = teamCompAgents(game, side.id);
      if (agents.length > 0) {
        const key = normalizeCompKey(agents);
        let comp = mapAcc.comps.get(key);
        if (!comp) {
          comp = { agents, count: 0, wins: 0 };
          mapAcc.comps.set(key, comp);
        }
        comp.count += 1;
        if (won) comp.wins += 1;
      }
    }
  }

  const rows: TeamMapStatsRow[] = [];
  for (const [teamId, t] of teams.entries()) {
    const maps: TeamMapStat[] = [];
    for (const [mapName, m] of t.maps.entries()) {
      const comps: TeamMapCompStat[] = [...m.comps.entries()]
        .map(([key, c]) => ({
          agents: c.agents,
          key,
          count: c.count,
          wins: c.wins,
          winRate: roundRate(c.wins, c.count),
        }))
        .sort((a, b) => b.count - a.count || b.winRate - a.winRate);

      maps.push({
        mapName,
        played: m.played,
        wins: m.wins,
        winRate: roundRate(m.wins, m.played),
        pickRate: roundRate(m.played, t.totalMaps),
        comps,
      });
    }
    maps.sort((a, b) => b.played - a.played || b.winRate - a.winRate);
    rows.push({
      teamId,
      teamName: t.teamName,
      totalMaps: t.totalMaps,
      maps,
    });
  }

  rows.sort((a, b) => a.teamName.localeCompare(b.teamName));
  return rows;
}

/**
 * Tournament-wide map pick rates, top agents and comps by win % (sample floor).
 */
export function aggregateMapMeta(
  games: StatsGame[],
  sampleFloor: number = META_SAMPLE_FLOOR,
): MapMetaRow[] {
  type AgentAcc = { appearances: number; wins: number };
  type CompAcc = { agents: string[]; appearances: number; wins: number };
  type MapAcc = {
    games: number;
    agents: Map<string, AgentAcc>;
    comps: Map<string, CompAcc>;
  };

  const maps = new Map<string, MapAcc>();
  let totalMappedGames = 0;

  for (const game of games) {
    const mapName = game.mapName?.trim();
    if (!mapName) continue;
    totalMappedGames += 1;

    let mapAcc = maps.get(mapName);
    if (!mapAcc) {
      mapAcc = { games: 0, agents: new Map(), comps: new Map() };
      maps.set(mapName, mapAcc);
    }
    mapAcc.games += 1;

    const winner = winningTeamId(game);
    const sides = [game.teamAId, game.teamBId];

    for (const teamId of sides) {
      const won = winner === teamId;
      for (const p of game.players) {
        if (p.teamId !== teamId || !p.agent) continue;
        let ag = mapAcc.agents.get(p.agent);
        if (!ag) {
          ag = { appearances: 0, wins: 0 };
          mapAcc.agents.set(p.agent, ag);
        }
        ag.appearances += 1;
        if (won) ag.wins += 1;
      }

      const agents = teamCompAgents(game, teamId);
      if (agents.length >= 3) {
        const key = normalizeCompKey(agents);
        let comp = mapAcc.comps.get(key);
        if (!comp) {
          comp = { agents, appearances: 0, wins: 0 };
          mapAcc.comps.set(key, comp);
        }
        comp.appearances += 1;
        if (won) comp.wins += 1;
      }
    }
  }

  const rows: MapMetaRow[] = [];
  for (const [mapName, m] of maps.entries()) {
    const agents: MapAgentMeta[] = [...m.agents.entries()]
      .filter(([, a]) => a.appearances >= sampleFloor)
      .map(([agent, a]) => ({
        agent,
        appearances: a.appearances,
        wins: a.wins,
        winRate: roundRate(a.wins, a.appearances),
      }))
      .sort((a, b) => b.winRate - a.winRate || b.appearances - a.appearances);

    const comps: MapCompMeta[] = [...m.comps.entries()]
      .filter(([, c]) => c.appearances >= sampleFloor)
      .map(([key, c]) => ({
        agents: c.agents,
        key,
        appearances: c.appearances,
        wins: c.wins,
        winRate: roundRate(c.wins, c.appearances),
      }))
      .sort((a, b) => b.winRate - a.winRate || b.appearances - a.appearances);

    rows.push({
      mapName,
      games: m.games,
      pickRate: roundRate(m.games, totalMappedGames),
      agents,
      comps,
    });
  }

  rows.sort((a, b) => b.games - a.games || a.mapName.localeCompare(b.mapName));
  return rows;
}

function toStandout(p: AggregatedPlayerStats): StandoutPlayer {
  return {
    riotId: p.riotId,
    userName: p.userName,
    gamesPlayed: p.gamesPlayed,
    avgAcs: p.avgAcs,
    kd: p.totalDeaths > 0 ? p.totalKills / p.totalDeaths : p.totalKills,
    mostPlayedAgent: p.mostPlayedAgent,
    agentCounts: p.agentCounts,
  };
}

/**
 * Rank by fairStandoutScore (ACS × log2(1+GP)), then K/D, then games.
 */
function rankStandouts(players: AggregatedPlayerStats[]): AggregatedPlayerStats | null {
  if (players.length === 0) return null;
  const sorted = [...players].sort((a, b) => {
    const scoreA = fairStandoutScore(a.avgAcs, a.gamesPlayed);
    const scoreB = fairStandoutScore(b.avgAcs, b.gamesPlayed);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const kdA = a.totalDeaths > 0 ? a.totalKills / a.totalDeaths : a.totalKills;
    const kdB = b.totalDeaths > 0 ? b.totalKills / b.totalDeaths : b.totalKills;
    if (kdB !== kdA) return kdB - kdA;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return b.avgAcs - a.avgAcs;
  });
  return sorted[0] ?? null;
}

/**
 * Best overall + best per role + best Flex (played ≥1 agent in each role).
 * Uses fairStandoutScore so sample size and performance both matter.
 * Role boards count only appearances on that role's agents.
 */
export function aggregateRoleStandouts(
  games: StatsGame[],
  eligibility?: TournamentStatsEligibility | null,
  gpFloor: number = STANDOUT_GP_FLOOR,
): RoleStandouts {
  const overall = aggregatePlayerStats(games, { eligibility }).filter(
    (p) => p.gamesPlayed >= gpFloor,
  );
  const bestOverallRow = rankStandouts(overall);

  const roles: AgentRole[] = ["Duelist", "Initiator", "Controller", "Sentinel"];
  const byRole: Partial<Record<AgentRole, StandoutPlayer | null>> = {};
  for (const role of roles) {
    const rolePlayers = aggregatePlayerStats(games, {
      eligibility,
      agentRoleFilter: (agent) => getAgentRole(agent) === role,
    }).filter((p) => p.gamesPlayed >= gpFloor);
    const best = rankStandouts(rolePlayers);
    byRole[role] = best ? toStandout(best) : null;
  }

  const flexCandidates = overall.filter((p) => {
    const rolesPlayed = new Set<AgentRole>();
    for (const agent of Object.keys(p.agentCounts)) {
      const role = getAgentRole(agent);
      if (role) rolesPlayed.add(role);
    }
    return rolesPlayed.size >= 4;
  });
  const bestFlexRow = rankStandouts(flexCandidates);

  return {
    bestOverall: bestOverallRow ? toStandout(bestOverallRow) : null,
    byRole,
    bestFlex: bestFlexRow ? toStandout(bestFlexRow) : null,
  };
}

export type AgentStandoutPlayer = {
  riotId: string;
  userName: string | null;
  gamesPlayedOnAgent: number;
  avgAcs: number;
  kd: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
};

export type AgentStandout = {
  agent: string;
  role: AgentRole | null;
  totalPickCount: number;
  bestPlayer: AgentStandoutPlayer | null;
};

/**
 * Aggregates performance stats for every agent played in the tournament,
 * and identifies the #1 player per agent via fairStandoutScore.
 */
export function aggregateAgentStandouts(
  games: StatsGame[],
  eligibility?: TournamentStatsEligibility | null,
  gpFloor: number = STANDOUT_GP_FLOOR,
): AgentStandout[] {
  type AgentPlayerAcc = {
    riotId: string;
    userName: string | null;
    games: number;
    kills: number;
    deaths: number;
    assists: number;
    acsSum: number;
  };

  type AgentAcc = {
    agent: string;
    totalPicks: number;
    playersMap: Map<string, AgentPlayerAcc>;
  };

  const agentsMap = new Map<string, AgentAcc>();

  for (const game of games) {
    for (const p of game.players) {
      if (!p.agent) continue;
      if (!isStatsAppearanceEligible(p, game, eligibility)) continue;

      const agentKey = p.agent.trim();
      let agentEntry = agentsMap.get(agentKey);
      if (!agentEntry) {
        agentEntry = {
          agent: agentKey,
          totalPicks: 0,
          playersMap: new Map(),
        };
        agentsMap.set(agentKey, agentEntry);
      }

      agentEntry.totalPicks += 1;

      const pKey = statsPlayerKey(p.riotId);
      let playerEntry = agentEntry.playersMap.get(pKey);
      if (!playerEntry) {
        playerEntry = {
          riotId: p.riotId,
          userName: p.userName ?? null,
          games: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          acsSum: 0,
        };
        agentEntry.playersMap.set(pKey, playerEntry);
      }

      if (!playerEntry.userName && p.userName) {
        playerEntry.userName = p.userName;
      }

      playerEntry.games += 1;
      playerEntry.kills += p.kills;
      playerEntry.deaths += p.deaths;
      playerEntry.assists += p.assists;
      playerEntry.acsSum += p.acs;
    }
  }

  const result: AgentStandout[] = [];

  for (const [agent, acc] of agentsMap.entries()) {
    const role = getAgentRole(agent);

    const playersList: AgentStandoutPlayer[] = [];
    for (const [, p] of acc.playersMap.entries()) {
      if (p.games < gpFloor) continue;
      const avgAcs = Math.round(p.acsSum / p.games);
      const kd = p.deaths > 0 ? Math.round((p.kills / p.deaths) * 100) / 100 : p.kills;
      playersList.push({
        riotId: p.riotId,
        userName: p.userName,
        gamesPlayedOnAgent: p.games,
        avgAcs,
        kd,
        totalKills: p.kills,
        totalDeaths: p.deaths,
        totalAssists: p.assists,
      });
    }

    playersList.sort((a, b) => {
      const scoreA = fairStandoutScore(a.avgAcs, a.gamesPlayedOnAgent);
      const scoreB = fairStandoutScore(b.avgAcs, b.gamesPlayedOnAgent);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.kd !== a.kd) return b.kd - a.kd;
      if (b.gamesPlayedOnAgent !== a.gamesPlayedOnAgent) {
        return b.gamesPlayedOnAgent - a.gamesPlayedOnAgent;
      }
      return b.avgAcs - a.avgAcs;
    });

    result.push({
      agent,
      role,
      totalPickCount: acc.totalPicks,
      bestPlayer: playersList[0] ?? null,
    });
  }

  result.sort((a, b) => b.totalPickCount - a.totalPickCount || a.agent.localeCompare(b.agent));

  return result;
}

