import type { TournamentDetail } from "@core/contracts";

/**
 * Static tournament overlays are disabled in production.
 * Cup pages use DB registrations, admin teams, and Challonge brackets only.
 */
export const useStaticTournamentDetail = false;

/** @deprecated Kept empty — use admin/DB. Historical data lives in scripts/migrate-static-to-db.ts. */
export const STATIC_TOURNAMENT_DETAIL: Record<string, never> = {};

/** Returns DB detail unchanged (no static merge). */
export function mergeTournamentDetail(detail: TournamentDetail): TournamentDetail {
  return detail;
}
