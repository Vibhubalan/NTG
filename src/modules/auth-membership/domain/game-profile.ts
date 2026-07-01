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

function isRankNa(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return value.trim().toUpperCase() === "NA";
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
