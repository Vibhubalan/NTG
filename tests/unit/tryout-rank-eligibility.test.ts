import { describe, expect, it } from "vitest";
import { meetsValorantTryoutRank } from "@/modules/roster-listings/domain/tryout-rank";

describe("meetsValorantTryoutRank", () => {
  it("accepts Ascendant 1 current with Ascendant 2 peak", () => {
    expect(meetsValorantTryoutRank(21, 22)).toBe(true);
  });

  it("accepts Immortal current", () => {
    expect(meetsValorantTryoutRank(24, 27)).toBe(true);
  });

  it("rejects Diamond current even with high peak", () => {
    expect(meetsValorantTryoutRank(20, 24)).toBe(false);
  });

  it("rejects Ascendant 1 current with Ascendant 1 peak", () => {
    expect(meetsValorantTryoutRank(21, 21)).toBe(false);
  });

  it("rejects missing ranks", () => {
    expect(meetsValorantTryoutRank(null, null)).toBe(false);
  });

  it("uses current as peak fallback when peak is missing", () => {
    expect(meetsValorantTryoutRank(22, null)).toBe(true);
    expect(meetsValorantTryoutRank(21, null)).toBe(false);
  });
});
