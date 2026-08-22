import { describe, expect, it } from "vitest";
import { computeDisplayedPrizePool } from "@/lib/prize-pool";

describe("computeDisplayedPrizePool", () => {
  it("uses the manual total when mode is MANUAL", () => {
    expect(
      computeDisplayedPrizePool({
        mode: "MANUAL",
        manualAmount: 15000,
        perPlayer: 200,
        registeredCount: 4,
      }),
    ).toBe(15000);
  });

  it("grows with each approved registration in DYNAMIC mode", () => {
    expect(
      computeDisplayedPrizePool({
        mode: "DYNAMIC",
        manualAmount: 15000,
        perPlayer: 200,
        registeredCount: 0,
      }),
    ).toBe(0);
    expect(
      computeDisplayedPrizePool({
        mode: "DYNAMIC",
        manualAmount: 15000,
        perPlayer: 200,
        registeredCount: 1,
      }),
    ).toBe(200);
    expect(
      computeDisplayedPrizePool({
        mode: "DYNAMIC",
        manualAmount: 15000,
        perPlayer: 200,
        registeredCount: 2,
      }),
    ).toBe(400);
  });

  it("returns null when a manual cup has no prize pool", () => {
    expect(
      computeDisplayedPrizePool({
        mode: "MANUAL",
        manualAmount: null,
        perPlayer: null,
        registeredCount: 3,
      }),
    ).toBeNull();
  });
});
