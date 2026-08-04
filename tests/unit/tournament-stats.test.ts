import { describe, expect, it } from "vitest";
import {
  aggregateAgentStandouts,
  aggregateMapMeta,
  aggregatePlayerStats,
  aggregateRoleStandouts,
  aggregateTeamMapStats,
  computeStandoutBaseline,
  distinctRolesPlayed,
  dynamicGamesThreshold,
  flexPriorityScore,
  isStatsAppearanceEligible,
  normalizeCompKey,
  qualifiesFlex,
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
  it("keys appearances by riotId only", () => {
    expect(statsPlayerKey("Player#TAG")).toBe("player#tag");
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
) {
  return {
    riotId,
    userId: userId ?? null,
    teamId,
    agent,
    kills: Math.round(acs / 10),
    deaths: 10,
    assists: 5,
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
    // Result stays in ACS units and converges on the true average.
    expect(weightedAcs(300, 200, baseline)).toBeCloseTo(297.6, 0);
    expect(weightedAcs(250, 0, baseline)).toBe(0);
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

  it("picks full-Flex player when present", () => {
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
    expect(standouts.bestFlex?.riotId).toBe("FullFlex#001");
    expect(Object.keys(standouts.bestFlex!.agentCounts).length).toBe(8);
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
