/** Pure helpers for tournament stats aggregation. */

import { getAgentRole, type AgentRole } from "@/lib/valorant-agent";
import {
  AWARD_CONFIG,
  agentAwardMinGames,
  pickAwardWinner,
  weightsForRole,
} from "@/lib/tournament-awards";

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
  firstKills?: number;
  firstDeaths?: number;
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
 * Award eligibility scales with the tournament instead of being hardcoded, so
 * the same rules work for a 7-game cup and a 19-game one.
 */
export const AWARD_GP_SHARE = 0.25;
/** Never demand fewer than this many games for an award. */
export const AWARD_GP_ABSOLUTE_FLOOR = 2;
/**
 * Cap on the Bayesian prior (C). Without this, a high mean-GP pool keeps
 * pulling solid 4–6 game samples toward the mean so a longer mediocre run
 * can outrank a clearly better shorter one.
 */
export const AWARD_PRIOR_CAP = 3;

/**
 * Agent awards: below this many tournament picks the agent is treated as rare,
 * so 1–2 games on that agent can still win.
 */
export const AGENT_RARE_PICK_CEILING = 8;
/**
 * Popular agents bump the games floor a little with pick volume, but never
 * above this — a hard high floor was DQ'ing strong 5-game runs in favor of
 * weaker 6-game ones.
 */
export const AGENT_AWARD_PICK_SHARE = 0.1;
export const AGENT_AWARD_GP_CAP = 3;

/**
 * Best Flex: the player must have played every role — at least one agent in
 * each of Duelist, Initiator, Controller and Sentinel.
 */
export const FLEX_MIN_ROLES = 4;
/**
 * Extra Rating points per assist/game when ranking Initiator role and
 * Initiator agents — setup work should beat raw fragging in close races.
 */
export const INITIATOR_ASSIST_WEIGHT = 6;
/** When ranking Flex candidates, prefer coverage in this order. */
export const FLEX_ROLE_PRIORITY: AgentRole[] = [
  "Initiator",
  "Controller",
  "Sentinel",
  "Duelist",
];

export type StandoutBaseline = {
  /** Mean games played in the pool; doubles as the shrinkage weight. */
  meanGamesPlayed: number;
  /** Appearance-weighted mean ACS for the pool. */
  meanAcs: number;
};

/**
 * Population baseline for one pool of players — everyone, a single role, or a
 * single agent.
 *
 * Deliberately computed per pool: Controllers post structurally lower ACS than
 * Duelists, so measuring each player against their own pool is what makes the
 * role boards comparable without inventing per-role weightings.
 */
export function computeStandoutBaseline(
  pool: { avgAcs: number; gamesPlayed: number }[],
): StandoutBaseline {
  let appearances = 0;
  let acsWeighted = 0;
  for (const p of pool) {
    appearances += p.gamesPlayed;
    acsWeighted += p.avgAcs * p.gamesPlayed;
  }
  if (pool.length === 0 || appearances <= 0) {
    return { meanGamesPlayed: 0, meanAcs: 0 };
  }
  return {
    meanGamesPlayed: appearances / pool.length,
    meanAcs: acsWeighted / appearances,
  };
}

/**
 * Bayesian-shrunk ACS: the player's average pulled toward the pool mean in
 * proportion to how little they played, converging on their true average as
 * games accumulate.
 *
 * A raw average lets two hot games beat a whole tournament. The previous
 * ACS × log2(1+GP) product had the opposite failure — being unbounded in games
 * played, 200 ACS over 15 games outscored 300 ACS over 3. This keeps the result
 * in ACS units, so it is both comparable and displayable.
 */
export function weightedAcs(
  avgAcs: number,
  gamesPlayed: number,
  baseline: StandoutBaseline,
): number {
  if (gamesPlayed <= 0) return 0;
  const prior = Math.min(baseline.meanGamesPlayed, AWARD_PRIOR_CAP);
  if (prior <= 0) return avgAcs;
  return (gamesPlayed * avgAcs + prior * baseline.meanAcs) / (gamesPlayed + prior);
}

