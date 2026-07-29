// Server-only: imports jsonwebtoken (node) + env.server. Never import from a client component.
import jwt from "jsonwebtoken";
import { serverEnv } from "@core/config/env.server";

export type AuctionView = "auctioneer" | "captain" | "observe";

/** Short-lived identity token; the auction app resolves the real role from its own DB. */
export function auctionToken(userId: string): string {
  const secret = serverEnv.auctionJwtSecret;
  if (!secret) throw new Error("AUCTION_JWT_SECRET not set");
  return jwt.sign({ userId }, secret, { expiresIn: "3h" });
}

/** Deep link into the auction app for a given tournament + view, carrying the identity token. */
export function auctionLink(tournamentId: string, view: AuctionView, userId: string): string {
  const base = serverEnv.auctionUrl;
  const secret = serverEnv.auctionJwtSecret;
  if (!base || !secret) {
    throw new Error("AUCTION_URL / AUCTION_JWT_SECRET not set");
  }
  return `${base}/${tournamentId}/${view}?token=${auctionToken(userId)}`;
}

/** Safe variant — returns null when auction SSO is not configured. */
export function tryAuctionLink(tournamentId: string, view: AuctionView, userId: string): string | null {
  if (!serverEnv.auctionUrl || !serverEnv.auctionJwtSecret) return null;
  return auctionLink(tournamentId, view, userId);
}
