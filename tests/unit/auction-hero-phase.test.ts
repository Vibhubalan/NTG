import { describe, expect, it } from "vitest";
import { resolveAuctionHeroPhase } from "@tournaments-leagues/domain/auction-hero-phase";
import type { AuctionHeroInput } from "@tournaments-leagues/domain/auction-hero-phase";

function base(partial: Partial<AuctionHeroInput> = {}): AuctionHeroInput {
  return {
    slug: "mix-cup",
    name: "MIX CUP",
    registrationFormat: "AUCTION",
    status: "AUCTION_LIVE",
    registrationOpensAt: null,
    registrationClosesAt: null,
    auctionStartsAt: null,
    auctionEndsAt: null,
    startsAt: null,
    endsAt: null,
    ...partial,
  };
}

describe("resolveAuctionHeroPhase", () => {
  it("uses stored status when schedule dates are missing (manual cups)", () => {
    expect(resolveAuctionHeroPhase(base({ status: "AUCTION_LIVE" }))).toEqual({
      phase: "auction_live",
      countdownEndsAt: null,
    });
    expect(resolveAuctionHeroPhase(base({ status: "REGISTRATION_OPEN" }))?.phase).toBe(
      "registration_open",
    );
    expect(resolveAuctionHeroPhase(base({ status: "IN_PROGRESS" }))?.phase).toBe(
      "tournament_live",
    );
  });

  it("hides completed/cancelled/draft cups", () => {
    expect(resolveAuctionHeroPhase(base({ status: "COMPLETED" }))).toBeNull();
    expect(resolveAuctionHeroPhase(base({ status: "CANCELLED" }))).toBeNull();
    expect(resolveAuctionHeroPhase(base({ status: "DRAFT" }))).toBeNull();
  });

  it("prefers schedule windows when all dates exist", () => {
    const now = new Date("2026-08-19T12:00:00.000Z");
    const resolved = resolveAuctionHeroPhase(
      base({
        status: "REGISTRATION_OPEN",
        registrationOpensAt: new Date("2026-08-18T00:00:00.000Z"),
        auctionStartsAt: new Date("2026-08-19T10:00:00.000Z"),
        auctionEndsAt: new Date("2026-08-19T18:00:00.000Z"),
        startsAt: new Date("2026-08-20T00:00:00.000Z"),
        endsAt: new Date("2026-08-21T00:00:00.000Z"),
      }),
      now,
    );
    expect(resolved?.phase).toBe("auction_live");
    expect(resolved?.countdownEndsAt?.toISOString()).toBe("2026-08-19T18:00:00.000Z");
  });
});
