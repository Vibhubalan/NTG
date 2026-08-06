import { describe, expect, it } from "vitest";
import {
  AWARD_CONFIG,
  agentAwardMinGames,
  bayesianAdjust,
  percentileRanks,
  rankAwardCandidates,
  rawRoleImpact,
} from "@/lib/tournament-awards";
import type { AggregatedPlayerStats } from "@/lib/tournament-stats";

function stubPlayer(
  overrides: Partial<AggregatedPlayerStats> & { riotId: string },
): AggregatedPlayerStats {
  return {
    key: overrides.riotId.toLowerCase(),
    userName: null,
    gamesPlayed: 4,
    totalRounds: 80,
    totalKills: 60,
    totalDeaths: 40,
    totalAssists: 20,
    totalFirstKills: 8,
    totalFirstDeaths: 6,
    avgAcs: 220,
    avgAdr: 140,
    avgHsPercent: 20,
    mostPlayedAgent: "Jett",
    agentCounts: { Jett: 4 },
    teamNames: [],
    mvpCount: 0,
    ...overrides,
  };
}

describe("tournament-awards engine", () => {
  it("percentileRanks puts higher values higher", () => {
    expect(percentileRanks([10, 30, 20])).toEqual([0, 100, 50]);
    expect(percentileRanks([5])).toEqual([50]);
  });

  it("bayesianAdjust tempers tiny samples toward the mean", () => {
    const prior = AWARD_CONFIG.priorGames;
    const spike = bayesianAdjust(96, 2, 80, prior);
    const steady = bayesianAdjust(90, 8, 80, prior);
    expect(steady).toBeGreaterThan(spike);
    expect(spike).toBeCloseTo((2 * 96 + prior * 80) / (2 + prior), 5);
  });

  it("rawRoleImpact uses renormalized weights", () => {
    const score = rawRoleImpact(
      {
        rating: 1,
        fkDiff: 1,
        acs: 1,
        adr: 1,
        kast: 0,
        assists: 1,
        kd: 1,
      },
      { rating: 100, acs: 50, adr: 0 },
      { rating: 0.5, acs: 0.5, kast: 0.5 },
    );
    // kast dropped → rating+acs at 50/50 → 75
    expect(score).toBe(75);
  });

  it("prefers consistent high sample over a 2-game spike", () => {
    // Enough fills so Spike + Steady both sit near the top of the pool;
    // Bayesian tempering then favors Steady's larger sample.
    const players = [
      stubPlayer({
        riotId: "Spike#001",
        gamesPlayed: 2,
        totalRounds: 40,
        avgAcs: 320,
        avgAdr: 180,
        totalKills: 50,
        totalDeaths: 20,
        totalAssists: 10,
        totalFirstKills: 10,
        totalFirstDeaths: 2,
      }),
      stubPlayer({
        riotId: "Steady#001",
        gamesPlayed: 8,
        totalRounds: 160,
        avgAcs: 270,
        avgAdr: 160,
        totalKills: 150,
        totalDeaths: 85,
        totalAssists: 45,
        totalFirstKills: 22,
        totalFirstDeaths: 10,
      }),
      stubPlayer({
        riotId: "Fill#001",
        gamesPlayed: 5,
        totalRounds: 100,
        avgAcs: 200,
        avgAdr: 130,
        totalKills: 70,
        totalDeaths: 70,
        totalAssists: 25,
        totalFirstKills: 5,
        totalFirstDeaths: 8,
      }),
      stubPlayer({
        riotId: "Fill#002",
        gamesPlayed: 5,
        totalRounds: 100,
        avgAcs: 190,
        avgAdr: 125,
        totalKills: 65,
        totalDeaths: 72,
        totalAssists: 22,
        totalFirstKills: 4,
        totalFirstDeaths: 9,
      }),
      stubPlayer({
        riotId: "Fill#003",
        gamesPlayed: 4,
        totalRounds: 80,
        avgAcs: 180,
        avgAdr: 120,
        totalKills: 55,
        totalDeaths: 60,
        totalAssists: 18,
        totalFirstKills: 3,
        totalFirstDeaths: 8,
      }),
    ];

    const ranked = rankAwardCandidates(
      players,
      AWARD_CONFIG.roleWeights.Duelist,
      2,
    );
    expect(ranked[0]?.player.riotId).toBe("Steady#001");
  });

  it("agentAwardMinGames stays soft for rare agents", () => {
    expect(agentAwardMinGames(3, 2)).toBe(1);
    expect(agentAwardMinGames(30, 6)).toBe(3);
    expect(agentAwardMinGames(30, 2)).toBe(2);
  });
});
