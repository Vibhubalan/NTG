import type { PlayedGame, ValorantRole } from "@prisma/client";

export const VALORANT_ROLE_OPTIONS: ValorantRole[] = [
  "DUELIST",
  "INITIATOR",
  "CONTROLLER",
  "SENTINEL",
  "FLEX",
];

export const VALORANT_ROLE_LABELS: Record<ValorantRole, string> = {
  DUELIST: "Duelist",
  INITIATOR: "Initiator",
  CONTROLLER: "Controller",
  SENTINEL: "Sentinel",
  FLEX: "Flex",
};

export function parsePlayedGames(input: {
  valorant?: boolean;
  cs2?: boolean;
}): PlayedGame[] {
  const games: PlayedGame[] = [];
  if (input.valorant) games.push("VALORANT");
  if (input.cs2) games.push("CS2");
  return games;
}

export function validateValorantRoles(roles: ValorantRole[]): string | null {
  if (roles.length === 0) return "Select at least one Valorant role.";
  if (roles.includes("FLEX") && roles.length > 1) {
    return "Flex cannot be combined with other roles.";
  }
  return null;
}

export function normalizeCs2PeakPremierRank(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === "NA") return "NA";
  const match = trimmed.match(/^#?\d+$/);
  if (!match) return null;
  const num = trimmed.replace("#", "");
  return `#${num}`;
}

export function normalizeCs2FaceitRank(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase() === "NA") return "NA";
  if (trimmed.length > 32) return null;
  return trimmed;
}

/** Default when Steam is linked and ranks are unset. */
export const CS2_RANK_DEFAULT = "NA";

/** Prefer live profile ranks; fall back to registration snapshot. */
export function displayCs2Ranks(
  profile: { cs2PeakPremierRank: string | null; cs2FaceitRank: string | null } | null | undefined,
  snapshot?: { premier: string | null; faceit: string | null },
): { premier: string; faceit: string } {
  if (profile) {
    return {
      premier: profile.cs2PeakPremierRank?.trim() || CS2_RANK_DEFAULT,
      faceit: profile.cs2FaceitRank?.trim() || CS2_RANK_DEFAULT,
    };
  }
  return {
    premier: snapshot?.premier?.trim() || CS2_RANK_DEFAULT,
    faceit: snapshot?.faceit?.trim() || CS2_RANK_DEFAULT,
  };
}

export function formatValorantRolesList(roles: ValorantRole[]): string | null {
  if (!roles.length) return null;
  return roles.map((r) => VALORANT_ROLE_LABELS[r] ?? r).join(", ");
}

/** Roles from live profile (user-editable); current rank from leaderboard, then snapshot. */
export function displayValorantRegistration(
  profile: { valorantRoles: ValorantRole[] } | null | undefined,
  leaderboard: { rankTier: string | null; rankTierId: number | null } | null | undefined,
  snapshot?: {
    roles: unknown;
    rankTier: string | null;
    rankTierId: number | null;
  },
): { valorantRoles: string | null; rankTier: string | null } {
  const snapshotRoles = Array.isArray(snapshot?.roles)
    ? (snapshot.roles as ValorantRole[])
    : [];
  const roles = profile?.valorantRoles?.length ? profile.valorantRoles : snapshotRoles;

  return {
    valorantRoles: formatValorantRolesList(roles),
    rankTier: displayCurrentValorantRank(leaderboard, snapshot?.rankTier ?? null),
  };
}

/**
 * Admin/current-rank display. Auction bidding still uses peak when current is Unranked.
 * If the live board has a current rank (including Unranked), show that — never substitute peak.
 */
export function displayCurrentValorantRank(
  leaderboard: { rankTier: string | null; rankTierId: number | null } | null | undefined,
  snapshotRankTier?: string | null,
): string | null {
  const hasLiveCurrent =
    leaderboard != null &&
    (leaderboard.rankTierId != null || Boolean(leaderboard.rankTier?.trim()));
  if (!hasLiveCurrent) return snapshotRankTier ?? null;

  const id = leaderboard.rankTierId;
  const name = leaderboard.rankTier?.trim() ?? "";
  const unranked =
    (id != null && id <= 0) ||
    !name ||
    name.toLowerCase() === "unranked" ||
    name.toLowerCase() === "unused";
  if (unranked) return "Unranked";
  return name;
}

function isRankNa(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return value.trim().toUpperCase() === "NA";
}

/** At least one CS2 rank field must be set (NA is valid for unranked players). */
export function validateCs2RanksForTryout(
  faceit: string | null | undefined,
  premier: string | null | undefined,
): string | null {
  const hasFaceit = Boolean(faceit?.trim());
  const hasPremier = Boolean(premier?.trim());
  if (!hasFaceit && !hasPremier) {
    return "Set your CS2 Faceit or Premier rank on your profile (use NA if unranked).";
  }
  return null;
}

/** Both Faceit and Premier must be set on profile (each may be NA). */
export function validateCs2RanksForRegistration(
  faceit: string | null | undefined,
  premier: string | null | undefined,
): string | null {
  if (!faceit?.trim() || !premier?.trim()) {
    return "Complete your CS2 Faceit and Premier ranks on your profile.";
  }
  return null;
}

export function userHasRequiredGameLinks(
  playedGames: PlayedGame[],
  user: {
    riotPuuid: string | null;
    steamId64: string | null;
  },
): { ok: true } | { ok: false; missing: PlayedGame[] } {
  const missing: PlayedGame[] = [];
  if (playedGames.includes("VALORANT") && !user.riotPuuid) missing.push("VALORANT");
  if (playedGames.includes("CS2") && !user.steamId64) missing.push("CS2");
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}
