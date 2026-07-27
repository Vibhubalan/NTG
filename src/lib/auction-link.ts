// Server-only: imports env.server. Never import from a client component.
import { serverEnv } from "@core/config/env.server";

export type AuctionView = "auctioneer" | "captain" | "observe";

const VIEW_PATH: Record<AuctionView, string> = {
  auctioneer: "auctioneer",
  captain: "captain",
  observe: "spectator",
};

/** Deep link into the integrated auction app for a given cup slug + role. */
export function auctionLink(tournamentSlug: string, view: AuctionView): string {
  const base = (serverEnv.auctionUrl ?? "").trim().replace(/\/+$/, "");
  const rolePath = VIEW_PATH[view];
  return `${base}/esports/tournaments/${tournamentSlug}/auction/${rolePath}`;
}