/**
 * Cross-cup board: treat each tournament as one observation, then add a
 * capped consistency bonus so a one-cup spike cannot outrank a steady run.
 *
 * Pure Bayesian shrinkage toward the mean is not enough on its own. If the
 * field mean is ~230, four cups at 250 never overtake one cup at 300, because
 * 300 is further above the mean than 250 is. The bonus is what makes showing
 * up across cups count, without bringing back unbounded ACS × log(games)
 * (a long 200 ACS grind still loses to a real 300 cup).
 */
export const CROSS_CUP_PRIOR = 2;
/** Rating points added per log2(cups), capped so a long average grind cannot snowball. */
export const CUP_CONSISTENCY_BONUS = 18;
export const CONSISTENCY_CUP_CAP = 6;

export function crossCupRating(
  cupRatings: number[],
  leagueMeanCupRating: number,
): number {
  const n = cupRatings.length;
  if (n <= 0) return 0;
  const avg = cupRatings.reduce((sum, rating) => sum + rating, 0) / n;
  const shrunk =
    CROSS_CUP_PRIOR > 0
      ? (n * avg + CROSS_CUP_PRIOR * leagueMeanCupRating) /
        (n + CROSS_CUP_PRIOR)
      : avg;
  const cappedN = Math.min(n, CONSISTENCY_CUP_CAP);
  return shrunk + CUP_CONSISTENCY_BONUS * Math.log2(cappedN);
}

/**
 * Games required to qualify for an award, derived from the pool's own busiest
 * player rather than a fixed number.
 *
 * Clamped to the pool maximum so a card never blanks out purely because
 * everyone in that pool played very few games.
 */
export function dynamicGamesThreshold(pool: { gamesPlayed: number }[]): number {
  let maxGp = 0;
  for (const p of pool) {
    if (p.gamesPlayed > maxGp) maxGp = p.gamesPlayed;
  }
  if (maxGp <= 0) return 0;
  const scaled = Math.max(
    AWARD_GP_ABSOLUTE_FLOOR,
    Math.floor(maxGp * AWARD_GP_SHARE),
  );
  return Math.min(maxGp, scaled);
}

/**
 * Games required to win "best on this agent". Rare agents stay soft; popular
 * agents ask for a modest sample (capped) so 2-map spikes lose, but a strong
 * 5-game run is never DQ'd in favor of a weaker 6-game one.
 */
export function agentAwardGamesThreshold(
  totalPicks: number,
  pool: { gamesPlayed: number }[],
): number {
  let maxGp = 0;
  for (const p of pool) {
    if (p.gamesPlayed > maxGp) maxGp = p.gamesPlayed;
  }
  if (maxGp <= 0) return 0;

  const poolFloor = dynamicGamesThreshold(pool);

  if (totalPicks <= AGENT_RARE_PICK_CEILING) {
    // Niche picks: allow a 1-game award when that is all anyone logged.
    return Math.min(maxGp, Math.max(1, Math.min(poolFloor, 2)));
  }

  const popularityFloor = Math.min(
    AGENT_AWARD_GP_CAP,
    Math.max(
      AWARD_GP_ABSOLUTE_FLOOR,
      Math.floor(totalPicks * AGENT_AWARD_PICK_SHARE),
    ),
  );
  return Math.min(maxGp, Math.max(poolFloor, popularityFloor));
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
  /** Sum of map rounds across counted appearances (for KAST proxy / rates). */
  totalRounds: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalFirstKills: number;
  totalFirstDeaths: number;
  avgAcs: number;
  avgAdr: number;
  avgHsPercent: number;
  mostPlayedAgent: string | null;
  agentCounts: Record<string, number>;
  /** Cup team names this player appeared for (for search). */
  teamNames: string[];
  mvpCount: number;
};

/** @deprecated Use AggregatedPlayerStats */
export type AggregatedTeamPlayerStats = AggregatedPlayerStats;

export function statsPlayerKey(riotId: string): string {
  return riotId.toLowerCase();
}

