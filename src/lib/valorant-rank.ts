const RANK_NAMES = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
] as const;

/** Valorant competitive tier id → local rank badge filename (under /valorant/ranks/). */
export function rankIconFilename(tierId: number | null | undefined): string | null {
  if (tierId == null) return "Unranked_Rank.png";
  if (tierId <= 0) return "Unranked_Rank.png";
  if (tierId >= 27) return "Radiant_Rank.png";

  const index = tierId - 3;
  if (index < 0) return null;

  const rankIndex = Math.floor(index / 3);
  const division = (index % 3) + 1;
  if (rankIndex >= RANK_NAMES.length) return null;

  return `${RANK_NAMES[rankIndex]}_${division}_Rank.png`;
}

export function rankIconUrl(tierId: number | null | undefined): string | null {
  const file = rankIconFilename(tierId);
  if (!file) return null;
  return `/valorant/ranks/${file}`;
}

/** Henrik/Riot `elo` ≈ (tierId − 3) × 100 + RR within tier (0–100). */
export function rankEloFromTier(tierId: number, rr = 50): number {
  if (tierId >= 27) return 2400 + rr;
  if (tierId < 3) return rr;
  return (tierId - 3) * 100 + rr;
}

/** Min/max Henrik elo for a tier id (RR 0–100 within tier). */
export function rankEloRangeForTier(tierId: number): { min: number; max: number } {
  return { min: rankEloFromTier(tierId, 0), max: rankEloFromTier(tierId, 100) };
}

export function formatRankLabel(
  tierId: number | null | undefined,
  tierName: string | null | undefined,
): string {
  if (tierId != null && tierId <= 0) return "Unranked";
  if (tierName?.trim()) return tierName.trim();
  if (tierId == null) return "Unranked";
  return `Tier ${tierId}`;
}

/** Leaderboard RR column — unranked / no MMR shows "--". */
export function formatLeaderboardRr(mmr: number | null | undefined): string {
  return mmr != null ? mmr.toLocaleString() : "--";
}

export function tierBracket(tierId: number | null | undefined): string | null {
  if (tierId == null || tierId < 3) return null;
  if (tierId >= 27) return "RADIANT";
  if (tierId >= 24) return "IMMORTAL";
  if (tierId >= 21) return "ASCENDANT";
  if (tierId >= 18) return "DIAMOND";
  if (tierId >= 15) return "PLATINUM";
  if (tierId >= 12) return "GOLD";
  if (tierId >= 9) return "SILVER";
  if (tierId >= 6) return "BRONZE";
  return "IRON";
}

/** Minimum Henrik `elo` for the bottom of a rank bracket. */
export function bracketMinElo(bracket: string): number {
  const map: Record<string, number> = {
    RADIANT: 2400,
    IMMORTAL: 2100,
    ASCENDANT: 1800,
    DIAMOND: 1500,
    PLATINUM: 1200,
    GOLD: 900,
    SILVER: 600,
    BRONZE: 300,
    IRON: 0,
  };
  return map[bracket] ?? 0;
}

/** Accent color for rank tier row highlights. */
export function rankAccentClass(tierId: number | null | undefined): string {
  if (tierId == null || tierId <= 0) return "text-white/50";
  if (tierId >= 27) return "text-[#FF4655]"; // Radiant
  if (tierId >= 24) return "text-rose-300/90"; // Immortal
  if (tierId >= 21) return "text-emerald-300/90"; // Ascendant
  if (tierId >= 18) return "text-violet-300/90"; // Diamond
  if (tierId >= 15) return "text-cyan-300/80"; // Platinum
  if (tierId >= 12) return "text-amber-300/80"; // Gold
  if (tierId >= 9) return "text-slate-300/80"; // Silver
  if (tierId >= 6) return "text-orange-400/70"; // Bronze
  return "text-stone-400/70"; // Iron
}

/** Resolves rank tier string like "Ascendant 1" to local rank icon asset URL. */
export function rankIconFromTierName(rankTierStr: string | null | undefined): string {
  if (!rankTierStr || rankTierStr.toLowerCase().includes("unrated") || rankTierStr.toLowerCase().includes("unranked")) {
    return "/valorant/ranks/Unranked_Rank.png";
  }
  const clean = rankTierStr.trim();
  if (clean.toLowerCase() === "radiant") {
    return "/valorant/ranks/Radiant_Rank.png";
  }
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const name = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase();
    const div = parts[1];
    return `/valorant/ranks/${name}_${div}_Rank.png`;
  }
  return "/valorant/ranks/Unranked_Rank.png";
}

