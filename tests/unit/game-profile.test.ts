import { describe, expect, it } from "vitest";
import {
  normalizeCs2FaceitRank,
  normalizeCs2PeakPremierRank,
  parsePlayedGames,
  userHasRequiredGameLinks,
  validateCs2RanksForRegistration,
  validateValorantRoles,
} from "@auth-membership/domain/game-profile";

describe("parsePlayedGames", () => {
  it("maps booleans to PlayedGame array", () => {
    expect(parsePlayedGames({ valorant: true, cs2: true })).toEqual(["VALORANT", "CS2"]);
    expect(parsePlayedGames({ valorant: false, cs2: true })).toEqual(["CS2"]);
  });
});

describe("validateValorantRoles", () => {
  it("requires at least one role", () => {
    expect(validateValorantRoles([])).toMatch(/at least one/i);
  });

  it("rejects Flex combined with other roles", () => {
    expect(validateValorantRoles(["FLEX", "DUELIST"])).toMatch(/Flex cannot/i);
  });

  it("accepts single Flex", () => {
    expect(validateValorantRoles(["FLEX"])).toBeNull();
  });
});

describe("CS2 rank normalization", () => {
  it("normalizes premier rank with optional hash", () => {
    expect(normalizeCs2PeakPremierRank("15000")).toBe("#15000");
    expect(normalizeCs2PeakPremierRank("#15000")).toBe("#15000");
    expect(normalizeCs2PeakPremierRank("NA")).toBe("NA");
    expect(normalizeCs2PeakPremierRank("gold")).toBeNull();
  });

  it("normalizes faceit rank", () => {
    expect(normalizeCs2FaceitRank("Level 10")).toBe("Level 10");
    expect(normalizeCs2FaceitRank("NA")).toBe("NA");
    expect(normalizeCs2FaceitRank("")).toBeNull();
  });
});

describe("validateCs2RanksForRegistration", () => {
  it("requires both ranks set", () => {
    expect(validateCs2RanksForRegistration(null, "#15000")).toMatch(/Faceit and Premier/i);
    expect(validateCs2RanksForRegistration("Level 5", null)).toMatch(/Faceit and Premier/i);
  });

  it("accepts both NA", () => {
    expect(validateCs2RanksForRegistration("NA", "NA")).toBeNull();
  });

  it("accepts one real rank and one NA", () => {
    expect(validateCs2RanksForRegistration("Level 8", "NA")).toBeNull();
  });
});

describe("userHasRequiredGameLinks", () => {
  it("flags missing riot or steam links", () => {
    expect(
      userHasRequiredGameLinks(["VALORANT", "CS2"], { riotPuuid: null, steamId64: "1" }),
    ).toEqual({ ok: false, missing: ["VALORANT"] });
    expect(userHasRequiredGameLinks(["CS2"], { riotPuuid: "x", steamId64: null })).toEqual({
      ok: false,
      missing: ["CS2"],
    });
    expect(userHasRequiredGameLinks(["VALORANT"], { riotPuuid: "x", steamId64: null })).toEqual({
      ok: true,
    });
  });
});
