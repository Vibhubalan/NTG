import type { TournamentStatus } from "@prisma/client";
import { getRegistrationCloseAt } from "./tournament-schedule";

export type HeroCupPhase =
  | "registration_open"
  | "auction_soon"
  | "auction_live"
  | "awaiting_tournament"
  | "tournament_live";

export type AuctionHeroInput = {
  slug: string;
  name: string;
  registrationFormat: string | null;
  registrationOpensAt: Date | null;
  auctionStartsAt: Date | null;
  auctionEndsAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: TournamentStatus;
};

export type ResolvedHeroCupPhase = {
  phase: HeroCupPhase;
  countdownEndsAt: Date;
};

export function resolveAuctionHeroPhase(
  t: AuctionHeroInput,
  now: Date = new Date(),
): ResolvedHeroCupPhase | null {
  if (t.registrationFormat !== "AUCTION") return null;
  if (t.status === "CANCELLED" || t.status === "COMPLETED") return null;
  if (!t.registrationOpensAt || !t.auctionStartsAt || !t.auctionEndsAt || !t.startsAt || !t.endsAt) {
    return null;
  }

  const ts = now.getTime();
  const opens = t.registrationOpensAt.getTime();
  const regClose = getRegistrationCloseAt(t.auctionStartsAt).getTime();
  const auctionStart = t.auctionStartsAt.getTime();
  const auctionEnd = t.auctionEndsAt.getTime();
  const cupStart = t.startsAt.getTime();
  const cupEnd = t.endsAt.getTime();

  if (ts < opens || ts >= cupEnd) return null;

  if (ts >= opens && ts < regClose) {
    return { phase: "registration_open", countdownEndsAt: new Date(regClose) };
  }
  if (ts >= regClose && ts < auctionStart) {
    return { phase: "auction_soon", countdownEndsAt: t.auctionStartsAt };
  }
  if (ts >= auctionStart && ts < auctionEnd) {
    return { phase: "auction_live", countdownEndsAt: t.auctionEndsAt };
  }
  if (ts >= auctionEnd && ts < cupStart) {
    return { phase: "awaiting_tournament", countdownEndsAt: t.startsAt };
  }
  if (ts >= cupStart && ts < cupEnd) {
    return { phase: "tournament_live", countdownEndsAt: t.endsAt };
  }

  return null;
}
