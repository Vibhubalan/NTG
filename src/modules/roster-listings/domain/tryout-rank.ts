/** Valorant tryout rank floor — not shown to applicants. */
export const TRYOUT_MIN_CURRENT_TIER_ID = 21; // Ascendant 1
export const TRYOUT_MIN_PEAK_TIER_ID = 22; // Ascendant 2

export const TRYOUT_RANK_INELIGIBLE_MESSAGE = "Not eligible for rank criteria";

export function meetsValorantTryoutRank(currentTierId: number | null, peakTierId: number | null): boolean {
  const current = currentTierId ?? 0;
  const peak = peakTierId ?? current;
  return current >= TRYOUT_MIN_CURRENT_TIER_ID && peak >= TRYOUT_MIN_PEAK_TIER_ID;
}
