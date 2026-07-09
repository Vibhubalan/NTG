import { describe, expect, it } from "vitest";
import { isValorantRanked, resolveAuctionDisplayRank } from "@/lib/valorant-registration-rank";

describe("resolveAuctionDisplayRank", () => {
  it("uses current rank when ranked this act", () => {
    const result = resolveAuctionDisplayRank(
      { tier: "Diamond 2", tierId: 18 },
      { tier: "Immortal 1", tierId: 24 },
    );
    expect(result.source).toBe("CURRENT");
    expect(result.tier).toBe("Diamond 2");
  });

  it("uses peak when current act is unranked", () => {
    const result = resolveAuctionDisplayRank(
      { tier: "Unranked", tierId: 0 },
      { tier: "Ascendant 3", tierId: 23 },
    );
    expect(result.source).toBe("PEAK");
    expect(result.tier).toBe("Ascendant 3");
  });

  it("falls back to unranked when neither is ranked", () => {
    const result = resolveAuctionDisplayRank(
      { tier: "Unranked", tierId: 0 },
      { tier: null, tierId: null },
    );
    expect(result.tier).toBe("Unranked");
    expect(result.tierId).toBe(0);
  });
});

describe("isValorantRanked", () => {
  it("detects ranked tiers", () => {
    expect(isValorantRanked(18, "Diamond 2")).toBe(true);
    expect(isValorantRanked(0, "Unranked")).toBe(false);
    expect(isValorantRanked(null, null)).toBe(false);
  });
});
