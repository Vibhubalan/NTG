import type { GameSlug } from "@prisma/client";

export type ClashRoyaleLeaderboardEntry = {
  rank: number;
  displayName: string;
  playerTag: string | null;
  playerName: string | null;
  trophies: number | null;
  bestTrophies: number | null;
  wins: number;
  losses: number;
  lastSyncedAt: string | null;
  game: GameSlug;
};

export type ClashRoyaleLeaderboardPreview = {
  game: GameSlug;
  scope: string;
  mode: "current" | "peak";
  entries: ClashRoyaleLeaderboardEntry[];
  lastRefreshedAt?: string | null;
  refreshIntervalMinutes: number;
};
