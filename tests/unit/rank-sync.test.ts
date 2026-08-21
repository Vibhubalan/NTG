import { describe, expect, it } from "vitest";
import {
  RANK_SYNC_ADMIN_BATCH_SIZE,
  RANK_SYNC_MAX_BATCH_SIZE,
  deriveRankFromV2Act,
  type HenrikV2MmrBundle,
} from "@tournaments-leagues/application/rank-sync.service";

describe("rank-sync batch config", () => {
  it("keeps batches small enough for Vercel Hobby 10s function limit", () => {
    expect(RANK_SYNC_MAX_BATCH_SIZE).toBe(1);
  });

  it("admin batch size does not exceed max batch size", () => {
    expect(RANK_SYNC_ADMIN_BATCH_SIZE).toBeLessThanOrEqual(RANK_SYNC_MAX_BATCH_SIZE);
  });
});

function bundle(
  partial: Partial<HenrikV2MmrBundle> &
    Pick<HenrikV2MmrBundle, "currentActSeason" | "bySeason">,
): HenrikV2MmrBundle {
  return {
    lifetime: {
      currentAct: partial.currentActSeason,
      peakRankTier: null,
      peakRankTierId: null,
      peakAct: null,
    },
    gameName: null,
    tagLine: null,
    ...partial,
  };
}

describe("deriveRankFromV2Act", () => {
  it("returns null when v2 bundle is missing (do not invent Unranked)", () => {
    expect(deriveRankFromV2Act(null)).toBeNull();
  });

  it("returns null when current act season row is missing", () => {
    expect(
      deriveRankFromV2Act(
        bundle({
          currentActSeason: "s26a5",
          bySeason: {
            s26a4: {
              number_of_games: 20,
              final_rank_patched: "Gold 1",
              final_rank: 12,
            },
          },
        }),
      ),
    ).toBeNull();
  });

  it("returns unranked when act row exists but is not ranked", () => {
    expect(
      deriveRankFromV2Act(
        bundle({
          currentActSeason: "s26a5",
          bySeason: {
            s26a5: { number_of_games: 0, final_rank_patched: "Unranked", final_rank: 0 },
          },
        }),
      ),
    ).toEqual({ status: "unranked" });
  });

  it("returns ranked snapshot from act season stats (available for callers; sync uses Unranked-only)", () => {
    const result = deriveRankFromV2Act(
      bundle({
        currentActSeason: "s26a5",
        bySeason: {
          s26a5: {
            number_of_games: 8,
            final_rank_patched: "Silver 1",
            final_rank: 6,
          },
        },
      }),
    );
    expect(result).toMatchObject({
      status: "ranked",
      snapshot: {
        rankTier: "Silver 1",
        rankTierId: 6,
      },
    });
  });

  it("resolves e/s season key aliases", () => {
    const result = deriveRankFromV2Act(
      bundle({
        currentActSeason: "s26a5",
        bySeason: {
          e26a5: {
            number_of_games: 3,
            final_rank_patched: "Platinum 2",
            final_rank: 16,
          },
        },
      }),
    );
    expect(result).toMatchObject({
      status: "ranked",
      snapshot: { rankTier: "Platinum 2", rankTierId: 16 },
    });
  });
});
