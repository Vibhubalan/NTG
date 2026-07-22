import { describe, expect, it } from "vitest";
import { buildLeaderboardView } from "@/lib/leaderboard-view";
import type { LeaderboardPreviewEntry } from "@core/contracts";

const base = (
  overrides: Partial<LeaderboardPreviewEntry> & Pick<LeaderboardPreviewEntry, "displayName">,
): LeaderboardPreviewEntry => ({
  rank: 0,
  riotId: null,
  mmr: null,
  rankTier: null,
  rankTierId: 0,
  currentAct: null,
  lastSyncedAt: null,
  game: "VALORANT",
  ...overrides,
});

describe("buildLeaderboardView", () => {
  it("sorts by current MMR", () => {
    const view = buildLeaderboardView([
      base({ displayName: "A", mmr: 1500, rankTier: "Gold 1", rankTierId: 12 }),
      base({ displayName: "B", mmr: 1900, rankTier: "Diamond 1", rankTierId: 18 }),
    ]);
    expect(view.map((e) => e.displayName)).toEqual(["B", "A"]);
    expect(view[0]?.viewMmr).toBe(1900);
  });

  it("keeps stored slot order when all unranked", () => {
    const view = buildLeaderboardView([
      base({ displayName: "Shanks", rank: 2, storedBoardRank: 2 }),
      base({ displayName: "Vachan", rank: 1, storedBoardRank: 1 }),
      base({ displayName: "Conor", rank: 3, storedBoardRank: 3 }),
    ]);
    expect(view.map((e) => e.displayName)).toEqual(["Vachan", "Shanks", "Conor"]);
    expect(view.every((e) => e.viewMmr == null)).toBe(true);
  });

  it("shows tier when ranked even if MMR is missing", () => {
    const view = buildLeaderboardView([
      base({
        displayName: "Ghost",
        mmr: null,
        rankTier: "Diamond 2",
        rankTierId: 19,
      }),
    ]);
    expect(view[0]?.viewRankTier).toBe("Diamond 2");
    expect(view[0]?.viewRankTierId).toBe(19);
  });
});
