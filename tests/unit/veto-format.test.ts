import { describe, expect, it } from "vitest";
import type { BracketRoundView, TournamentBracketView } from "@core/contracts/tournament-bracket";
import {
  DEFAULT_VETO_FORMATS,
  effectivePoolSize,
  parseVetoFormats,
  vetoesToRestart,
  vetoPoolError,
  vetoStageFor,
  type VetoStage,
} from "@/lib/veto-format";

const slot = { seed: null, name: "T", score: "", isWinner: false };
const round = (side: BracketRoundView["side"], roundNumber: number, ids: string[]): BracketRoundView => ({
  id: `${side}${roundNumber}`,
  label: "",
  side,
  roundNumber,
  matches: ids.map((id) => ({ id, matchNumber: null, state: "open", slots: [slot, slot] })),
});
const bracket = (
  tournamentType: string,
  rounds: BracketRoundView[],
  groups?: TournamentBracketView["groups"],
): TournamentBracketView => ({
  tournamentName: "cup",
  tournamentType,
  rounds,
  participants: [],
  finalStandings: [],
  groups,
  mvp: null,
  sourceUrl: null,
  fetchedAt: "",
});

describe("vetoStageFor", () => {
  it("single elim: early rounds, semis, final", () => {
    const b = bracket("single elimination", [
      round("winners", 1, ["q1", "q2", "q3", "q4"]),
      round("winners", 2, ["s1", "s2"]),
      round("winners", 3, ["f"]),
    ]);
    expect(vetoStageFor(b, "q3")).toBe("playoffs");
    expect(vetoStageFor(b, "s2")).toBe("semis");
    expect(vetoStageFor(b, "f")).toBe("final");
  });

  it("double elim: grand final is final; winners and losers finals are semis", () => {
    const b = bracket("double elimination", [
      round("winners", 1, ["w1"]),
      round("winners", 2, ["wf"]),
      round("losers", -1, ["l1"]),
      round("losers", -2, ["lf"]),
      round("final", 3, ["gf"]),
    ]);
    expect(vetoStageFor(b, "w1")).toBe("playoffs");
    expect(vetoStageFor(b, "wf")).toBe("semis");
    expect(vetoStageFor(b, "l1")).toBe("playoffs");
    expect(vetoStageFor(b, "lf")).toBe("semis");
    expect(vetoStageFor(b, "gf")).toBe("final");
  });

  it("group matches and round-robin matches are group stage", () => {
    const twoStage = bracket("single elimination", [round("winners", 1, ["f"])], [
      { id: "g", name: "Group A", standings: [], rounds: [round("winners", 1, ["g1"])] },
    ]);
    expect(vetoStageFor(twoStage, "g1")).toBe("group");
    expect(vetoStageFor(twoStage, "f")).toBe("final");
    expect(vetoStageFor(bracket("round robin", [round("winners", 1, ["rr"])]), "rr")).toBe("group");
  });

  it("returns null for a match outside the bracket", () => {
    expect(vetoStageFor(bracket("single elimination", [round("winners", 1, ["a"])]), "x")).toBeNull();
  });
});

describe("parseVetoFormats", () => {
  it("fills unset or invalid stages with the defaults", () => {
    expect(parseVetoFormats(null)).toEqual(DEFAULT_VETO_FORMATS);
    expect(parseVetoFormats({ group: "BO3", final: "BO7" })).toEqual({ ...DEFAULT_VETO_FORMATS, group: "BO3" });
  });
});

describe("vetoesToRestart", () => {
  it("restarts only live vetoes whose stage now maps to a different format", () => {
    const stages = new Map<string, VetoStage>([
      ["g", "group"],
      ["s", "semis"],
      ["f", "final"],
    ]);
    const live = [
      { challongeMatchId: "g", format: "BO1" as const },
      { challongeMatchId: "s", format: "BO3" as const },
      { challongeMatchId: "f", format: "BO5" as const },
      { challongeMatchId: "not-in-bracket", format: "BO1" as const },
    ];
    const next = { ...DEFAULT_VETO_FORMATS, semis: "BO5" as const, final: "BO3" as const };
    expect(vetoesToRestart(live, stages, next)).toEqual([
      { challongeMatchId: "s", format: "BO3", nextFormat: "BO5" },
      { challongeMatchId: "f", format: "BO5", nextFormat: "BO3" },
    ]);
  });
});

describe("vetoPoolError", () => {
  it("flags stages the pool is too small for", () => {
    expect(vetoPoolError(DEFAULT_VETO_FORMATS, 7)).toBeNull();
    expect(vetoPoolError(DEFAULT_VETO_FORMATS, 4)).toMatch(/^Finals \(BO5\) needs more than the 4 maps/);
    expect(effectivePoolSize(["Ascent"])).toBe(7);
  });
});
