import { describe, expect, it } from "vitest";
import {
  aggregateTeamScopedPlayerStats,
  statsPlayerKey,
} from "@/lib/tournament-stats";

describe("tournament-stats team scoping", () => {
  it("keys appearances by riotId + teamId", () => {
    expect(statsPlayerKey("Player#TAG", "team-a")).toBe("player#tag::team-a");
    expect(statsPlayerKey("Player#TAG", null)).toBe("player#tag::unknown");
  });

  it("keeps separate rows when the same player plays for two teams", () => {
    const rows = aggregateTeamScopedPlayerStats([
      {
        teamAId: "team-a",
        teamBId: "team-b",
        teamAName: "Alpha",
        teamBName: "Bravo",
        mvpRiotId: "Poach#001",
        players: [
          {
            riotId: "Poach#001",
            userName: "Poach",
            teamId: "team-a",
            agent: "Jett",
            kills: 20,
            deaths: 10,
            assists: 5,
            acs: 250,
            adr: 160,
            hsPercent: 25,
          },
          {
            riotId: "Other#002",
            teamId: "team-b",
            agent: "Sage",
            kills: 5,
            deaths: 12,
            assists: 8,
            acs: 140,
            adr: 110,
            hsPercent: 15,
          },
        ],
      },
      {
        teamAId: "team-b",
        teamBId: "team-c",
        teamAName: "Bravo",
        teamBName: "Charlie",
        mvpRiotId: null,
        players: [
          {
            riotId: "Poach#001",
            userName: "Poach",
            teamId: "team-b",
            agent: "Raze",
            kills: 18,
            deaths: 9,
            assists: 4,
            acs: 230,
            adr: 150,
            hsPercent: 22,
          },
        ],
      },
    ]);

    const poachRows = rows.filter((r) => r.riotId === "Poach#001");
    expect(poachRows).toHaveLength(2);
    expect(poachRows.map((r) => r.teamName).sort()).toEqual(["Alpha", "Bravo"]);

    const alpha = poachRows.find((r) => r.teamId === "team-a")!;
    const bravo = poachRows.find((r) => r.teamId === "team-b")!;
    expect(alpha.gamesPlayed).toBe(1);
    expect(alpha.totalKills).toBe(20);
    expect(alpha.mvpCount).toBe(1);
    expect(bravo.gamesPlayed).toBe(1);
    expect(bravo.totalKills).toBe(18);
    // Second game has no explicit MVP; Poach has the highest ACS on Bravo.
    expect(bravo.mvpCount).toBe(1);
  });
});
