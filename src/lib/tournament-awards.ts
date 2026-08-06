/**
 * NTG tournament awards — role-weighted impact + Bayesian sample tempering.
 *
 * One-sentence rule: highest adjusted role rating in that pool (role or agent),
 * after normalizing metrics and pulling tiny samples toward the pool mean.
 */

import type { AgentRole } from "@/lib/valorant-agent";
import type { AggregatedPlayerStats } from "@/lib/tournament-stats";

/** Metrics used inside a role model (0–100 percentiles). */
export type AwardMetricKey =
  | "rating"
  | "fkDiff"
  | "acs"
  | "adr"
  | "kast"
  | "assists"
  | "kd";

export type RoleWeightConfig = Partial<Record<AwardMetricKey, number>>;

/**
 * Tunable award config. Weights are relative — they are renormalized at runtime
 * so missing metrics (e.g. no rounds → no KAST) do not break the model.
 */
export const AWARD_CONFIG = {
  /** Bayesian prior games — tempers 1–2 map spikes. */
  priorGames: 5,
  /** Hard eligibility for role / popular-agent awards. */
  minGames: 3,
  /** Rare agents (few tournament picks) may award from this many games. */
  rareAgentMinGames: 1,
  /** At/below this many tournament picks, agent is treated as rare. */
  rareAgentPickCeiling: 8,

  /**
   * Approximate KAST from totals (no per-round survival feed yet):
   * (K + A + estimated survives) / (3 × rounds). Good enough for awards until
   * round-level KAST is stored.
   */
  useKastProxy: true,

  roleWeights: {
    Duelist: {
      rating: 0.3,
      fkDiff: 0.25,
      acs: 0.2,
      adr: 0.15,
      kast: 0.1,
    },
    Initiator: {
      rating: 0.25,
      assists: 0.35,
      kast: 0.2,
      adr: 0.1,
      acs: 0.1,
    },
    Controller: {
      rating: 0.3,
      kast: 0.25,
      assists: 0.2,
      adr: 0.15,
      acs: 0.1,
    },
    Sentinel: {
      rating: 0.3,
      kast: 0.25,
      kd: 0.2,
      acs: 0.15,
      adr: 0.1,
    },
  } satisfies Record<AgentRole, RoleWeightConfig>,

  /** Best Overall — balanced combat impact (not role-specific). */
  overallWeights: {
    rating: 0.35,
    acs: 0.2,
    adr: 0.15,
    kd: 0.15,
    fkDiff: 0.15,
  } satisfies RoleWeightConfig,
} as const;

export type AwardMetricValues = Record<AwardMetricKey, number>;

export function roundsForPlayer(p: AggregatedPlayerStats): number {
  return Math.max(0, p.totalRounds ?? 0);
}

/** Combat "Rating" proxy — ACS is our best stored overall impact signal. */
export function metricValues(p: AggregatedPlayerStats): AwardMetricValues {
  const games = Math.max(1, p.gamesPlayed);
  const rounds = roundsForPlayer(p);
  const roundsSafe = Math.max(1, rounds);
  const kd = p.totalDeaths > 0 ? p.totalKills / p.totalDeaths : p.totalKills;
  const fkDiff =
    (p.totalFirstKills - p.totalFirstDeaths) / games;
  const assists = p.totalAssists / games;
  // Soft KAST proxy until round-level survival is stored.
  const survives = Math.max(0, roundsSafe - p.totalDeaths);
  const kast = AWARD_CONFIG.useKastProxy
    ? Math.min(100, (100 * (p.totalKills + p.totalAssists + survives)) / (3 * roundsSafe))
    : 0;

  return {
    rating: p.avgAcs,
    fkDiff,
    acs: p.avgAcs,
    adr: p.avgAdr,
    kast,
    assists,
    kd,
  };
}

/** Percentile rank in [0, 100]. Higher raw value → higher percentile. */
export function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [50];

  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const out = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && indexed[j + 1]!.v === indexed[i]!.v) j += 1;
    // Mid-rank percentile for ties.
    const mid = (i + j) / 2;
    const pct = (mid / (n - 1)) * 100;
    for (let k = i; k <= j; k++) {
      out[indexed[k]!.i] = pct;
    }
    i = j + 1;
  }
  return out;
}

function renormalizeWeights(
  weights: RoleWeightConfig,
  available: Set<AwardMetricKey>,
): Array<{ key: AwardMetricKey; weight: number }> {
  const entries = (Object.entries(weights) as [AwardMetricKey, number][]).filter(
    ([key, w]) => w > 0 && available.has(key),
  );
  const sum = entries.reduce((acc, [, w]) => acc + w, 0);
  if (sum <= 0) return [];
  return entries.map(([key, w]) => ({ key, weight: w / sum }));
}

