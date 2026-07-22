import { describe, expect, it } from "vitest";
import { normalizeTeamName, resolveChampion } from "@/lib/tournament-champion";
import type { TournamentBracketView } from "@core/contracts/tournament-bracket";
import type { TournamentTeamView } from "@core/contracts";

describe("normalizeTeamName", () => {
  it("strips team/esports prefixes", () => {
    expect(normalizeTeamName("TEAM MANUJNATH")).toBe("manujnath");
    expect(normalizeTeamName("Manujnath")).toBe("manujnath");
    expect(normalizeTeamName("Indian Oil Esports")).toBe("indian oil");
  });
});

describe("resolveChampion", () => {
  const teams: TournamentTeamView[] = [
    {
      id: "t1",
      name: "Manujnath",
      seed: 1,
      logoUrl: null,
      players: [
        {
          id: "p1",
          displayName: "armaannazeer",
          riotId: null,
          participantRole: "CAPTAIN",
        },
        {
          id: "p2",
          displayName: "mate",
          riotId: null,
          participantRole: "PLAYER",
        },
      ],
    },
  ];

  const bracket: TournamentBracketView = {
    tournamentName: "FC26",
    tournamentType: "single elimination",
    rounds: [],
    participants: [],
    finalStandings: [
      { rank: 1, name: "TEAM MANUJNATH", record: "3-0" },
      { rank: 2, name: "Southhall", record: "0-3" },
    ],
    mvp: null,
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
  };

  it("fuzzy-matches Challonge winner to cup roster", () => {
    const result = resolveChampion(bracket, teams, teams.map((t) => t.name));
    expect(result?.championTeam.name).toBe("Manujnath");
    expect(result?.championTeam.players).toHaveLength(2);
    expect(result?.matchScore).toBe("3 - 0");
  });
});
