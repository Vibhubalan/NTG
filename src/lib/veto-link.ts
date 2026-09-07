// Server-only: imports jsonwebtoken (node) + env.server. Never import from a client component.
import jwt from "jsonwebtoken";
import { serverEnv } from "@core/config/env.server";

/** Short-lived identity token; the services app resolves the team side from its own DB. */
export function vetoToken(userId: string): string {
  const secret = serverEnv.auctionJwtSecret;
  if (!secret) throw new Error("AUCTION_JWT_SECRET not set");
  return jwt.sign({ userId }, secret, { expiresIn: "3h" });
}

/** Deep link into the services app's veto for a match, carrying the identity token. */
export function vetoLink(matchId: string, userId: string): string {
  const base = serverEnv.auctionUrl;
  const secret = serverEnv.auctionJwtSecret;
  if (!base || !secret) {
    throw new Error("AUCTION_URL / AUCTION_JWT_SECRET not set");
  }
  return `${base}/veto/${matchId}?token=${vetoToken(userId)}`;
}

/** Safe variant — returns null when the services app is not configured. */
export function tryVetoLink(matchId: string, userId: string): string | null {
  if (!serverEnv.auctionUrl || !serverEnv.auctionJwtSecret) return null;
  return vetoLink(matchId, userId);
}
