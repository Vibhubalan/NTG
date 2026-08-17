import { describe, expect, it } from "vitest";
import {
  AGENT_RARE_PICK_CEILING,
  agentAwardGamesThreshold,
  aggregateAgentStandouts,
  aggregateMapMeta,
  aggregatePlayerStats,
  aggregateRoleStandouts,
  aggregateTeamMapStats,
  buildPlayerStatsCsv,
  computeStandoutBaseline,
  crossCupRating,
  distinctRolesPlayed,
  dynamicGamesThreshold,
  flexPriorityScore,
  formatAgentsPlayed,
  initiatorAssistBoost,
  isStatsAppearanceEligible,
  normalizeCompKey,
  qualifiesFlex,
  rankCrossCupPlayers,
  statsPlayerKey,
  weightedAcs,
  winningTeamId,
  type StatsGame,
  type TournamentStatsEligibility,
} from "@/lib/tournament-stats";

const eligibility: TournamentStatsEligibility = {
  byUserId: {
    "user-1": [
      { teamId: "team-a", kind: "PRIMARY", since: null },
      {
        teamId: "team-b",
        kind: "POACH",
        since: "2026-08-01T12:00:00.000Z",
      },
    ],
  },
  byRiotId: {
    "poach#001": [
      { teamId: "team-a", kind: "PRIMARY", since: null },
      {
        teamId: "team-b",
        kind: "POACH",
        since: "2026-08-01T12:00:00.000Z",
      },
    ],
  },
};

