import { afterEach, describe, expect, it } from "vitest";
import {
  getLeaderboardSyncNotifyEmail,
  isLeaderboardSyncNotifyEnabled,
} from "@/lib/leaderboard-sync-notify";

describe("leaderboard-sync-notify", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("is off by default", () => {
    delete process.env.LEADERBOARD_SYNC_NOTIFY;
    expect(isLeaderboardSyncNotifyEnabled()).toBe(false);
  });

  it("accepts common truthy flag values", () => {
    for (const value of ["1", "true", "yes", "on"]) {
      process.env.LEADERBOARD_SYNC_NOTIFY = value;
      expect(isLeaderboardSyncNotifyEnabled()).toBe(true);
    }
  });

  it("uses explicit notify email when set", () => {
    process.env.LEADERBOARD_SYNC_NOTIFY_EMAIL = "ops@ntgesports.com";
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(getLeaderboardSyncNotifyEmail()).toBe("ops@ntgesports.com");
  });

  it("falls back to first ADMIN_EMAILS entry", () => {
    delete process.env.LEADERBOARD_SYNC_NOTIFY_EMAIL;
    process.env.ADMIN_EMAILS = "admin@ntgesports.com,other@example.com";
    expect(getLeaderboardSyncNotifyEmail()).toBe("admin@ntgesports.com");
  });
});
