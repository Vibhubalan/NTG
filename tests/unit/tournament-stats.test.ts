import { describe, expect, it } from "vitest";
import {
  aggregatePlayerStats,
  isStatsAppearanceEligible,
  statsPlayerKey,
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
