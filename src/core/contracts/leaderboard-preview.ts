import type { GameSlug } from "@prisma/client";

export type LeaderboardPreviewEntry = {
  rank: number;
  /** Last saved board slot from DB — used to preserve order when MMR ties (e.g. all unranked). */
  storedBoardRank?: number;
  displayName: string;
  riotId: string | null;
  riotPlayerCard?: string | null;
  riotPlayerCardWide?: string | null;
  mmr: number | null;
  rankTier: string | null;
  rankTierId: number | null;
  currentAct: string | null;
  lastSyncedAt: string | null;
  game: GameSlug;
};

export type LeaderboardPreview = {
  game: GameSlug;
  scope: string;
  entries: LeaderboardPreviewEntry[];
  /** Set when a full hourly refresh job completes (not per-player sync). */
  lastRefreshedAt?: string | null;
  hourlyRefreshEnabled?: boolean;
};