describe("tournament-stats membership filtering", () => {
  it("normalizes riotId keys", () => {
    expect(statsPlayerKey("Player#TAG")).toBe("player#tag");
  });

  it("merges rename appearances for the same linked userId", () => {
    const open: TournamentStatsEligibility = {
      byUserId: {
        "user-ghost": [{ teamId: "team-a", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };
    const merged = aggregatePlayerStats(
      [
        {
          teamAId: "team-a",
          teamBId: "team-x",
          teamAName: "Zenith",
          teamBName: "X",
          // Newest first — display name should stay GHOSTY神#MEOW
          startedAt: "2026-08-07T00:00:00.000Z",
          mvpRiotId: "GHOSTY神#MEOW",
          players: [
            {
              riotId: "GHOSTY神#MEOW",
              userId: "user-ghost",
              teamId: "team-a",
              agent: "Jett",
              kills: 39,
              deaths: 34,
              assists: 5,
              acs: 280,
              adr: 188,
              hsPercent: 26,
              firstKills: 8,
              firstDeaths: 6,
            },
          ],
        },
        {
          teamAId: "team-a",
          teamBId: "team-x",
          teamAName: "Zenith",
          teamBName: "X",
          startedAt: "2026-08-05T00:00:00.000Z",
          mvpRiotId: "BayesianWhiff#PFC",
          players: [
            {
              riotId: "BayesianWhiff#PFC",
              userId: "user-ghost",
              teamId: "team-a",
              agent: "Jett",
              kills: 20,
              deaths: 10,
              assists: 2,
              acs: 250,
              adr: 160,
              hsPercent: 30,
              firstKills: 5,
              firstDeaths: 3,
            },
          ],
        },
      ],
      { eligibility: open },
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]!.riotId).toBe("GHOSTY神#MEOW");
    expect(merged[0]!.gamesPlayed).toBe(2);
    expect(merged[0]!.totalKills).toBe(59);
    expect(merged[0]!.mvpCount).toBe(2);
    expect(merged[0]!.key).toBe("user:user-ghost");
  });

  it("rejects appearances for teams the player was never added to", () => {
    expect(
      isStatsAppearanceEligible(
        { riotId: "Poach#001", userId: "user-1", teamId: "team-c" },
        { startedAt: "2026-08-02T00:00:00.000Z" },
        eligibility,
      ),
    ).toBe(false);
  });

  it("accepts primary-team games and poach-team games only after poach time", () => {
    expect(
      isStatsAppearanceEligible(
        { riotId: "Poach#001", userId: "user-1", teamId: "team-a" },
        { startedAt: "2026-07-01T00:00:00.000Z" },
        eligibility,
      ),
    ).toBe(true);

    expect(
      isStatsAppearanceEligible(
        { riotId: "Poach#001", userId: "user-1", teamId: "team-b" },
        { startedAt: "2026-07-31T00:00:00.000Z" },
        eligibility,
      ),
    ).toBe(false);

    expect(
      isStatsAppearanceEligible(
        { riotId: "Poach#001", userId: "user-1", teamId: "team-b" },
        { startedAt: "2026-08-01T13:00:00.000Z" },
        eligibility,
      ),
    ).toBe(true);
  });

  it("merges eligible games into one row and ignores unofficial games", () => {
    const rows = aggregatePlayerStats(
      [
        {
          teamAId: "team-a",
          teamBId: "team-x",
          teamAName: "Alpha",
          teamBName: "X",
          startedAt: "2026-07-10T00:00:00.000Z",
          mvpRiotId: "Poach#001",
          players: [
            {
              riotId: "Poach#001",
              userId: "user-1",
              teamId: "team-a",
              agent: "Jett",
              kills: 20,
              deaths: 10,
              assists: 5,
              acs: 250,
              adr: 160,
              hsPercent: 25,
            },
          ],
        },
        {
          teamAId: "team-c",
          teamBId: "team-x",
          teamAName: "Charlie",
          teamBName: "X",
          startedAt: "2026-07-20T00:00:00.000Z",
          mvpRiotId: null,
          players: [
            {
              riotId: "Poach#001",
              userId: "user-1",
              teamId: "team-c",
              agent: "Raze",
              kills: 99,
              deaths: 1,
              assists: 1,
              acs: 400,
              adr: 200,
              hsPercent: 50,
            },
          ],
        },
        {
          teamAId: "team-b",
          teamBId: "team-x",
          teamAName: "Bravo",
          teamBName: "X",
          startedAt: "2026-08-02T00:00:00.000Z",
          mvpRiotId: null,
          players: [
            {
              riotId: "Poach#001",
              userId: "user-1",
              teamId: "team-b",
              agent: "Sova",
              kills: 18,
              deaths: 9,
              assists: 4,
              acs: 230,
              adr: 150,
              hsPercent: 22,
            },
          ],
        },
      ],
      { eligibility },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].gamesPlayed).toBe(2);
    expect(rows[0].totalKills).toBe(38);
    // Game 1 explicit MVP + game 3 highest ACS among counted appearances.
    expect(rows[0].mvpCount).toBe(2);
  });
});

function player(
  riotId: string,
  teamId: string,
  agent: string,
  acs: number,
  userId?: string,
  assists = 5,
) {
  return {
    riotId,
    userId: userId ?? null,
    teamId,
    agent,
    kills: Math.round(acs / 10),
    deaths: 10,
    assists,
    acs,
    adr: 140,
    hsPercent: 20,
  };
}

const metaEligibility: TournamentStatsEligibility = {
  byUserId: {
    u1: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
    u2: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
    u3: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
    u4: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
    u5: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
    u6: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
  },
  byRiotId: {},
};

const metaGames: StatsGame[] = [
  {
    teamAId: "team-a",
    teamBId: "team-b",
    teamAName: "Alpha",
    teamBName: "Bravo",
    teamARounds: 13,
    teamBRounds: 7,
    mapName: "Ascent",
    mvpRiotId: "Flex#001",
    players: [
      player("Flex#001", "team-a", "Jett", 280, "u1"),
      player("Init#001", "team-a", "Sova", 220, "u2"),
      player("Ctrl#001", "team-a", "Omen", 200, "u3"),
      player("Sent#001", "team-a", "Cypher", 190, "u4"),
      player("Duo#001", "team-a", "Sage", 180, "u5"),
      player("Opp#001", "team-b", "Raze", 210, "u6"),
    ],
  },
  {
    teamAId: "team-a",
    teamBId: "team-b",
    teamAName: "Alpha",
    teamBName: "Bravo",
    teamARounds: 13,
    teamBRounds: 10,
    mapName: "Ascent",
    mvpRiotId: null,
    players: [
      player("Flex#001", "team-a", "Sova", 260, "u1"),
      player("Init#001", "team-a", "Fade", 230, "u2"),
      player("Ctrl#001", "team-a", "Viper", 210, "u3"),
      player("Sent#001", "team-a", "Killjoy", 200, "u4"),
      player("Duo#001", "team-a", "Chamber", 195, "u5"),
      player("Opp#001", "team-b", "Jett", 240, "u6"),
    ],
  },
  {
    teamAId: "team-a",
    teamBId: "team-b",
    teamAName: "Alpha",
    teamBName: "Bravo",
    teamARounds: 8,
    teamBRounds: 13,
    mapName: "Bind",
    mvpRiotId: null,
    players: [
      player("Flex#001", "team-a", "Omen", 240, "u1"),
      player("Init#001", "team-a", "Breach", 210, "u2"),
      player("Ctrl#001", "team-a", "Astra", 205, "u3"),
      player("Sent#001", "team-a", "Deadlock", 185, "u4"),
      player("Duo#001", "team-a", "Jett", 250, "u5"),
      player("Opp#001", "team-b", "Reyna", 270, "u6"),
    ],
  },
  {
    teamAId: "team-a",
    teamBId: "team-b",
    teamAName: "Alpha",
    teamBName: "Bravo",
    teamARounds: 13,
    teamBRounds: 5,
    mapName: "Bind",
    mvpRiotId: null,
    players: [
      // Flex finishes all four roles: Duelist, Initiator, Controller, Sentinel
      player("Flex#001", "team-a", "Cypher", 255, "u1"),
      player("Init#001", "team-a", "Sova", 215, "u2"),
      player("Ctrl#001", "team-a", "Omen", 200, "u3"),
      player("Sent#001", "team-a", "Sage", 190, "u4"),
      player("Duo#001", "team-a", "Raze", 245, "u5"),
      player("Opp#001", "team-b", "Neon", 200, "u6"),
    ],
  },
];

describe("tournament-stats meta aggregations", () => {
  it("normalizes comps regardless of agent order", () => {
    expect(normalizeCompKey(["Omen", "Jett", "Sova"])).toBe(
      normalizeCompKey(["Sova", "Jett", "Omen"]),
    );
    expect(normalizeCompKey(["Jett", "Omen"])).toBe("Jett|Omen");
  });

  it("derives winning team from rounds", () => {
    expect(winningTeamId(metaGames[0])).toBe("team-a");
    expect(winningTeamId(metaGames[2])).toBe("team-b");
    expect(
      winningTeamId({
        ...metaGames[0],
        teamARounds: 12,
        teamBRounds: 12,
      }),
    ).toBeNull();
  });

  it("computes team map win% and pick%", () => {
    const rows = aggregateTeamMapStats(metaGames);
    const alpha = rows.find((r) => r.teamId === "team-a");
    expect(alpha).toBeTruthy();
    expect(alpha!.totalMaps).toBe(4);

    const ascent = alpha!.maps.find((m) => m.mapName === "Ascent");
    expect(ascent?.played).toBe(2);
    expect(ascent?.wins).toBe(2);
    expect(ascent?.winRate).toBe(100);
    expect(ascent?.pickRate).toBe(50);

    const bind = alpha!.maps.find((m) => m.mapName === "Bind");
    expect(bind?.played).toBe(2);
    expect(bind?.wins).toBe(1);
    expect(bind?.winRate).toBe(50);
  });

  it("ranks map agents/comps with sample floor", () => {
    const maps = aggregateMapMeta(metaGames, 2);
    const ascent = maps.find((m) => m.mapName === "Ascent");
    expect(ascent?.games).toBe(2);
    expect(ascent?.pickRate).toBe(50);
    // Agents with ≥2 appearances on Ascent should appear
    expect(ascent!.agents.every((a) => a.appearances >= 2)).toBe(true);
    expect(ascent!.comps.every((c) => c.appearances >= 2)).toBe(true);
  });

  it("awards Flex to a player who spanned all four roles", () => {
    const standouts = aggregateRoleStandouts(metaGames, metaEligibility);
    // Flex#001 played Jett / Sova / Omen / Cypher — one agent in each role.
    expect(standouts.bestFlex?.riotId).toBe("Flex#001");
    expect(standouts.bestOverall).toBeTruthy();
    expect(standouts.byRole.Initiator).toBeTruthy();
  });

  it("weightedAcs favours quality over volume, but tempers tiny samples", () => {
    const baseline = { meanGamesPlayed: 6, meanAcs: 220 };

    // Volume alone must not win: 300 over 3 games beats 200 over 15.
    expect(weightedAcs(300, 3, baseline)).toBeGreaterThan(
      weightedAcs(200, 15, baseline),
    );
    // ...but a 2-game spike must not beat a strong full tournament.
    expect(weightedAcs(300, 2, baseline)).toBeLessThan(
      weightedAcs(280, 15, baseline),
    );
    // Prior is capped, so a clear 5-game run beats a mediocre longer one.
    expect(weightedAcs(280, 5, baseline)).toBeGreaterThan(
      weightedAcs(190, 6, baseline),
    );
    // Result stays in ACS units and converges on the true average.
    expect(weightedAcs(300, 200, baseline)).toBeCloseTo(298.9, 0);
    expect(weightedAcs(250, 0, baseline)).toBe(0);
  });

  it("crossCupRating rewards a consistent 3-4 cup run over a one-cup spike", () => {
    const mean = 230;
    const spike = crossCupRating([300], mean);
    const fourCups = crossCupRating([250, 250, 250, 250], mean);
    const threeCups = crossCupRating([240, 245, 242], mean);
    const grind = crossCupRating([200, 200, 200, 200], mean);

    expect(fourCups).toBeGreaterThan(spike);
    expect(threeCups).toBeGreaterThan(spike);
    // A long 200 ACS grind still should not beat a real 300 cup.
    expect(grind).toBeLessThan(spike);
    expect(crossCupRating([], mean)).toBe(0);
  });

  it("rankCrossCupPlayers puts a 4-cup 250 run above a 1-cup 300, and still lists the spike", () => {
    const field = (suffix: string, avgAcs: number) => ({
      key: `user:${suffix}`,
      riotId: `${suffix}#001`,
      userName: suffix,
      gamesPlayed: 5,
      totalRounds: 100,
      totalKills: 40,
      totalDeaths: 35,
      totalAssists: 15,
      totalFirstKills: 4,
      totalFirstDeaths: 4,
      avgAcs,
      avgAdr: 140,
      avgHsPercent: 22,
      mostPlayedAgent: "Jett",
      agentCounts: { Jett: 5 },
      teamNames: ["Field"],
      mvpCount: 0,
    });

    const spike = field("Spike", 300);
    const steady = field("Steady", 250);
    const filler = field("Filler", 220);

    const ranked = rankCrossCupPlayers([
      [spike, { ...steady, avgAcs: 248 }, filler],
      [{ ...steady, avgAcs: 252 }, filler],
      [{ ...steady, avgAcs: 246 }, filler],
      [{ ...steady, avgAcs: 251 }, filler],
    ]);

    expect(ranked[0]?.key).toBe("user:Steady");
    expect(ranked[0]?.tournamentsPlayed).toBe(4);
    const spikeRow = ranked.find((p) => p.key === "user:Spike");
    expect(spikeRow).toBeTruthy();
    expect(spikeRow?.tournamentsPlayed).toBe(1);
    expect(ranked.findIndex((p) => p.key === "user:Spike")).toBeGreaterThan(0);
  });

  it("computeStandoutBaseline weights the mean ACS by appearances", () => {
    const baseline = computeStandoutBaseline([
      { avgAcs: 300, gamesPlayed: 1 },
      { avgAcs: 200, gamesPlayed: 9 },
    ]);
    expect(baseline.meanGamesPlayed).toBe(5);
    // 210, not the 250 a naive per-player average would give.
    expect(baseline.meanAcs).toBe(210);
    expect(computeStandoutBaseline([]).meanAcs).toBe(0);
  });

  it("dynamicGamesThreshold scales with the cup and never empties a card", () => {
    expect(dynamicGamesThreshold([{ gamesPlayed: 19 }])).toBe(4);
    expect(dynamicGamesThreshold([{ gamesPlayed: 7 }])).toBe(2);
    // Clamped to the pool max, so a 1-game pool still yields a winner.
    expect(dynamicGamesThreshold([{ gamesPlayed: 1 }])).toBe(1);
    expect(dynamicGamesThreshold([])).toBe(0);
  });

  it("agentAwardGamesThreshold stays soft and never DQ's solid mid-samples", () => {
    const pool = [{ gamesPlayed: 6 }, { gamesPlayed: 5 }, { gamesPlayed: 2 }];
    // Rare: allow low GP even if the pool could support a higher floor.
    expect(agentAwardGamesThreshold(4, pool)).toBe(2);
    expect(agentAwardGamesThreshold(3, [{ gamesPlayed: 1 }])).toBe(1);
    // Popular: modest bump, capped so a 5-game Clove run still qualifies.
    expect(agentAwardGamesThreshold(30, pool)).toBe(3);
    expect(agentAwardGamesThreshold(40, [{ gamesPlayed: 3 }])).toBe(3);
    expect(agentAwardGamesThreshold(20, [])).toBe(0);
  });

  it("awards popular agents to the stronger ACS sample, not just more games", () => {
    const elig: TournamentStatsEligibility = {
      byUserId: {
        good: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        bad: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        fill: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        opp: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };

    // 12 Clove picks → popular agent. Good plays 5 strong games; Bad plays 6 weak.
    const games: StatsGame[] = [];
    for (let i = 0; i < 6; i++) {
      games.push({
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 5,
        mapName: "Ascent",
        mvpRiotId: null,
        players: [
          ...(i < 5
            ? [player("GoodClove#001", "team-a", "Clove", 290, "good")]
            : [player("Fill#001", "team-a", "Jett", 200, "fill")]),
          player("BadClove#001", "team-a", "Clove", 175, "bad"),
          player("Fill#002", "team-a", "Sova", 200, "fill"),
          player("Fill#003", "team-a", "Cypher", 200, "fill"),
          player("Fill#004", "team-a", "Raze", 200, "fill"),
          player("Opp#001", "team-b", "Omen", 180, "opp"),
        ],
      });
    }

    const clove = aggregateAgentStandouts(games, elig).find((a) => a.agent === "Clove");
    expect(clove?.totalPickCount).toBeGreaterThan(AGENT_RARE_PICK_CEILING);
    expect(clove?.bestPlayer?.riotId).toBe("GoodClove#001");
    expect(clove?.bestPlayer?.gamesPlayedOnAgent).toBe(5);
  });

  it("ranks standouts fairly: not pure GP, not pure one-off ACS", () => {
    const games: StatsGame[] = [
      {
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 5,
        mapName: "Ascent",
        mvpRiotId: null,
        players: [
          player("Solid#001", "team-a", "Jett", 280, "u1"),
          player("OneOff#001", "team-a", "Raze", 400, "u2"),
          player("Grind#001", "team-a", "Phoenix", 180, "u8"),
          player("Fill#001", "team-a", "Omen", 200, "u3"),
          player("Fill#002", "team-a", "Sova", 200, "u4"),
          player("Opp#001", "team-b", "Neon", 180, "u6"),
        ],
      },
      {
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 8,
        mapName: "Bind",
        mvpRiotId: null,
        players: [
          player("Solid#001", "team-a", "Jett", 275, "u1"),
          player("Grind#001", "team-a", "Phoenix", 175, "u8"),
          player("Fill#001", "team-a", "Omen", 200, "u3"),
          player("Fill#002", "team-a", "Sova", 200, "u4"),
          player("Fill#003", "team-a", "Cypher", 200, "u5"),
          player("Opp#001", "team-b", "Neon", 180, "u6"),
        ],
      },
      {
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 9,
        mapName: "Haven",
        mvpRiotId: null,
        players: [
          player("Solid#001", "team-a", "Jett", 285, "u1"),
          player("Grind#001", "team-a", "Phoenix", 185, "u8"),
          player("Fill#001", "team-a", "Omen", 200, "u3"),
          player("Fill#002", "team-a", "Sova", 200, "u4"),
          player("Fill#003", "team-a", "Cypher", 200, "u5"),
          player("Opp#001", "team-b", "Neon", 180, "u6"),
        ],
      },
      {
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 10,
        mapName: "Split",
        mvpRiotId: null,
        players: [
          player("Grind#001", "team-a", "Phoenix", 170, "u8"),
          player("Fill#001", "team-a", "Omen", 200, "u3"),
          player("Fill#002", "team-a", "Sova", 200, "u4"),
          player("Fill#003", "team-a", "Cypher", 200, "u5"),
          player("Fill#004", "team-a", "Sage", 190, "u7"),
          player("Opp#001", "team-b", "Neon", 180, "u6"),
        ],
      },
      {
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 11,
        mapName: "Lotus",
        mvpRiotId: null,
        players: [
          player("Grind#001", "team-a", "Phoenix", 190, "u8"),
          player("Fill#001", "team-a", "Omen", 200, "u3"),
          player("Fill#002", "team-a", "Sova", 200, "u4"),
          player("Fill#003", "team-a", "Cypher", 200, "u5"),
          player("Fill#004", "team-a", "Sage", 190, "u7"),
          player("Opp#001", "team-b", "Neon", 180, "u6"),
        ],
      },
    ];

    const elig: TournamentStatsEligibility = {
      byUserId: {
        u1: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u2: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u3: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u4: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u5: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u6: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
        u7: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u8: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };

    const standouts = aggregateRoleStandouts(games, elig);
    // Solid ~280 ACS × 3 games beats OneOff 400×1 and Grind ~180×5
    expect(standouts.byRole.Duelist?.riotId).toBe("Solid#001");
    expect(standouts.byRole.Duelist?.gamesPlayed).toBe(3);

    const agents = aggregateAgentStandouts(games, elig);
    expect(agents.find((a) => a.agent === "Jett")?.bestPlayer?.riotId).toBe("Solid#001");
  });
});

describe("agent standout baseline", () => {
  it("measures the baseline over qualified players only", () => {
    // Jett pool: two genuine contenders plus a low-ACS regular, and ten
    // one-game cameos that sit below the games threshold. The cameos are
    // excluded from contention either way — the question is whether they are
    // allowed to drag the benchmark the contenders are scored against.
    //
    // Baseline over qualified players only (current): Grind 181.9 > Spike 173.3.
    // Baseline over everyone (previous): the 300 ACS cameos lift the mean to
    // ~208, which flatters the low-games player and flips it to Spike 214.1.
    const games: StatsGame[] = [];
    for (let i = 0; i < 8; i++) {
      const players = [
        player("Grind#001", "team-a", "Jett", 200, "grind"),
        player("Anchor#001", "team-b", "Jett", 100, "anchor"),
      ];
      if (i < 2) {
        players.push(player("Spike#001", "team-a", "Jett", 220, "spike"));
      }
      if (i < 5) {
        players.push(
          player(`Cameo#${i}a`, "team-b", "Jett", 300, `cameo-${i}a`),
          player(`Cameo#${i}b`, "team-b", "Jett", 300, `cameo-${i}b`),
        );
      }
      games.push({
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        teamARounds: 13,
        teamBRounds: 10,
        mapName: "Ascent",
        mvpRiotId: null,
        players,
      });
    }

    const byUserId: TournamentStatsEligibility["byUserId"] = {
      grind: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
      spike: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
      anchor: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
    };
    for (let i = 0; i < 5; i++) {
      byUserId[`cameo-${i}a`] = [{ teamId: "team-b", kind: "PRIMARY", since: null }];
      byUserId[`cameo-${i}b`] = [{ teamId: "team-b", kind: "PRIMARY", since: null }];
    }
    const elig: TournamentStatsEligibility = { byUserId, byRiotId: {} };

    const jett = aggregateAgentStandouts(games, elig).find((a) => a.agent === "Jett");
    expect(jett?.bestPlayer?.riotId).toBe("Grind#001");
    expect(jett?.bestPlayer?.gamesPlayedOnAgent).toBe(8);
  });
});

describe("best flex eligibility", () => {
  it("requires one agent in every role", () => {
    // One agent per role is enough, however few games each took.
    expect(
      qualifiesFlex({ Jett: 1, Sova: 1, Omen: 1, Cypher: 1 }),
    ).toBe(true);

    // Three roles is no longer enough — this player never played Sentinel.
    expect(qualifiesFlex({ Clove: 1, Raze: 1, Sova: 2 })).toBe(false);
  });

  it("counts roles, not agents, so a one-role specialist never qualifies", () => {
    // Plenty of agents and games, but all Duelists.
    expect(qualifiesFlex({ Jett: 4, Raze: 3, Reyna: 2, Yoru: 2 })).toBe(false);
    expect(distinctRolesPlayed({ Jett: 4, Raze: 3, Reyna: 2 })).toEqual([
      "Duelist",
    ]);
  });

  it("priority score prefers Initiator → Controller → Sentinel → Duelist", () => {
    const initCtrlSent = flexPriorityScore({
      Sova: 1,
      Fade: 1,
      Omen: 1,
      Viper: 1,
      Cypher: 1,
      Sage: 1,
    });
    const ctrlSentDuel = flexPriorityScore({
      Omen: 1,
      Viper: 1,
      Cypher: 1,
      Sage: 1,
      Jett: 1,
      Raze: 1,
    });
    expect(initCtrlSent).toBeGreaterThan(ctrlSentDuel);
  });

  it("picks full-Flex player when present and keeps them on Flex", () => {
    const elig: TournamentStatsEligibility = {
      byUserId: {
        u1: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u2: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u3: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u4: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u5: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u6: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };

    const flexAgents = [
      "Jett",
      "Reyna",
      "Sova",
      "Fade",
      "Omen",
      "Viper",
      "Cypher",
      "Sage",
    ];
    const flexGames: StatsGame[] = flexAgents.map((agent) => ({
      teamAId: "team-a",
      teamBId: "team-b",
      teamAName: "Alpha",
      teamBName: "Bravo",
      teamARounds: 13,
      teamBRounds: 5,
      mapName: "Ascent",
      mvpRiotId: null,
      players: [
        player("FullFlex#001", "team-a", agent, 270, "u1"),
        player("Fill#002", "team-a", "Breach", 200, "u2"),
        player("Fill#003", "team-a", "Astra", 200, "u3"),
        player("Fill#004", "team-a", "Killjoy", 200, "u4"),
        player("Fill#005", "team-a", "Chamber", 200, "u5"),
        player("Opp#001", "team-b", "Neon", 180, "u6"),
      ],
    }));

    const standouts = aggregateRoleStandouts(flexGames, elig);
    // Flex is awarded first and kept; role cards take the next player.
    // Agent awards are independent — Flex winners may still win Best Sova, etc.
    expect(standouts.bestFlex?.riotId).toBe("FullFlex#001");
    expect(standouts.byRole.Duelist?.riotId).not.toBe("FullFlex#001");
    expect(standouts.bestOverall?.riotId).toBe("FullFlex#001");

    const sova = aggregateAgentStandouts(flexGames, elig).find(
      (a) => a.agent === "Sova",
    );
    expect(sova?.bestPlayer?.riotId).toBe("FullFlex#001");
  });

  it("keeps Flex first; role cards take the next player; Overall may overlap", () => {
    const elig: TournamentStatsEligibility = {
      byUserId: {
        star: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        flex2: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        duel: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        ctrl: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        sent: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        opp: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };

    // Star spans all four roles (keeps Flex). Flex2 is a full-flex backup with
    // ≥3 Initiator maps so they take Best Initiator after Star is claimed.
    const maps: Array<{ star: string; flex2: string; duel: string; ctrl: string; sent: string }> = [
      { star: "Jett", flex2: "Sova", duel: "Raze", ctrl: "Omen", sent: "Cypher" },
      { star: "Sova", flex2: "Sova", duel: "Raze", ctrl: "Viper", sent: "Killjoy" },
      { star: "Omen", flex2: "Fade", duel: "Phoenix", ctrl: "Astra", sent: "Sage" },
      { star: "Cypher", flex2: "Breach", duel: "Neon", ctrl: "Brimstone", sent: "Chamber" },
    ];

    const games: StatsGame[] = maps.map((m, i) => ({
      teamAId: "team-a",
      teamBId: "team-b",
      teamAName: "Alpha",
      teamBName: "Bravo",
      teamARounds: 13,
      teamBRounds: 5,
      mapName: ["Ascent", "Bind", "Haven", "Lotus"][i]!,
      mvpRiotId: null,
      players: [
        player("Star#001", "team-a", m.star, 300, "star"),
        player("Flex2#001", "team-a", m.flex2, 220, "flex2"),
        player("Duel#001", "team-a", m.duel, 290, "duel"),
        player("Ctrl#001", "team-a", m.ctrl, 270, "ctrl"),
        player("Sent#001", "team-a", m.sent, 265, "sent"),
        player("Opp#001", "team-b", "Reyna", 180, "opp"),
      ],
    }));

    const standouts = aggregateRoleStandouts(games, elig);
    expect(standouts.bestFlex?.riotId).toBe("Star#001");
    expect(standouts.byRole.Initiator?.riotId).toBe("Flex2#001");

    const exclusive = [
      standouts.byRole.Duelist?.riotId,
      standouts.byRole.Initiator?.riotId,
      standouts.byRole.Controller?.riotId,
      standouts.byRole.Sentinel?.riotId,
      standouts.bestFlex?.riotId,
    ].filter(Boolean);
    expect(new Set(exclusive).size).toBe(exclusive.length);
  });

  it("prefers higher assists when ranking Initiators (role and agent)", () => {
    const elig: TournamentStatsEligibility = {
      byUserId: {
        frag: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        setup: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        fill: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        opp: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };

    const games: StatsGame[] = [0, 1, 2, 3].map(() => ({
      teamAId: "team-a",
      teamBId: "team-b",
      teamAName: "Alpha",
      teamBName: "Bravo",
      teamARounds: 13,
      teamBRounds: 5,
      mapName: "Ascent",
      mvpRiotId: null,
      players: [
        // Slightly higher ACS, low assists
        player("FragInit#001", "team-a", "Sova", 255, "frag", 3),
        // Slightly lower ACS, high assists — Initiator model favors setup
        player("SetupInit#001", "team-a", "Sova", 248, "setup", 16),
        player("Fill#001", "team-a", "Jett", 200, "fill"),
        player("Fill#002", "team-a", "Omen", 200, "fill"),
        player("Fill#003", "team-a", "Cypher", 200, "fill"),
        player("Opp#001", "team-b", "Raze", 180, "opp"),
      ],
    }));

    expect(initiatorAssistBoost(16, 1)).toBeGreaterThan(initiatorAssistBoost(3, 1));

    const standouts = aggregateRoleStandouts(games, elig);
    expect(standouts.byRole.Initiator?.riotId).toBe("SetupInit#001");

    const sova = aggregateAgentStandouts(games, elig).find((a) => a.agent === "Sova");
    expect(sova?.bestPlayer?.riotId).toBe("SetupInit#001");
  });

  it("withholds the award from a 3-role player, however much they play", () => {
    const elig: TournamentStatsEligibility = {
      byUserId: {
        u1: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u2: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u3: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u4: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u5: [{ teamId: "team-a", kind: "PRIMARY", since: null }],
        u6: [{ teamId: "team-b", kind: "PRIMARY", since: null }],
      },
      byRiotId: {},
    };

    // 3-of-4: Initiator, Controller, Sentinel (no Duelist) — priority-aligned
    const fallbackAgents = ["Sova", "Fade", "Omen", "Viper", "Cypher", "Sage"];
    const makeGame = (agent: string, i: number): StatsGame => ({
      teamAId: "team-a",
      teamBId: "team-b",
      teamAName: "Alpha",
      teamBName: "Bravo",
      teamARounds: 13,
      teamBRounds: 5,
      mapName: "Ascent",
      mvpRiotId: null,
      players: [
        player("AlmostFlex#001", "team-a", agent, 265, "u1"),
        player("Fill#002", "team-a", "Breach", 200, "u2"),
        player("Fill#003", "team-a", "Astra", 200, "u3"),
        player("Fill#004", "team-a", "Killjoy", 200, "u4"),
        player("Fill#005", "team-a", "Chamber", 200, "u5"),
        player("Opp#001", "team-b", "Neon", 180, "u6"),
      ],
    });

    // 6 agents across Initiator/Controller/Sentinel, but no Duelist.
    const smallCup = fallbackAgents.map((a, i) => makeGame(a, i));
    expect(aggregateRoleStandouts(smallCup, elig).bestFlex).toBeNull();

    // Volume does not substitute for the missing role.
    const longCup: StatsGame[] = [];
    for (let i = 0; i < 30; i++) {
      longCup.push(makeGame(fallbackAgents[i % fallbackAgents.length], i));
    }
    expect(aggregateRoleStandouts(longCup, elig).bestFlex).toBeNull();
  });
});

describe("buildPlayerStatsCsv", () => {
  it("exports agent names and teams (including poach), not icons", () => {
    const players = aggregatePlayerStats(
      [
        {
          teamAId: "team-a",
          teamBId: "team-b",
          teamAName: "Alpha",
          teamBName: "Bravo",
          teamARounds: 13,
          teamBRounds: 7,
          mapName: "Ascent",
          mvpRiotId: "poach#001",
          startedAt: "2026-07-20T12:00:00.000Z",
          players: [
            {
              riotId: "poach#001",
              userId: "user-1",
              userName: "Poach Player",
              teamId: "team-a",
              agent: "Jett",
              kills: 20,
              deaths: 10,
              assists: 5,
              acs: 280,
              adr: 160,
              hsPercent: 30,
              firstKills: 2,
              firstDeaths: 1,
            },
          ],
        },
        {
          teamAId: "team-a",
          teamBId: "team-b",
          teamAName: "Alpha",
          teamBName: "Bravo",
          teamARounds: 13,
          teamBRounds: 9,
          mapName: "Bind",
          mvpRiotId: null,
          startedAt: "2026-08-02T12:00:00.000Z",
          players: [
            {
              riotId: "poach#001",
              userId: "user-1",
              userName: "Poach Player",
              teamId: "team-b",
              agent: "Omen",
              kills: 15,
              deaths: 12,
              assists: 8,
              acs: 220,
              adr: 140,
              hsPercent: 25,
              firstKills: 1,
              firstDeaths: 2,
            },
          ],
        },
      ],
      { eligibility },
    );

    expect(formatAgentsPlayed(players[0]!.agentCounts)).toContain("Jett");
    expect(formatAgentsPlayed(players[0]!.agentCounts)).toContain("Omen");

    const csv = buildPlayerStatsCsv(players);
    expect(csv).toContain("Teams");
    expect(csv).toContain("Agents Played");
    expect(csv).toContain("Alpha");
    expect(csv).toContain("Bravo");
    expect(csv).toMatch(/Jett \(\d+\)/);
    expect(csv).not.toContain("http");
    expect(csv).not.toContain(".png");
  });
});
