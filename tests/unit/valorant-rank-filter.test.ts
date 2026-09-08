import { describe, expect, it } from "vitest";
import { parseRankToTierId, rankMeetsMinBracket } from "@/lib/valorant-rank";

describe("parseRankToTierId", () => {
  it("prefers a stored Henrik tier id", () => {
    expect(parseRankToTierId(14, "Gold 1")).toBe(14);
  });

  it("parses rank labels in order", () => {
    expect(parseRankToTierId(null, "Iron 1")).toBe(3);
    expect(parseRankToTierId(null, "Gold 2")).toBe(13);
    expect(parseRankToTierId(null, "Immortal 3")).toBe(26);
    expect(parseRankToTierId(null, "Radiant")).toBe(27);
  });

  it("treats missing / unranked as 0", () => {
    expect(parseRankToTierId(null, null)).toBe(0);
    expect(parseRankToTierId(0, "Unranked")).toBe(0);
  });
});

describe("rankMeetsMinBracket", () => {
  it("applies Gold-and-above using rank order", () => {
    expect(rankMeetsMinBracket(13, "GOLD")).toBe(true);
    expect(rankMeetsMinBracket(27, "GOLD")).toBe(true);
    expect(rankMeetsMinBracket(9, "GOLD")).toBe(false);
  });

  it("lets current and peak filters combine independently", () => {
    const currentOk = rankMeetsMinBracket(13, "GOLD");
    const peakOk = rankMeetsMinBracket(21, "ASCENDANT");
    expect(currentOk && peakOk).toBe(true);
    expect(rankMeetsMinBracket(13, "GOLD") && rankMeetsMinBracket(14, "ASCENDANT")).toBe(false);
  });

  it("matches Unranked only for unranked", () => {
    expect(rankMeetsMinBracket(0, "UNRANKED")).toBe(true);
    expect(rankMeetsMinBracket(3, "UNRANKED")).toBe(false);
  });
});
