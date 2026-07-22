import { describe, expect, it } from "vitest";
import {
  formatValorantActLabel,
  getActSeasonStats,
  isActSeasonRanked,
  parseValorantActSeasonKey,
  resolveCurrentActSeason,
} from "@/lib/valorant-act";

describe("formatValorantActLabel", () => {
  it("formats e12a3 style keys", () => {
    expect(formatValorantActLabel("e12a3")).toBe("Ep 12 · Act 3");
    expect(formatValorantActLabel("E11A2")).toBe("Ep 11 · Act 2");
  });

  it("formats s26a4 style keys", () => {
    expect(formatValorantActLabel("s26a4")).toBe("S26 · Act 4");
  });

  it("returns null for empty", () => {
    expect(formatValorantActLabel(null)).toBeNull();
    expect(formatValorantActLabel("")).toBeNull();
  });
});

describe("isActSeasonRanked", () => {
  it("is false when act has error or no games", () => {
    expect(isActSeasonRanked({ error: "No data" })).toBe(false);
    expect(isActSeasonRanked({ number_of_games: 0 })).toBe(false);
    expect(isActSeasonRanked(null)).toBe(false);
  });

  it("is false when final rank is unranked", () => {
    expect(
      isActSeasonRanked({
        number_of_games: 5,
        final_rank_patched: "Unranked",
      }),
    ).toBe(false);
  });

  it("is true when act has games and a tier", () => {
    expect(
      isActSeasonRanked({
        number_of_games: 12,
        final_rank_patched: "Diamond 2",
        final_rank: 19,
      }),
    ).toBe(true);
  });

  it("is true when patched tier exists even if games count is missing", () => {
    expect(
      isActSeasonRanked({
        final_rank_patched: "Platinum 1",
        final_rank: 15,
      }),
    ).toBe(true);
  });
});

describe("getActSeasonStats", () => {
  it("resolves s/e season key aliases", () => {
    const bySeason = {
      e26a4: { number_of_games: 3, final_rank_patched: "Gold 1", final_rank: 12 },
    };
    expect(getActSeasonStats(bySeason, "s26a4")?.final_rank_patched).toBe("Gold 1");
  });
});

describe("resolveCurrentActSeason", () => {
  it("prefers override over env and API", () => {
    expect(
      resolveCurrentActSeason({
        overrideAct: "e11a3",
        envAct: "s26a4",
        currentDataSeason: "e10a1",
      }),
    ).toBe("e11a3");
  });

  it("prefers env over API", () => {
    expect(
      resolveCurrentActSeason({ envAct: "s26a4", currentDataSeason: "e11a3" }),
    ).toBe("s26a4");
  });
});

describe("parseValorantActSeasonKey", () => {
  it("accepts e and s prefixes", () => {
    expect(parseValorantActSeasonKey("E11A3")).toBe("e11a3");
    expect(parseValorantActSeasonKey("s26a4")).toBe("s26a4");
  });

  it("rejects invalid keys", () => {
    expect(parseValorantActSeasonKey("episode11")).toBeNull();
  });
});
