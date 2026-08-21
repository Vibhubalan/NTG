import { describe, expect, it } from "vitest";
import {
  HENRIK_MAX_REQUESTS_PER_MINUTE,
  HENRIK_MIN_GAP_MS,
} from "@/lib/henrik-client";
import { isLeaderboardQuietWindowIst } from "@/lib/leaderboard-quiet-window";
import { playersAfterCursor } from "@tournaments-leagues/application/leaderboard-hourly-refresh.service";

describe("henrik rate limit config", () => {
  it("defaults to extended-tier budget under 60 req/min", () => {
    expect(HENRIK_MAX_REQUESTS_PER_MINUTE).toBeGreaterThanOrEqual(26);
    expect(HENRIK_MAX_REQUESTS_PER_MINUTE).toBeLessThanOrEqual(60);
    expect(HENRIK_MIN_GAP_MS).toBe(
      Math.ceil(60_000 / HENRIK_MAX_REQUESTS_PER_MINUTE),
    );
  });
});

describe("isLeaderboardQuietWindowIst", () => {
  it("is quiet at 4–5 AM IST", () => {
    // 2026-08-21 04:30 IST = 2026-08-20 23:00 UTC
    expect(isLeaderboardQuietWindowIst(new Date("2026-08-20T23:00:00.000Z"))).toBe(true);
    // 2026-08-21 05:15 IST = 2026-08-20 23:45 UTC
    expect(isLeaderboardQuietWindowIst(new Date("2026-08-20T23:45:00.000Z"))).toBe(true);
  });

  it("is active at 6 AM and 3 AM IST", () => {
    // 2026-08-21 06:00 IST = 2026-08-21 00:30 UTC
    expect(isLeaderboardQuietWindowIst(new Date("2026-08-21T00:30:00.000Z"))).toBe(false);
    // 2026-08-21 03:00 IST = 2026-08-20 21:30 UTC
    expect(isLeaderboardQuietWindowIst(new Date("2026-08-20T21:30:00.000Z"))).toBe(false);
  });
});

describe("playersAfterCursor", () => {
  const ids = ["a", "b", "c", "d"];

  it("returns all ids when cursor is null", () => {
    expect(playersAfterCursor(ids, null)).toEqual(ids);
  });

  it("returns ids after the cursor", () => {
    expect(playersAfterCursor(ids, "b")).toEqual(["c", "d"]);
  });

  it("returns all ids when cursor is unknown", () => {
    expect(playersAfterCursor(ids, "missing")).toEqual(ids);
  });

  it("returns empty when cursor is last id", () => {
    expect(playersAfterCursor(ids, "d")).toEqual([]);
  });
});
