// Server-only. Never import from a client component.

export type AuctionView = "auctioneer" | "captain" | "observe";

const VIEW_PATH: Record<AuctionView, string> = {
  auctioneer: "auctioneer",
  captain: "captain",
  observe: "spectator",
};

/** Same-origin deep link into the integrated auction UI. */
export function auctionLink(tournamentSlug: string, view: AuctionView): string {
  const rolePath = VIEW_PATH[view];
  return `/esports/tournaments/${tournamentSlug}/auction/${rolePath}`;
}
