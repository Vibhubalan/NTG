import { describe, expect, it } from "vitest";
import { isCommonCustomMatch } from "@/lib/tournament-games";
import {
  isValidValorant5v5TeammateCount,
  splitSnapshotRiotId,
  VALORANT_5V5_MAX_TEAMMATES,
} from "@/lib/valorant-team-roster";

describe("valorant 5v5 roster helpers", () => {
  it("requires 4 teammates and allows one optional sub", () => {
    expect(isValidValorant5v5TeammateCount(3)).toBe(false);
    expect(isValidValorant5v5TeammateCount(4)).toBe(true);
    expect(isValidValorant5v5TeammateCount(5)).toBe(true);
    expect(isValidValorant5v5TeammateCount(6)).toBe(false);
    expect(isValidValorant5v5TeammateCount(5, { allowSub: false })).toBe(false);
    expect(VALORANT_5V5_MAX_TEAMMATES).toBe(5);
  });

  it("splits snapshot Riot IDs for scan roster rows", () => {
    expect(splitSnapshotRiotId("manistalon04#0404")).toEqual({
      riotGameName: "manistalon04",
      riotTagLine: "0404",
    });
    expect(splitSnapshotRiotId(null)).toEqual({ riotGameName: null, riotTagLine: null });
  });

  it("matches a custom when 5 of 6 rostered players (sub on the bench) are in lobby", () => {
    const teamA = new Set(["a1", "a2", "a3", "a4", "a5", "a-sub"]);
    const teamB = new Set(["b1", "b2", "b3", "b4", "b5", "b-sub"]);
    const lobby = new Set(["a1", "a2", "a3", "a4", "a-sub", "b1", "b2", "b3", "b4", "b5"]);
    const result = isCommonCustomMatch({
      teamAPuuids: teamA,
      teamBPuuids: teamB,
      lobbyPuuids: lobby,
      minPlayersPerTeam: 5,
    });
    expect(result).toEqual({ match: true, teamAPresent: 5, teamBPresent: 5 });
  });

  it("still rejects a 5v5 scan when only 4 rostered players are present", () => {
    const teamA = new Set(["a1", "a2", "a3", "a4", "a5", "a-sub"]);
    const teamB = new Set(["b1", "b2", "b3", "b4", "b5"]);
    const lobby = new Set(["a1", "a2", "a3", "a4", "b1", "b2", "b3", "b4", "b5"]);
    const result = isCommonCustomMatch({
      teamAPuuids: teamA,
      teamBPuuids: teamB,
      lobbyPuuids: lobby,
      minPlayersPerTeam: 5,
    });
    expect(result.match).toBe(false);
    expect(result.teamAPresent).toBe(4);
  });
});
