import { describe, expect, it } from "vitest";
import type { TournamentDetail } from "@core/contracts";

function minimalDetail(overrides: Partial<TournamentDetail> = {}): TournamentDetail {
  return {
    id: "1",
    slug: "fc26-cup-1",
    name: "FC26 Cup 1",
    game: "EA_FC26",
    gameLabel: "EA FC 26",
    registrationFormat: null,
    status: "REGISTRATION_OPEN",
    description: null,
    posterUrl: null,
    startsAt: null,
    endsAt: null,
    prizePool: null,
    prizeNotes: null,
    prizeSplit: null,
    registrationOpen: true,
    registrationOpensAt: null,
    registrationClosesAt: null,
    bracketUrl: null,
    rulebookUrl: null,
    teams: [],
    teamDetails: [],
    placements: [],
    matches: [],
    registrationCount: 0,
    userRegistered: false,
    userParticipantRole: null,
    coCaptainSlots: 0,
    ...overrides,
  };
}

describe("mergeTournamentDetail", () => {
  it("returns DB detail unchanged (no static overlay)", async () => {
    const { mergeTournamentDetail } = await import("@/lib/tournament-static-detail");

    const detail = minimalDetail({ teams: ["Real Team"] });
    const merged = mergeTournamentDetail(detail);
    expect(merged).toEqual(detail);
    expect(merged.teams).toEqual(["Real Team"]);
  });

  it("does not inject placeholder teams when DB is empty", async () => {
    const { mergeTournamentDetail, STATIC_TOURNAMENT_DETAIL } = await import(
      "@/lib/tournament-static-detail"
    );

    const merged = mergeTournamentDetail(minimalDetail());
    expect(merged.teams).toEqual([]);
    expect(Object.keys(STATIC_TOURNAMENT_DETAIL)).toHaveLength(0);
  });
});
