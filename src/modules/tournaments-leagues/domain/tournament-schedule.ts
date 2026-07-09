import type { TournamentStatus } from "@prisma/client";

const REGISTRATION_CLOSE_OFFSET_MS = 60 * 1000;
const TOURNAMENT_COMPLETE_OFFSET_MS = 60 * 1000;

export type TournamentScheduleInput = {
  status: TournamentStatus;
  autoManageStatus: boolean;
  registrationFormat?: string | null;
  registrationOpensAt: Date | null;
  auctionStartsAt?: Date | null;
  auctionEndsAt?: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function isAuctionCup(t: Pick<TournamentScheduleInput, "registrationFormat">): boolean {
  return t.registrationFormat === "AUCTION";
}

export function getRegistrationCloseAt(anchorAt: Date): Date {
  return new Date(anchorAt.getTime() - REGISTRATION_CLOSE_OFFSET_MS);
}

export function getTournamentCompleteAt(endsAt: Date): Date {
  return new Date(endsAt.getTime() + TOURNAMENT_COMPLETE_OFFSET_MS);
}

function registrationCloseAnchor(t: TournamentScheduleInput): Date | null {
  if (isAuctionCup(t)) {
    return t.auctionStartsAt ? getRegistrationCloseAt(t.auctionStartsAt) : null;
  }
  return t.startsAt ? getRegistrationCloseAt(t.startsAt) : null;
}

export function hasValidAutoSchedule(t: TournamentScheduleInput): boolean {
  if (!t.registrationOpensAt || !t.startsAt || !t.endsAt) return false;

  if (isAuctionCup(t)) {
    if (!t.auctionStartsAt || !t.auctionEndsAt) return false;
    const closeAt = registrationCloseAnchor(t)!;
    return (
      t.registrationOpensAt.getTime() < closeAt.getTime() &&
      closeAt.getTime() < t.auctionStartsAt.getTime() &&
      t.auctionStartsAt.getTime() < t.auctionEndsAt.getTime() &&
      t.auctionEndsAt.getTime() < t.startsAt.getTime() &&
      t.startsAt.getTime() < t.endsAt.getTime()
    );
  }

  const closeAt = registrationCloseAnchor(t)!;
  return (
    t.registrationOpensAt.getTime() < closeAt.getTime() &&
    closeAt.getTime() < t.endsAt.getTime()
  );
}

export function validateAutoSchedule(input: {
  registrationFormat?: string | null;
  registrationOpensAt: Date | null;
  auctionStartsAt?: Date | null;
  auctionEndsAt?: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
}): string | null {
  if (!input.registrationOpensAt || !input.startsAt || !input.endsAt) {
    return "Auto-manage requires registration open, cup start, and cup end dates.";
  }

  if (isAuctionCup(input)) {
    if (!input.auctionStartsAt || !input.auctionEndsAt) {
      return "Auction cups require auction start and auction end dates.";
    }
    const closeAt = getRegistrationCloseAt(input.auctionStartsAt);
    if (input.registrationOpensAt.getTime() >= closeAt.getTime()) {
      return "Registration must open before it closes (1 minute before auction starts).";
    }
    if (closeAt.getTime() >= input.auctionStartsAt.getTime()) {
      return "Auction must start after registration closes.";
    }
    if (input.auctionStartsAt.getTime() >= input.auctionEndsAt.getTime()) {
      return "Auction end must be after auction start.";
    }
    if (input.auctionEndsAt.getTime() >= input.startsAt.getTime()) {
      return "Cup start must be after the auction ends.";
    }
    if (input.startsAt.getTime() >= input.endsAt.getTime()) {
      return "Cup end must be after cup start.";
    }
    return null;
  }

  const closeAt = getRegistrationCloseAt(input.startsAt);
  if (input.registrationOpensAt.getTime() >= closeAt.getTime()) {
    return "Registration must open before it closes (1 minute before cup start).";
  }
  if (closeAt.getTime() >= input.endsAt.getTime()) {
    return "Cup end must be after cup start.";
  }
  return null;
}

export function computeAutoStatus(
  t: TournamentScheduleInput,
  now: Date = new Date(),
): TournamentStatus | null {
  if (!t.autoManageStatus || t.status === "CANCELLED") return null;
  if (!hasValidAutoSchedule(t)) return null;

  const opens = t.registrationOpensAt!.getTime();
  const closeAt = registrationCloseAnchor(t)!.getTime();
  const ts = now.getTime();

  if (isAuctionCup(t)) {
    const auctionStart = t.auctionStartsAt!.getTime();
    const auctionEnd = t.auctionEndsAt!.getTime();
    const cupStart = t.startsAt!.getTime();
    const cupComplete = getTournamentCompleteAt(t.endsAt!).getTime();

    if (ts >= cupComplete) return "COMPLETED";
    if (ts >= cupStart) return "IN_PROGRESS";
    if (ts >= auctionEnd) return "AUCTION_COMPLETED";
    if (ts >= auctionStart) return "AUCTION_LIVE";
    if (ts >= opens) return "REGISTRATION_OPEN";
    return t.status;
  }

  const ends = t.endsAt!.getTime();
  if (ts >= ends) return "COMPLETED";
  if (ts >= closeAt) return "IN_PROGRESS";
  if (ts >= opens) return "REGISTRATION_OPEN";
  return t.status;
}

export function isTournamentRegistrationLive(
  t: TournamentScheduleInput,
  now: Date = new Date(),
): boolean {
  if (t.autoManageStatus && hasValidAutoSchedule(t)) {
    const opens = t.registrationOpensAt!.getTime();
    const closeAt = registrationCloseAnchor(t)!.getTime();
    const ts = now.getTime();
    return ts >= opens && ts < closeAt;
  }

  return t.status === "REGISTRATION_OPEN";
}
