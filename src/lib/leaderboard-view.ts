import type { LeaderboardPreviewEntry } from "@core/contracts";
import {
  UNRANKED_TIER_ID,
  compareValorantBoardEntries,
  effectiveBoardMmr,
} from "@/lib/leaderboard-sort";
import { isValorantRanked } from "@/lib/valorant-registration-rank";

export type LeaderboardViewEntry = LeaderboardPreviewEntry & {
  /** Display position 1..n (unique, by current MMR descending). */
  rank: number;
  viewMmr: number | null;
  viewRankTier: string | null;
  viewRankTierId: number | null;
};

function currentViewFields(
  entry: LeaderboardPreviewEntry,
): Pick<LeaderboardViewEntry, "viewMmr" | "viewRankTier" | "viewRankTierId"> {
  const ranked = isValorantRanked(entry.rankTierId, entry.rankTier);
  return {
    viewMmr: entry.mmr,
    viewRankTier: ranked ? entry.rankTier : null,
    viewRankTierId: ranked ? entry.rankTierId : UNRANKED_TIER_ID,
  };
}

function compareViewEntries(a: LeaderboardViewEntry, b: LeaderboardViewEntry): number {
  const mmrDiff = effectiveBoardMmr(a.viewMmr) - effectiveBoardMmr(b.viewMmr);
  if (mmrDiff !== 0) return -mmrDiff;

  const tierDiff = (b.viewRankTierId ?? 0) - (a.viewRankTierId ?? 0);
  if (tierDiff !== 0) return tierDiff;

  const slotA = a.storedBoardRank ?? a.rank ?? Number.MAX_SAFE_INTEGER;
  const slotB = b.storedBoardRank ?? b.rank ?? Number.MAX_SAFE_INTEGER;
  const slotDiff = slotA - slotB;
  if (slotDiff !== 0) return slotDiff;

  return a.displayName.localeCompare(b.displayName);
}

/** Current-rank board: MMR desc (unranked = 0 for sort), stored slot ties, ranks 1..n. */
export function buildLeaderboardView(
  entries: LeaderboardPreviewEntry[],
): LeaderboardViewEntry[] {
  const mapped = entries.map((entry) => ({
    ...entry,
    ...currentViewFields(entry),
    rank: 0,
  }));

  const sorted = [...mapped].sort(compareViewEntries);

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export { compareValorantBoardEntries };
