export type PrizePoolMode = "MANUAL" | "DYNAMIC";

export function computeDisplayedPrizePool(input: {
  mode: PrizePoolMode | string | null | undefined;
  manualAmount: number | null | undefined;
  perPlayer: number | null | undefined;
  registeredCount: number;
}): number | null {
  if (input.mode === "DYNAMIC") {
    const per = Number(input.perPlayer);
    if (!Number.isFinite(per) || per <= 0) return 0;
    const count = Number.isFinite(input.registeredCount) ? Math.max(0, input.registeredCount) : 0;
    return per * count;
  }

  const manual = Number(input.manualAmount);
  if (!Number.isFinite(manual) || manual <= 0) return null;
  return manual;
}

export function parsePrizeAmount(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}
