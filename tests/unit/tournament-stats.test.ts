import { describe, expect, it } from "vitest";
import {
  aggregateAgentStandouts,
  aggregateMapMeta,
  aggregatePlayerStats,
  aggregateRoleStandouts,
  aggregateTeamMapStats,
  fairStandoutScore,
  isStatsAppearanceEligible,
  normalizeCompKey,
  statsPlayerKey,
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

  it("detects Flex as players who covered all four roles", () => {
    const standouts = aggregateRoleStandouts(metaGames, metaEligibility);
    expect(standouts.bestFlex?.riotId).toBe("Flex#001");
    expect(standouts.bestOverall).toBeTruthy();
    expect(standouts.byRole.Initiator).toBeTruthy();
  });

  it("fairStandoutScore balances ACS with sample size", () => {
    // 1-game spike tempered; solid multi-game stretch scores higher
    expect(fairStandoutScore(400, 1)).toBeLessThan(fairStandoutScore(230, 3));
    // Strong 3-game > weak 5-game
    expect(fairStandoutScore(280, 3)).toBeGreaterThan(fairStandoutScore(180, 5));
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
