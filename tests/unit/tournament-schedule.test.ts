import type { TournamentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  computeAutoStatus,
  getRegistrationCloseAt,
  getTournamentCompleteAt,
  hasValidAutoSchedule,
  isTournamentRegistrationLive,
  validateAutoSchedule,
} from "@tournaments-leagues/domain/tournament-schedule";
import {
  resolveAuctionHeroPhase,
  resolveEffectivePublicAuction,
} from "@tournaments-leagues/domain/auction-hero-phase";

const standard = {
  status: "REGISTRATION_OPEN" as TournamentStatus,
  autoManageStatus: true,
  registrationFormat: "STANDARD",
  registrationOpensAt: new Date("2026-06-01T10:00:00Z"),
  startsAt: new Date("2026-06-10T10:00:00Z"),
  endsAt: new Date("2026-06-10T18:00:00Z"),
};

const auction = {
  slug: "auc-cup-test",
  name: "AUC CUP TEST",
  status: "REGISTRATION_OPEN" as TournamentStatus,
  autoManageStatus: true,
  registrationFormat: "AUCTION",
  registrationOpensAt: new Date("2026-07-09T08:00:00Z"),
  auctionStartsAt: new Date("2026-07-17T10:00:00Z"),
  auctionEndsAt: new Date("2026-07-18T10:00:00Z"),
  startsAt: new Date("2026-07-20T10:00:00Z"),
  endsAt: new Date("2026-08-08T10:00:00Z"),
};

describe("tournament-schedule", () => {
  it("closes registration 1 minute before anchor", () => {
    const close = getRegistrationCloseAt(standard.startsAt!);
    expect(close.getTime()).toBe(standard.startsAt!.getTime() - 60_000);
  });

  it("validates standard auto schedule ordering", () => {
    expect(validateAutoSchedule(standard)).toBeNull();
    expect(
      validateAutoSchedule({
        registrationOpensAt: standard.startsAt,
        startsAt: standard.registrationOpensAt,
        endsAt: standard.endsAt,
      }),
    ).toMatch(/Registration must open/i);
  });

  it("validates auction auto schedule ordering", () => {
    expect(validateAutoSchedule(auction)).toBeNull();
    expect(
      validateAutoSchedule({
        ...auction,
        auctionEndsAt: auction.startsAt,
      }),
    ).toMatch(/Cup start must be after the auction ends/i);
  });

  it("detects valid auto schedule", () => {
    expect(hasValidAutoSchedule(standard)).toBe(true);
    expect(hasValidAutoSchedule({ ...standard, endsAt: null })).toBe(false);
    expect(hasValidAutoSchedule(auction)).toBe(true);
    expect(hasValidAutoSchedule({ ...auction, auctionStartsAt: null })).toBe(false);
  });

  it("computes standard status from timeline", () => {
    expect(computeAutoStatus(standard, new Date("2026-06-01T11:00:00Z"))).toBe("REGISTRATION_OPEN");
    expect(computeAutoStatus(standard, new Date("2026-06-10T10:00:00Z"))).toBe("IN_PROGRESS");
    expect(computeAutoStatus(standard, new Date("2026-06-10T19:00:00Z"))).toBe("COMPLETED");
  });

  it("computes auction status from timeline", () => {
    expect(computeAutoStatus(auction, new Date("2026-07-10T12:00:00Z"))).toBe("REGISTRATION_OPEN");
    expect(computeAutoStatus(auction, new Date("2026-07-17T11:00:00Z"))).toBe("AUCTION_LIVE");
    expect(computeAutoStatus(auction, new Date("2026-07-19T12:00:00Z"))).toBe("AUCTION_COMPLETED");
    expect(computeAutoStatus(auction, new Date("2026-07-21T12:00:00Z"))).toBe("IN_PROGRESS");
    expect(
      computeAutoStatus(auction, new Date(getTournamentCompleteAt(auction.endsAt!).toISOString())),
    ).toBe("COMPLETED");
  });

  it("isTournamentRegistrationLive respects window", () => {
    expect(isTournamentRegistrationLive(standard, new Date("2026-06-05T12:00:00Z"))).toBe(true);
    expect(isTournamentRegistrationLive(standard, new Date("2026-06-10T10:00:00Z"))).toBe(false);
    expect(isTournamentRegistrationLive(auction, new Date("2026-07-16T12:00:00Z"))).toBe(true);
    expect(isTournamentRegistrationLive(auction, new Date("2026-07-17T10:00:00Z"))).toBe(false);
    expect(
      isTournamentRegistrationLive(
        { ...standard, autoManageStatus: false, status: "REGISTRATION_OPEN" },
        new Date("2026-06-10T19:00:00Z"),
      ),
    ).toBe(true);
  });
});

describe("resolveEffectivePublicAuction", () => {
  const t = { autoManageStatus: true, auctionStartsAt: auction.auctionStartsAt, auctionEndsAt: auction.auctionEndsAt };

  it("auto-computes on during the live window regardless of stored value", () => {
    expect(resolveEffectivePublicAuction(false, t, new Date("2026-07-17T11:00:00Z"))).toBe(true);
  });

  it("auto-computes off before the window starts", () => {
    expect(resolveEffectivePublicAuction(true, t, new Date("2026-07-10T12:00:00Z"))).toBe(false);
  });

  it("auto-computes off after the window ends", () => {
    expect(resolveEffectivePublicAuction(true, t, new Date("2026-07-19T12:00:00Z"))).toBe(false);
  });

  it("falls back to the stored value when auto-manage is off", () => {
    expect(resolveEffectivePublicAuction(true, { ...t, autoManageStatus: false })).toBe(true);
    expect(resolveEffectivePublicAuction(false, { ...t, autoManageStatus: false })).toBe(false);
  });

  it("falls back to the stored value when auction dates aren't set", () => {
    expect(resolveEffectivePublicAuction(true, { ...t, auctionStartsAt: null })).toBe(true);
  });
});

describe("auction-hero-phase", () => {
  it("resolves hero phases for the nearest auction cup timeline", () => {
    expect(
      resolveAuctionHeroPhase(auction, new Date("2026-07-10T12:00:00Z"))?.phase,
    ).toBe("registration_open");
    expect(
      resolveAuctionHeroPhase(auction, new Date("2026-07-17T11:00:00Z"))?.phase,
    ).toBe("auction_live");
    expect(
      resolveAuctionHeroPhase(auction, new Date("2026-07-19T12:00:00Z"))?.phase,
    ).toBe("awaiting_tournament");
    expect(
      resolveAuctionHeroPhase(auction, new Date("2026-07-21T12:00:00Z"))?.phase,
    ).toBe("tournament_live");
  });
});