/** Prefer linked account so Riot renames don't split one player into two rows. */
export function aggregateStatsPlayerKey(
  player: Pick<StatsGamePlayer, "riotId" | "userId">,
): string {
  if (player.userId) return `user:${player.userId}`;
  return statsPlayerKey(player.riotId);
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
 * Aggregate published appearances into one row per linked user (else Riot ID).
 * Only official team games count (primary + post-poach).
 * When games are newest-first, the first seen riotId is kept as the display name.
 */
export function aggregatePlayerStats(
  games: StatsGame[],
  opts?: {
    agentRoleFilter?: (agent: string) => boolean;
    /** Only count appearances on this agent (case-insensitive). */
    agentNameFilter?: string;
    eligibility?: TournamentStatsEligibility | null;
  },
): AggregatedPlayerStats[] {
  const agentNameKey = opts?.agentNameFilter
    ? opts.agentNameFilter.trim().toLowerCase()
    : null;
  const map = new Map<
    string,
    {
      riotId: string;
      userName: string | null;
      kills: number;
      deaths: number;
      assists: number;
      firstKills: number;
      firstDeaths: number;
      acsSum: number;
      adrSum: number;
      hsSum: number;
      rounds: number;
      agentCounts: Record<string, number>;
      teamNames: Set<string>;
      games: number;
      mvpCount: number;
    }
  >();

  for (const game of games) {
    let gameMvpKey: string | null = null;
    if (game.mvpRiotId) {
      const mvpRiotKey = statsPlayerKey(game.mvpRiotId);
      const mvpPlayer = game.players.find(
        (p) => statsPlayerKey(p.riotId) === mvpRiotKey,
      );
      gameMvpKey = mvpPlayer
        ? aggregateStatsPlayerKey(mvpPlayer)
        : mvpRiotKey;
    }
    if (!gameMvpKey && game.players.length > 0) {
      let maxAcs = -1;
      let mvpPlayer: StatsGamePlayer | null = null;
      for (const p of game.players) {
        if (p.acs > maxAcs && p.riotId && p.agent) {
          maxAcs = p.acs;
          mvpPlayer = p;
        }
      }
      if (mvpPlayer) gameMvpKey = aggregateStatsPlayerKey(mvpPlayer);
    }

    const teamNameById = new Map<string, string>([
      [game.teamAId, game.teamAName],
      [game.teamBId, game.teamBName],
    ]);
    const mapRounds = Math.max(0, (game.teamARounds ?? 0) + (game.teamBRounds ?? 0));

    for (const p of game.players) {
      if (!p.agent) continue;
      if (opts?.agentRoleFilter && !opts.agentRoleFilter(p.agent)) continue;
      if (agentNameKey && p.agent.trim().toLowerCase() !== agentNameKey) continue;
      if (!isStatsAppearanceEligible(p, game, opts?.eligibility)) continue;

      const key = aggregateStatsPlayerKey(p);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          riotId: p.riotId,
          userName: p.userName ?? null,
          kills: 0,
          deaths: 0,
          assists: 0,
          firstKills: 0,
          firstDeaths: 0,
          acsSum: 0,
          adrSum: 0,
          hsSum: 0,
          rounds: 0,
          agentCounts: {},
          teamNames: new Set(),
          games: 0,
          mvpCount: 0,
        };
        map.set(key, entry);
      }
      if (!entry.userName && p.userName) entry.userName = p.userName;

      entry.kills += p.kills;
      entry.deaths += p.deaths;
      entry.assists += p.assists;
      entry.firstKills += p.firstKills ?? 0;
      entry.firstDeaths += p.firstDeaths ?? 0;
      entry.acsSum += p.acs;
      entry.adrSum += p.adr;
      entry.hsSum += p.hsPercent;
      entry.rounds += mapRounds;
      entry.games += 1;
      entry.agentCounts[p.agent] = (entry.agentCounts[p.agent] ?? 0) + 1;
      if (p.teamId) {
        const teamName = teamNameById.get(p.teamId);
        if (teamName) entry.teamNames.add(teamName);
      }

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
      totalRounds: e.rounds,
      totalKills: e.kills,
      totalDeaths: e.deaths,
      totalAssists: e.assists,
      totalFirstKills: e.firstKills,
      totalFirstDeaths: e.firstDeaths,
      avgAcs: g > 0 ? Math.round(e.acsSum / g) : 0,
      avgAdr: g > 0 ? Math.round((e.adrSum / g) * 10) / 10 : 0,
      avgHsPercent: g > 0 ? Math.round((e.hsSum / g) * 10) / 10 : 0,
      mostPlayedAgent,
      agentCounts: e.agentCounts,
      teamNames: [...e.teamNames].sort((a, b) => a.localeCompare(b)),
      mvpCount: e.mvpCount,
    });
  }
  return result;
}

