/**
 * Pure auction-rule logic — no DB and no transport coupling.
 */

/** Cheapest floor among players still winnable, or 0 if none remain. */
export function cheapestAvailableFloor(availableFloorPrices: number[]): number {
  if (!availableFloorPrices || availableFloorPrices.length === 0) return 0;
  return Math.min(...availableFloorPrices);
}

/**
 * Most a team may safely bid now:
 * safeMax = currentBudget - (openSlots - 1) * cheapestFloor
 */
export function safeMaxBid({
  currentBudget,
  openSlots,
  cheapestFloor,
}: {
  currentBudget: number;
  openSlots: number;
  cheapestFloor: number;
}): number {
  const slotsLeftAfterThisWin = Math.max(openSlots - 1, 0);
  return currentBudget - slotsLeftAfterThisWin * cheapestFloor;
}

export interface ValidateBidArgs {
  auctionStatus: string;
  amount: number;
  currentPrice: number;
  minIncrement: number;
  teamIsHighestBidder: boolean;
  openSlots: number;
  currentBudget: number;
  cheapestFloor: number;
}

export type BidCheck = { ok: true } | { ok: false; reason: string };

/** Validates a proposed bid against auction constraints. */
export function validateBid({
  auctionStatus,
  amount,
  currentPrice,
  minIncrement,
  teamIsHighestBidder,
  openSlots,
  currentBudget,
  cheapestFloor,
}: ValidateBidArgs): BidCheck {
  if (auctionStatus !== "live") {
    return { ok: false, reason: "Bidding is not open right now" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Invalid bid amount" };
  }
  if (amount < currentPrice + minIncrement) {
    return { ok: false, reason: `Bid must be at least ${currentPrice + minIncrement}` };
  }
  if (teamIsHighestBidder) {
    return { ok: false, reason: "You are already the highest bidder" };
  }
  if (openSlots <= 0) {
    return { ok: false, reason: "Your roster is already full" };
  }
  const safeMax = safeMaxBid({ currentBudget, openSlots, cheapestFloor });
  if (amount > safeMax) {
    return {
      ok: false,
      reason: `Bid exceeds your safe maximum of ${safeMax} (credits must be kept to fill your remaining slots)`,
    };
  }
  return { ok: true };
}
