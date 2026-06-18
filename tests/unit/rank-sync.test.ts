import { describe, expect, it } from "vitest";
import { RANK_SYNC_MAX_BATCH_SIZE } from "@tournaments-leagues/application/rank-sync.service";

describe("rank-sync batch config", () => {
  it("caps nightly cron batches at 26 players", () => {
    expect(RANK_SYNC_MAX_BATCH_SIZE).toBe(26);
  });
});