export type CrossCupStanding = AggregatedPlayerStats & {
  rating: number;
  tournamentsPlayed: number;
};

function mostPlayedAgentFromCounts(
  agentCounts: Record<string, number>,
): string | null {
  return (
    Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  );
}

/**
 * Rank players across cups: score each cup with weightedAcs, then combine
 * those cup scores with {@link crossCupRating}.
 */
export function rankCrossCupPlayers(
  cupPools: AggregatedPlayerStats[][],
): CrossCupStanding[] {
  type Acc = {
    riotId: string;
    userName: string | null;
    gamesPlayed: number;
    totalRounds: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    totalFirstKills: number;
    totalFirstDeaths: number;
    acsWeighted: number;
    adrWeighted: number;
    hsWeighted: number;
    agentCounts: Record<string, number>;
    teamNames: Set<string>;
    mvpCount: number;
    cupRatings: number[];
  };

  const byKey = new Map<string, Acc>();
  const allCupRatings: number[] = [];

  for (const pool of cupPools) {
    if (pool.length === 0) continue;
    const baseline = computeStandoutBaseline(pool);
    for (const p of pool) {
      if (p.gamesPlayed <= 0) continue;
      const cupRating = weightedAcs(p.avgAcs, p.gamesPlayed, baseline);
      allCupRatings.push(cupRating);
      const existing = byKey.get(p.key);
      if (!existing) {
        byKey.set(p.key, {
          riotId: p.riotId,
          userName: p.userName,
          gamesPlayed: p.gamesPlayed,
          totalRounds: p.totalRounds,
          totalKills: p.totalKills,
          totalDeaths: p.totalDeaths,
          totalAssists: p.totalAssists,
          totalFirstKills: p.totalFirstKills,
          totalFirstDeaths: p.totalFirstDeaths,
          acsWeighted: p.avgAcs * p.gamesPlayed,
          adrWeighted: p.avgAdr * p.gamesPlayed,
          hsWeighted: p.avgHsPercent * p.gamesPlayed,
          agentCounts: { ...p.agentCounts },
          teamNames: new Set(p.teamNames),
          mvpCount: p.mvpCount,
          cupRatings: [cupRating],
        });
        continue;
      }
      existing.gamesPlayed += p.gamesPlayed;
      existing.totalRounds += p.totalRounds;
      existing.totalKills += p.totalKills;
      existing.totalDeaths += p.totalDeaths;
      existing.totalAssists += p.totalAssists;
      existing.totalFirstKills += p.totalFirstKills;
      existing.totalFirstDeaths += p.totalFirstDeaths;
      existing.acsWeighted += p.avgAcs * p.gamesPlayed;
      existing.adrWeighted += p.avgAdr * p.gamesPlayed;
      existing.hsWeighted += p.avgHsPercent * p.gamesPlayed;
      existing.mvpCount += p.mvpCount;
      existing.cupRatings.push(cupRating);
      if (!existing.userName && p.userName) existing.userName = p.userName;
      for (const [agent, count] of Object.entries(p.agentCounts)) {
        existing.agentCounts[agent] = (existing.agentCounts[agent] ?? 0) + count;
      }
      for (const name of p.teamNames) existing.teamNames.add(name);
    }
  }

  const leagueMean =
    allCupRatings.length === 0
      ? 0
      : allCupRatings.reduce((sum, rating) => sum + rating, 0) /
        allCupRatings.length;

  const rows: CrossCupStanding[] = [];
  for (const [key, acc] of byKey) {
    const g = acc.gamesPlayed;
    rows.push({
      key,
      riotId: acc.riotId,
      userName: acc.userName,
      gamesPlayed: g,
      totalRounds: acc.totalRounds,
      totalKills: acc.totalKills,
      totalDeaths: acc.totalDeaths,
      totalAssists: acc.totalAssists,
      totalFirstKills: acc.totalFirstKills,
      totalFirstDeaths: acc.totalFirstDeaths,
      avgAcs: g > 0 ? Math.round(acc.acsWeighted / g) : 0,
      avgAdr: g > 0 ? Math.round((acc.adrWeighted / g) * 10) / 10 : 0,
      avgHsPercent: g > 0 ? Math.round((acc.hsWeighted / g) * 10) / 10 : 0,
      mostPlayedAgent: mostPlayedAgentFromCounts(acc.agentCounts),
      agentCounts: acc.agentCounts,
      teamNames: [...acc.teamNames].sort((a, b) => a.localeCompare(b)),
      mvpCount: acc.mvpCount,
      rating: crossCupRating(acc.cupRatings, leagueMean),
      tournamentsPlayed: acc.cupRatings.length,
    });
  }

  return rows.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.tournamentsPlayed !== a.tournamentsPlayed) {
      return b.tournamentsPlayed - a.tournamentsPlayed;
    }
    if (b.mvpCount !== a.mvpCount) return b.mvpCount - a.mvpCount;
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
    if (b.avgAcs !== a.avgAcs) return b.avgAcs - a.avgAcs;
    return a.riotId.localeCompare(b.riotId);
  });
}

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Agent names with game counts, e.g. "Jett (3); Omen (1)". */
export function formatAgentsPlayed(agentCounts: Record<string, number>): string {
  return Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([agent, count]) => `${agent} (${count})`)
    .join("; ");
}

