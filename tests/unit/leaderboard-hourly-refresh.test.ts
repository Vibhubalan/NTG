import { describe, expect, it } from "vitest";
import {
  HENRIK_MAX_REQUESTS_PER_MINUTE,
  HENRIK_MIN_GAP_MS,
} from "@/lib/henrik-client";
import { playersAfterCursor } from "@tournaments-leagues/application/leaderboard-hourly-refresh.service";

describe("henrik rate limit config", () => {
  it("stays under Henrik free tier with 26 requests per minute", () => {
    expect(HENRIK_MAX_REQUESTS_PER_MINUTE).toBe(26);
    expect(HENRIK_MIN_GAP_MS).toBeGreaterThanOrEqual(
      Math.ceil(60_000 / HENRIK_MAX_REQUESTS_PER_MINUTE),
    );
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
