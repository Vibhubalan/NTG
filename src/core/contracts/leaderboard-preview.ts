import type { GameSlug } from "@prisma/client";

export type LeaderboardPreviewBadge = {
  id: string;
  label: string;
  kind?: string;
  iconKey?: string | null;
};

export type LeaderboardPreviewEntry = {
  rank: number;
  /** Last saved board slot from DB — used to preserve order when MMR ties (e.g. all unranked). */
  storedBoardRank?: number;
  displayName: string;
  riotId: string | null;
  riotPlayerCard?: string | null;
  riotPlayerCardWide?: string | null;
  mmr: number | null;
  /** Cups with published games (tournament board only). */
  tournamentsPlayed?: number;
  rankTier: string | null;
  rankTierId: number | null;
  currentAct: string | null;
  lastSyncedAt: string | null;
  game: GameSlug;
  /** Cup trophy badges (tournament leaderboard). */
  badges?: LeaderboardPreviewBadge[];
};

export type LeaderboardPreview = {
  game: GameSlug;
  scope: string;
  entries: LeaderboardPreviewEntry[];
  /** Set when a full hourly refresh job completes (not per-player sync). */
  lastRefreshedAt?: string | null;
  hourlyRefreshEnabled?: boolean;
};