/**
 * CSV for admin player-stats export (opens in Excel).
 * Includes Teams (primary + poach appearances) and Agents Played as names.
 */
export function buildPlayerStatsCsv(players: AggregatedPlayerStats[]): string {
  const baseline = computeStandoutBaseline(players);
  const headers = [
    "Rank",
    "Player",
    "Riot ID",
    "Teams",
    "Agents Played",
    "Most Played Agent",
    "GP",
    "Rating",
    "ACS",
    "Kills",
    "Deaths",
    "Assists",
    "K/D",
    "FK",
    "FD",
    "HS%",
    "ADR",
    "MVPs",
  ];

  const ranked = [...players].sort((a, b) => {
    const ratingDiff =
      weightedAcs(b.avgAcs, b.gamesPlayed, baseline) -
      weightedAcs(a.avgAcs, a.gamesPlayed, baseline);
    if (ratingDiff !== 0) return ratingDiff;
    if (b.mvpCount !== a.mvpCount) return b.mvpCount - a.mvpCount;
    return b.totalKills - a.totalKills;
  });

  const rows = ranked.map((p, idx) => {
    const rating = weightedAcs(p.avgAcs, p.gamesPlayed, baseline);
    const kd =
      p.totalDeaths > 0
        ? (p.totalKills / p.totalDeaths).toFixed(2)
        : p.totalKills.toFixed(2);
    const displayName = p.userName?.trim() || p.riotId.split("#")[0] || p.riotId;
    return [
      idx + 1,
      csvEscape(displayName),
      csvEscape(p.riotId),
      csvEscape(p.teamNames.join("; ")),
      csvEscape(formatAgentsPlayed(p.agentCounts)),
      csvEscape(p.mostPlayedAgent),
      p.gamesPlayed,
      rating.toFixed(1),
      p.avgAcs,
      p.totalKills,
      p.totalDeaths,
      p.totalAssists,
      kd,
      p.totalFirstKills,
      p.totalFirstDeaths,
      p.avgHsPercent,
      p.avgAdr,
      p.mvpCount,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
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
 * Rank by weighted (Bayesian) ACS against the pool's own baseline, then K/D,
 * then games. Optional boost/tie-break hooks let role-specific preferences
 * (e.g. Initiator assists) reshape close races without inventing a new formula.
 */
function rankStandoutList(
  players: AggregatedPlayerStats[],
  options?: {
    tieBreak?: (p: AggregatedPlayerStats) => number;
    ratingBoost?: (p: AggregatedPlayerStats) => number;
  },
): AggregatedPlayerStats[] {
  if (players.length === 0) return [];
  const baseline = computeStandoutBaseline(players);
  const tieBreak = options?.tieBreak;
  const ratingBoost = options?.ratingBoost;
  return [...players].sort((a, b) => {
    const scoreA =
      weightedAcs(a.avgAcs, a.gamesPlayed, baseline) + (ratingBoost?.(a) ?? 0);
    const scoreB =
      weightedAcs(b.avgAcs, b.gamesPlayed, baseline) + (ratingBoost?.(b) ?? 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (tieBreak) {
      const tA = tieBreak(a);
      const tB = tieBreak(b);
      if (tB !== tA) return tB - tA;
    }
    const kdA = a.totalDeaths > 0 ? a.totalKills / a.totalDeaths : a.totalKills;
    const kdB = b.totalDeaths > 0 ? b.totalKills / b.totalDeaths : b.totalKills;
    if (kdB !== kdA) return kdB - kdA;
    // Prefer quality over volume when Rating/K/D are tied.
    if (b.avgAcs !== a.avgAcs) return b.avgAcs - a.avgAcs;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return 0;
  });
}

function rankStandouts(
  players: AggregatedPlayerStats[],
  options?: {
    tieBreak?: (p: AggregatedPlayerStats) => number;
    ratingBoost?: (p: AggregatedPlayerStats) => number;
  },
): AggregatedPlayerStats | null {
  return rankStandoutList(players, options)[0] ?? null;
}

/** Assists-per-game boost used for Initiator role / agent awards. */
export function initiatorAssistBoost(totalAssists: number, gamesPlayed: number): number {
  if (gamesPlayed <= 0) return 0;
  return INITIATOR_ASSIST_WEIGHT * (totalAssists / gamesPlayed);
}

/** First ranked player who has not already taken an exclusive award. */
function pickUnclaimedStandout(
  ranked: AggregatedPlayerStats[],
  claimed: Set<string>,
): AggregatedPlayerStats | null {
  for (const p of ranked) {
    if (!claimed.has(p.key)) return p;
  }
  return null;
}

/** Distinct agents played per role (from match agentCounts). */
export function countAgentsPerRole(
  agentCounts: Record<string, number>,
): Record<AgentRole, number> {
  const counts: Record<AgentRole, number> = {
    Duelist: 0,
    Initiator: 0,
    Controller: 0,
    Sentinel: 0,
  };
  for (const agent of Object.keys(agentCounts)) {
    const role = getAgentRole(agent);
    if (role) counts[role] += 1;
  }
  return counts;
}

/** Roles the player actually appeared on. */
export function distinctRolesPlayed(
  agentCounts: Record<string, number>,
): AgentRole[] {
  const counts = countAgentsPerRole(agentCounts);
  return (Object.keys(counts) as AgentRole[]).filter((role) => counts[role] > 0);
}

/**
 * Flex: played at least one agent in every role.
 *
 * Role span is the whole of the requirement — a Jett/Raze/Reyna player has
 * three agents but never left Duelist, so an agent count would hand the award
 * to a one-role player.
 */
export function qualifiesFlex(agentCounts: Record<string, number>): boolean {
  return distinctRolesPlayed(agentCounts).length >= FLEX_MIN_ROLES;
}

/**
 * Higher = better coverage of priority roles (Initiator → Controller → Sentinel → Duelist).
 * Breaks ties between flexers who covered the same number of roles.
 */
export function flexPriorityScore(agentCounts: Record<string, number>): number {
  const met = new Set(distinctRolesPlayed(agentCounts));
  let score = 0;
  FLEX_ROLE_PRIORITY.forEach((role, index) => {
    if (met.has(role)) {
      // Earlier in priority list = larger weight
      score += 1 << (FLEX_ROLE_PRIORITY.length - 1 - index);
    }
  });
  return score;
}

/**
 * Best overall + best per role + best Flex.
 *
 * Role / overall awards use the weighted percentile + Bayesian engine in
 * `tournament-awards.ts`. Flex is awarded first and kept; other role cards
 * take the next player. Best Overall is independent and may overlap.
 */
export function aggregateRoleStandouts(
  games: StatsGame[],
  eligibility?: TournamentStatsEligibility | null,
  gpFloor: number = STANDOUT_GP_FLOOR,
): RoleStandouts {
  const overall = aggregatePlayerStats(games, { eligibility }).filter(
    (p) => p.gamesPlayed >= gpFloor,
  );

  const bestOverallRow = pickAwardWinner(
    overall,
    AWARD_CONFIG.overallWeights,
    AWARD_CONFIG.minGames,
  );

  /** Exclusive award holders — Overall is intentionally not recorded here. */
  const claimed = new Set<string>();

  // Flex still uses overall ACS Rating (span of roles is the main requirement).
  const flexFloor = Math.min(
    AWARD_CONFIG.minGames,
    dynamicGamesThreshold(overall) || AWARD_CONFIG.minGames,
  );
  const flexCandidates = overall.filter(
    (p) => p.gamesPlayed >= flexFloor && qualifiesFlex(p.agentCounts),
  );
  const flexRanked = rankStandoutList(flexCandidates, {
    tieBreak: (p) => flexPriorityScore(p.agentCounts),
  });
  const bestFlexRow = pickUnclaimedStandout(flexRanked, claimed);
  if (bestFlexRow) claimed.add(bestFlexRow.key);

  const roles: AgentRole[] = ["Duelist", "Initiator", "Controller", "Sentinel"];
  const byRole: Partial<Record<AgentRole, StandoutPlayer | null>> = {};

  for (const role of roles) {
    const rolePlayers = aggregatePlayerStats(games, {
      eligibility,
      agentRoleFilter: (agent) => getAgentRole(agent) === role,
    }).filter((p) => p.gamesPlayed >= gpFloor);

    const best = pickAwardWinner(
      rolePlayers,
      weightsForRole(role),
      AWARD_CONFIG.minGames,
      claimed,
    );
    if (best) claimed.add(best.key);
    byRole[role] = best ? toStandout(best) : null;
  }

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
 * Aggregates performance stats for every agent played in the tournament.
 * Winner = role-model award score on that agent only (same formula as the
 * agent's role board), with Bayesian tempering. Flex winners may also win agents.
 */
export function aggregateAgentStandouts(
  games: StatsGame[],
  eligibility?: TournamentStatsEligibility | null,
  gpFloor: number = STANDOUT_GP_FLOOR,
  excludePlayerKeys?: Iterable<string>,
): AgentStandout[] {
  const excluded = new Set(
    [...(excludePlayerKeys ?? [])].map((k) => k.toLowerCase()),
  );

  const pickCounts = new Map<string, number>();
  for (const game of games) {
    for (const p of game.players) {
      if (!p.agent) continue;
      if (!isStatsAppearanceEligible(p, game, eligibility)) continue;
      const agent = p.agent.trim();
      pickCounts.set(agent, (pickCounts.get(agent) ?? 0) + 1);
    }
  }

  const result: AgentStandout[] = [];

  for (const [agent, totalPickCount] of pickCounts.entries()) {
    const role = getAgentRole(agent);
    const players = aggregatePlayerStats(games, {
      eligibility,
      agentNameFilter: agent,
    }).filter((p) => p.gamesPlayed >= gpFloor);

    const maxGp = players.reduce((m, p) => Math.max(m, p.gamesPlayed), 0);
    const minGames = agentAwardMinGames(totalPickCount, maxGp);
    const weights = role ? weightsForRole(role) : AWARD_CONFIG.overallWeights;
    const exclude = excluded.size > 0 ? excluded : undefined;
    const winner = pickAwardWinner(players, weights, minGames, exclude);

    result.push({
      agent,
      role,
      totalPickCount,
      bestPlayer: winner
        ? {
            riotId: winner.riotId,
            userName: winner.userName,
            gamesPlayedOnAgent: winner.gamesPlayed,
            avgAcs: winner.avgAcs,
            kd:
              winner.totalDeaths > 0
                ? Math.round((winner.totalKills / winner.totalDeaths) * 100) / 100
                : winner.totalKills,
            totalKills: winner.totalKills,
            totalDeaths: winner.totalDeaths,
            totalAssists: winner.totalAssists,
          }
        : null,
    });
  }

  result.sort(
    (a, b) => b.totalPickCount - a.totalPickCount || a.agent.localeCompare(b.agent),
  );
  return result;
}

