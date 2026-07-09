const UNRANKED_TIER_ID = 0;
const UNRANKED_TIER_NAME = "Unranked";

export type ValorantRankSnapshot = {
  tier: string | null;
  tierId: number | null;
};

export type AuctionDisplayRank = ValorantRankSnapshot & {
  source: "CURRENT" | "PEAK";
};

/** True when the player has a competitive tier for the current act. */
export function isValorantRanked(
  tierId: number | null | undefined,
  tierName: string | null | undefined,
): boolean {
  if (tierId != null && tierId > 0) return true;
  const name = tierName?.trim().toLowerCase() ?? "";
  if (!name) return false;
  return name !== "unranked" && name !== "unused";
}

/** Display-only: current rank if ranked this act, otherwise peak. */
export function resolveAuctionDisplayRank(
  current: ValorantRankSnapshot,
  peak: ValorantRankSnapshot,
): AuctionDisplayRank {
  if (isValorantRanked(current.tierId, current.tier)) {
    return {
      tier: current.tier,
      tierId: current.tierId,
      source: "CURRENT",
    };
  }
  if (isValorantRanked(peak.tierId, peak.tier)) {
    return {
      tier: peak.tier,
      tierId: peak.tierId,
      source: "PEAK",
    };
  }
  return {
    tier: UNRANKED_TIER_NAME,
    tierId: UNRANKED_TIER_ID,
    source: "PEAK",
  };
}
