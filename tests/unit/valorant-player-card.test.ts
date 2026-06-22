import { describe, expect, it } from "vitest";
import {
  normalizeRiotPlayerCardUrls,
  resolveLeaderboardCardArtUrl,
} from "@/lib/valorant-player-card";

describe("valorant-player-card", () => {
  const large =
    "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";
  const wide =
    "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/wideart.png";

  it("prefers wide art when present", () => {
    expect(resolveLeaderboardCardArtUrl(wide, large)).toBe(wide);
  });

  it("derives wide from large valorant-api URLs", () => {
    expect(resolveLeaderboardCardArtUrl(null, large)).toBe(wide);
  });

  it("normalizes both fields on link/sync", () => {
    expect(normalizeRiotPlayerCardUrls(large, null)).toEqual({ large, wide });
  });
});