const TIER_NUM_MAP: Record<string, number> = {
  iron: 3,
  bronze: 6,
  silver: 9,
  gold: 12,
  platinum: 15,
  diamond: 18,
  ascendant: 21,
  immortal: 24,
  radiant: 27,
};

/** Rank brackets in order, lowest first. `minTierId` is Iron 1 / Bronze 1 / … / Radiant. */
export const RANK_BRACKET_FILTERS = [
  { key: "UNRANKED", label: "Unranked", minTierId: 0 },
  { key: "IRON", label: "Iron", minTierId: 3 },
  { key: "BRONZE", label: "Bronze", minTierId: 6 },
  { key: "SILVER", label: "Silver", minTierId: 9 },
  { key: "GOLD", label: "Gold", minTierId: 12 },
  { key: "PLATINUM", label: "Platinum", minTierId: 15 },
  { key: "DIAMOND", label: "Diamond", minTierId: 18 },
  { key: "ASCENDANT", label: "Ascendant", minTierId: 21 },
  { key: "IMMORTAL", label: "Immortal", minTierId: 24 },
  { key: "RADIANT", label: "Radiant", minTierId: 27 },
] as const;

export type RankBracketFilterKey = (typeof RANK_BRACKET_FILTERS)[number]["key"];

/**
 * Henrik tier id from a stored id or a rank label like "Gold 2" / "Radiant".
 * Unranked / missing → 0.
 */
export function parseRankToTierId(
  tierId: number | null | undefined,
  tierName: string | null | undefined,
): number {
  if (typeof tierId === "number" && Number.isFinite(tierId) && tierId > 0) {
    return tierId;
  }
  const raw = tierName?.trim();
  if (!raw) return 0;
  const lower = raw.toLowerCase();
  if (lower.includes("unrank") || lower.includes("unrate")) return 0;
  if (lower === "radiant") return 27;

  const parts = lower.split(/\s+/);
  const baseName = parts[0] ?? "";
  const baseVal = TIER_NUM_MAP[baseName];
  if (baseVal == null) return 0;
  if (baseName === "radiant") return 27;
  const div = parseInt(parts[1] || "1", 10);
  const offset = Number.isFinite(div) && div >= 1 ? Math.min(div, 3) - 1 : 0;
  return baseVal + offset;
}

/** Unranked matches only unranked. Any other bracket is that rank and above. */
export function rankMeetsMinBracket(
  tierId: number,
  minKey: RankBracketFilterKey | "",
): boolean {
  if (!minKey) return true;
  if (minKey === "UNRANKED") return tierId <= 0;
  const min = RANK_BRACKET_FILTERS.find((b) => b.key === minKey)?.minTierId ?? 0;
  return tierId >= min;
}

const ROMAN_MAP: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
};

/** Calculates average rank tier label for a team (e.g. "Ascendant I") */
export function calculateAverageRankLabel(rankTiers: (string | null | undefined)[]): string {
  const validNumericTiers: number[] = [];

  for (const tierStr of rankTiers) {
    if (!tierStr || tierStr.toLowerCase().includes("unrated")) continue;
    const parts = tierStr.trim().toLowerCase().split(/\s+/);
    const baseName = parts[0];
    const divNum = parseInt(parts[1] || "1", 10);
    const baseVal = TIER_NUM_MAP[baseName ?? ""];
    if (baseVal != null) {
      validNumericTiers.push(baseVal + (divNum - 1));
    }
  }

  if (validNumericTiers.length === 0) return "Unranked";
  const avg = Math.round(validNumericTiers.reduce((a, b) => a + b, 0) / validNumericTiers.length);

  if (avg >= 27) return "Radiant";
  if (avg < 3) return "Iron I";

  const index = avg - 3;
  const rankIndex = Math.floor(index / 3);
  const div = (index % 3) + 1;
  const rankName = RANK_NAMES[Math.min(rankIndex, RANK_NAMES.length - 1)] ?? "Ascendant";
  return `${rankName} ${ROMAN_MAP[div] ?? div}`;
}

