import { describe, expect, it } from "vitest";
import {
  buildCorroboratedMatchIndex,
  clusterMatchSeries,
  computeAcs,
  computeAdr,
  computeHsPercent,
  countFirstKillDeaths,
  countTeamPresence,
  extractKillEventsFromMatchPayload,
  filterMatchesByDateRange,
  isCommonCustomMatch,
  normalizeGameSide,
  partitionPlayersByCupTeam,
  rankCorroboratedMatches,
  resolveGamePlayerTeamId,
  resolveTeamSideMajority,
} from "@/lib/tournament-games";

describe("tournament-games helpers", () => {
  it("counts roster presence in a lobby", () => {
    const team = new Set(["a", "b", "c", "d", "e"]);
    const lobby = new Set(["a", "c", "x", "y"]);
    expect(countTeamPresence(team, lobby)).toBe(2);
  });

  it("detects a common custom when both teams meet the threshold", () => {
    const teamA = new Set(["a1", "a2", "a3", "a4", "a5"]);
    const teamB = new Set(["b1", "b2", "b3", "b4", "b5"]);
    const lobby = new Set(["a1", "a2", "a3", "a4", "a5", "b1", "b2", "b3", "b4", "b5"]);
    const result = isCommonCustomMatch({
      teamAPuuids: teamA,
      teamBPuuids: teamB,
      lobbyPuuids: lobby,
      minPlayersPerTeam: 5,
    });
    expect(result).toEqual({ match: true, teamAPresent: 5, teamBPresent: 5 });
  });

  it("rejects lobbies below min players per team", () => {
    const teamA = new Set(["a1", "a2", "a3", "a4", "a5"]);
    const teamB = new Set(["b1", "b2", "b3", "b4", "b5"]);
    const lobby = new Set(["a1", "a2", "a3", "a4", "b1", "b2", "b3", "b4"]);
    const result = isCommonCustomMatch({
      teamAPuuids: teamA,
      teamBPuuids: teamB,
      lobbyPuuids: lobby,
      minPlayersPerTeam: 5,
    });
    expect(result.match).toBe(false);
    expect(result.teamAPresent).toBe(4);
    expect(result.teamBPresent).toBe(4);
  });

  it("computes ACS / ADR / HS%", () => {
    expect(computeAcs(2770, 19)).toBe(146);
    expect(computeAdr(3230, 19)).toBe(170);
    expect(computeHsPercent(17, 28, 3)).toBe(35.42);
    expect(computeAcs(100, 0)).toBe(0);
    expect(computeHsPercent(0, 0, 0)).toBe(0);
  });

  it("counts first kills and first deaths from earliest kill per round", () => {
    const counts = countFirstKillDeaths([
      {
        round: 0,
        kill_time_in_round: 4000,
        killer_puuid: "a",
        victim_puuid: "b",
      },
      {
        round: 0,
        kill_time_in_round: 1200,
        killer_puuid: "c",
        victim_puuid: "d",
      },
      {
        round: 1,
        kill_time_in_round: 800,
        killer_puuid: "a",
        victim_puuid: "d",
      },
    ]);
    expect(counts.get("c")).toEqual({ firstKills: 1, firstDeaths: 0 });
    expect(counts.get("d")).toEqual({ firstKills: 0, firstDeaths: 2 });
    expect(counts.get("a")).toEqual({ firstKills: 1, firstDeaths: 0 });
    expect(counts.get("b")).toBeUndefined();
  });

  it("extracts kills from Henrik payload envelope", () => {
    const kills = extractKillEventsFromMatchPayload({
      data: {
        kills: [
          {
            round: 2,
            kill_time_in_round: 500,
            killer_puuid: "x",
            victim_puuid: "y",
          },
        ],
      },
    });
    expect(countFirstKillDeaths(kills).get("x")?.firstKills).toBe(1);
  });

  it("normalizes sides and majority side for a roster", () => {
    expect(normalizeGameSide("red")).toBe("Red");
    expect(normalizeGameSide("BLUE")).toBe("Blue");
    expect(normalizeGameSide("other")).toBeNull();

    const side = resolveTeamSideMajority(new Set(["p1", "p2", "p3"]), [
      { puuid: "p1", team: "Red" },
      { puuid: "p2", team: "Red" },
      { puuid: "p3", team: "Blue" },
      { puuid: "x", team: "Blue" },
    ]);
    expect(side).toBe("Red");
  });

  it("places unknown lobby players on the correct cup team by in-game side", () => {
    const teamAId = "cup-a";
    const teamBId = "cup-b";
    const players = [
      { id: "1", teamId: teamAId, side: "Red" as const, riotId: "a#1" },
      { id: "2", teamId: teamAId, side: "Red" as const, riotId: "b#2" },
      { id: "3", teamId: teamAId, side: "Red" as const, riotId: "c#3" },
      { id: "4", teamId: teamAId, side: "Red" as const, riotId: "d#4" },
      { id: "5", teamId: null, side: "Red" as const, riotId: "sub#alt" },
      { id: "6", teamId: teamBId, side: "Blue" as const, riotId: "e#5" },
      { id: "7", teamId: teamBId, side: "Blue" as const, riotId: "f#6" },
      { id: "8", teamId: teamBId, side: "Blue" as const, riotId: "g#7" },
      { id: "9", teamId: teamBId, side: "Blue" as const, riotId: "h#8" },
      { id: "10", teamId: teamBId, side: "Blue" as const, riotId: "i#9" },
    ];

    const { teamA, teamB } = partitionPlayersByCupTeam(players, teamAId, teamBId);
    expect(teamA).toHaveLength(5);
    expect(teamB).toHaveLength(5);
    expect(teamA.some((p) => p.riotId === "sub#alt")).toBe(true);
  });

  it("attributes dual-roster (primary + poach) players by in-game side", () => {
    const teamAId = "cup-a";
    const teamBId = "cup-b";
    const teamAPuuids = new Set(["poach", "a2", "a3", "a4", "a5"]);
    const teamBPuuids = new Set(["poach", "b2", "b3", "b4", "b5"]);

    expect(
      resolveGamePlayerTeamId({
        puuid: "poach",
        side: "Blue",
        teamAId,
        teamBId,
        teamAPuuids,
        teamBPuuids,
        teamASide: "Red",
        rosterTeamId: teamBId,
      }),
    ).toBe(teamBId);

    expect(
      resolveGamePlayerTeamId({
        puuid: "poach",
        side: "Red",
        teamAId,
        teamBId,
        teamAPuuids,
        teamBPuuids,
        teamASide: "Red",
        rosterTeamId: teamBId,
      }),
    ).toBe(teamAId);
  });

  it("builds corroborated index and ranks cross-team matches", () => {
    const teamA = new Set(["a1", "a2"]);
    const teamB = new Set(["b1", "b2"]);
    const rows = [
      { matchId: "m1", mapName: "Lotus", startedAtMs: 1000, scannerPuuid: "a1" },
      { matchId: "m1", mapName: "Lotus", startedAtMs: 1000, scannerPuuid: "b1" },
      { matchId: "m1", mapName: "Lotus", startedAtMs: 1000, scannerPuuid: "a2" },
      { matchId: "m2", mapName: "Bind", startedAtMs: 2000, scannerPuuid: "a1" },
      { matchId: "m3", mapName: "Ascent", startedAtMs: 3000, scannerPuuid: "b1" },
      { matchId: "m3", mapName: "Ascent", startedAtMs: 3000, scannerPuuid: "b2" },
    ];

    const index = buildCorroboratedMatchIndex(rows, teamA, teamB);
    const ranked = rankCorroboratedMatches(index);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].matchId).toBe("m1");
    expect(ranked[0].teamAHits).toBe(2);
    expect(ranked[0].teamBHits).toBe(1);
  });

  it("filters corroborated matches by date range", () => {
    const previews = [
      { matchId: "m1", mapName: "Lotus", startedAt: "2026-09-05T12:00:00.000Z", teamAHits: 2, teamBHits: 2 },
      { matchId: "m2", mapName: "Bind", startedAt: "2026-09-06T12:00:00.000Z", teamAHits: 1, teamBHits: 1 },
      { matchId: "m3", mapName: "Ascent", startedAt: "2026-09-07T12:00:00.000Z", teamAHits: 3, teamBHits: 3 },
    ];

    const filtered = filterMatchesByDateRange(previews, "2026-09-06", "2026-09-06");
    expect(filtered.map((p) => p.matchId)).toEqual(["m2"]);
  });

  it("clusters matches into BO5-style series within a time window", () => {
    const base = Date.parse("2026-09-06T17:00:00.000Z");
    const hour = 60 * 60 * 1000;
    const previews = [
      { matchId: "m1", mapName: "Lotus", startedAt: new Date(base).toISOString(), teamAHits: 2, teamBHits: 2 },
      { matchId: "m2", mapName: "Bind", startedAt: new Date(base + hour).toISOString(), teamAHits: 2, teamBHits: 2 },
      { matchId: "m3", mapName: "Ascent", startedAt: new Date(base + 5 * hour).toISOString(), teamAHits: 2, teamBHits: 2 },
    ];

    const groups = clusterMatchSeries(previews, 4 * hour);
    expect(groups).toHaveLength(2);
    expect(groups[0].matchIds).toEqual(["m1", "m2"]);
    expect(groups[0].maps).toEqual(["Lotus", "Bind"]);
    expect(groups[1].matchIds).toEqual(["m3"]);
  });
});