export function rawRoleImpact(
  metrics: AwardMetricValues,
  percentiles: Partial<Record<AwardMetricKey, number>>,
  weights: RoleWeightConfig,
): number {
  const available = new Set<AwardMetricKey>(
    (Object.keys(percentiles) as AwardMetricKey[]).filter(
      (k) => percentiles[k] != null && Number.isFinite(metrics[k]),
    ),
  );
  // Drop KAST when we have no rounds to estimate it.
  if (!AWARD_CONFIG.useKastProxy || metrics.kast <= 0) {
    available.delete("kast");
  }
  const parts = renormalizeWeights(weights, available);
  if (parts.length === 0) return 0;
  let score = 0;
  for (const { key, weight } of parts) {
    score += weight * (percentiles[key] ?? 0);
  }
  return score;
}

/** Bayesian tempering toward the pool mean. */
export function bayesianAdjust(
  raw: number,
  games: number,
  poolMean: number,
  priorGames: number = AWARD_CONFIG.priorGames,
): number {
  if (games <= 0) return poolMean;
  if (priorGames <= 0) return raw;
  return (games * raw + priorGames * poolMean) / (games + priorGames);
}

export type AwardCandidate = {
  player: AggregatedPlayerStats;
  raw: number;
  adjusted: number;
};

/**
 * Rank players with a role (or overall) weight model.
 * Percentiles are computed inside this pool only.
 */
export function rankAwardCandidates(
  players: AggregatedPlayerStats[],
  weights: RoleWeightConfig,
  minGames: number = AWARD_CONFIG.minGames,
): AwardCandidate[] {
  const eligible = players.filter((p) => p.gamesPlayed >= minGames);
  if (eligible.length === 0) return [];

  const metricRows = eligible.map(metricValues);
  const keys = Object.keys(weights) as AwardMetricKey[];
  const percentileByKey: Partial<Record<AwardMetricKey, number[]>> = {};

  for (const key of keys) {
    if (!weights[key]) continue;
    const column = metricRows.map((m) => m[key]);
    // Skip dead metrics (all zero / no signal).
    if (column.every((v) => !Number.isFinite(v) || v === 0)) {
      if (key === "kast" || key === "fkDiff") continue;
    }
    percentileByKey[key] = percentileRanks(column);
  }

  const rawScores = eligible.map((_, idx) => {
    const percentiles: Partial<Record<AwardMetricKey, number>> = {};
    for (const key of Object.keys(percentileByKey) as AwardMetricKey[]) {
      percentiles[key] = percentileByKey[key]![idx]!;
    }
    return rawRoleImpact(metricRows[idx]!, percentiles, weights);
  });

  const poolMean =
    rawScores.reduce((a, b) => a + b, 0) / Math.max(1, rawScores.length);

  const ranked: AwardCandidate[] = eligible.map((player, idx) => ({
    player,
    raw: rawScores[idx]!,
    adjusted: bayesianAdjust(rawScores[idx]!, player.gamesPlayed, poolMean),
  }));

  ranked.sort((a, b) => {
    if (b.adjusted !== a.adjusted) return b.adjusted - a.adjusted;
    if (b.raw !== a.raw) return b.raw - a.raw;
    if (b.player.gamesPlayed !== a.player.gamesPlayed) {
      return b.player.gamesPlayed - a.player.gamesPlayed;
    }
    return b.player.avgAcs - a.player.avgAcs;
  });

  return ranked;
}

export function pickAwardWinner(
  players: AggregatedPlayerStats[],
  weights: RoleWeightConfig,
  minGames?: number,
  excludeKeys?: Set<string>,
): AggregatedPlayerStats | null {
  const ranked = rankAwardCandidates(players, weights, minGames);
  for (const row of ranked) {
    if (excludeKeys?.has(row.player.key)) continue;
    return row.player;
  }
  return null;
}

export function weightsForRole(role: AgentRole): RoleWeightConfig {
  return AWARD_CONFIG.roleWeights[role];
}

export function agentAwardMinGames(totalPicks: number, maxGpOnAgent: number): number {
  if (maxGpOnAgent <= 0) return 0;
  if (totalPicks <= AWARD_CONFIG.rareAgentPickCeiling) {
    return Math.min(maxGpOnAgent, Math.max(AWARD_CONFIG.rareAgentMinGames, 1));
  }
  return Math.min(maxGpOnAgent, AWARD_CONFIG.minGames);
}
