/**
 * Rank -> floor pricing used by integrated auction.
 * CS2 evaluation priority is configurable; default per requirements:
 * Premier -> Hours -> FACEIT -> Valorant fallback -> Noobie(naFloor).
 */

export type PremierTier = { minRating: number; floor: number };
export type FaceitTier = { level: number; floor: number };
export type HoursTier = { minHours: number; floor: number };
export type ValorantTier = { rank: string; floor: number };

export type FloorSource = "premier" | "hours" | "faceit" | "valorant";

export const DEFAULT_CS2_PRIORITY: FloorSource[] = ["premier", "hours", "faceit", "valorant"];

export type AuctionRankConfig = {
  version: 2;
  naFloor: number;
  /** CS2 evaluation order; first source that resolves wins. */
  priority?: FloorSource[];
  premier?: PremierTier[];
  faceit?: FaceitTier[];
  hours?: HoursTier[];
  valorantFallback?: ValorantTier[];
  valorant?: ValorantTier[];
};

export type RegistrationRanks = {
  snapshotRankTier?: string | null;
  snapshotCs2PeakPremier?: string | null;
  snapshotCs2FaceitRank?: string | null;
  snapshotCs2Hours?: number | null;
};

export const DEFAULT_STARTING_BUDGET: Record<string, number> = {
  VALORANT: 150,
  CS2: 150,
  EA_FC26: 150,
  OTHER: 150,
};

export const DEFAULT_CS2_RANK_CONFIG: AuctionRankConfig = {
  version: 2,
  naFloor: 2,
  priority: [...DEFAULT_CS2_PRIORITY],
  premier: [
    { minRating: 20000, floor: 15 },
    { minRating: 17000, floor: 13 },
    { minRating: 14000, floor: 11 },
    { minRating: 11000, floor: 9 },
    { minRating: 8000, floor: 7 },
    { minRating: 0, floor: 5 },
  ],
  faceit: [
    { level: 10, floor: 15 },
    { level: 9, floor: 14 },
    { level: 8, floor: 13 },
    { level: 7, floor: 12 },
    { level: 6, floor: 10 },
    { level: 5, floor: 9 },
    { level: 4, floor: 8 },
    { level: 3, floor: 7 },
    { level: 2, floor: 6 },
    { level: 1, floor: 5 },
  ],
  hours: [
    { minHours: 5000, floor: 14 },
    { minHours: 3000, floor: 12 },
    { minHours: 2000, floor: 10 },
    { minHours: 1000, floor: 8 },
    { minHours: 500, floor: 6 },
    { minHours: 200, floor: 5 },
    { minHours: 0, floor: 4 },
  ],
  valorantFallback: [
    { rank: "Radiant", floor: 13 },
    { rank: "Immortal", floor: 11 },
    { rank: "Ascendant", floor: 9 },
    { rank: "Diamond", floor: 7 },
    { rank: "Platinum", floor: 5 },
    { rank: "Gold", floor: 4 },
    { rank: "Silver", floor: 3 },
    { rank: "Bronze", floor: 3 },
    { rank: "Iron", floor: 3 },
    { rank: "Unranked", floor: 2 },
  ],
};

export const DEFAULT_VALORANT_RANK_CONFIG: AuctionRankConfig = {
  version: 2,
  naFloor: 2,
  valorant: [
    { rank: "Radiant", floor: 14 },
    { rank: "Immortal", floor: 12 },
    { rank: "Ascendant", floor: 10 },
    { rank: "Diamond", floor: 8 },
    { rank: "Platinum", floor: 6 },
    { rank: "Gold", floor: 4 },
    { rank: "Silver", floor: 2 },
    { rank: "Bronze", floor: 1 },
    { rank: "Iron", floor: 1 },
    { rank: "Unranked", floor: 2 },
  ],
};

export function defaultRankConfigForGame(game: string): AuctionRankConfig {
  if (game === "CS2") return structuredClone(DEFAULT_CS2_RANK_CONFIG);
  if (game === "VALORANT") return structuredClone(DEFAULT_VALORANT_RANK_CONFIG);
  return { version: 2, naFloor: 2, valorant: DEFAULT_VALORANT_RANK_CONFIG.valorant };
}

export function normalizeRankConfig(raw: unknown, game: string): AuctionRankConfig {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw as AuctionRankConfig).version === 2) {
    const cfg = raw as AuctionRankConfig;
    if (game === "CS2" && (!cfg.priority || cfg.priority.length === 0)) {
      return { ...cfg, priority: [...DEFAULT_CS2_PRIORITY] };
    }
    return cfg;
  }
  const base = defaultRankConfigForGame(game);
  if (Array.isArray(raw)) {
    const legacy = raw as { rank: string; floor: number }[];
    if (game === "CS2") base.valorantFallback = legacy;
    else base.valorant = legacy;
  }
  return base;
}

function isNaRank(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const v = value.trim().toUpperCase();
  return v === "NA" || v === "N/A" || v === "NONE" || v === "UNRANKED";
}

function parsePremierRating(raw: string | null | undefined): number | null {
  if (isNaRank(raw)) return null;
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function parseFaceitLevel(raw: string | null | undefined): number | null {
  if (isNaRank(raw)) return null;
  const match = String(raw).match(/(\d{1,2})/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return n;
}

function parseCs2Hours(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function floorFromValorantRank(rank: string, tiers: ValorantTier[]): number {
  const val = rank.toLowerCase();
  const hit = tiers.find((t) => val.includes(t.rank.toLowerCase()));
  return hit?.floor ?? 2;
}

export type FloorResolution = {
  floor: number;
  source: FloorSource | "valorant_fallback" | "na";
  label: string;
};

function tryResolveCs2Source(
  source: FloorSource,
  reg: RegistrationRanks,
  cfg: AuctionRankConfig,
): FloorResolution | null {
  switch (source) {
    case "premier": {
      const premier = parsePremierRating(reg.snapshotCs2PeakPremier);
      if (premier == null || !cfg.premier?.length) return null;
      const tier = [...cfg.premier].sort((a, b) => b.minRating - a.minRating).find((t) => premier >= t.minRating);
      return { floor: tier?.floor ?? cfg.naFloor, source: "premier", label: `Premier ${premier}` };
    }
    case "hours": {
      const hours = parseCs2Hours(reg.snapshotCs2Hours);
      if (hours == null || !cfg.hours?.length) return null;
      const tier = [...cfg.hours].sort((a, b) => b.minHours - a.minHours).find((t) => hours >= t.minHours);
      return { floor: tier?.floor ?? cfg.naFloor, source: "hours", label: `${hours} hrs` };
    }
    case "faceit": {
      const faceit = parseFaceitLevel(reg.snapshotCs2FaceitRank);
      if (faceit == null || !cfg.faceit?.length) return null;
      const tier = cfg.faceit.find((t) => t.level === faceit);
      return { floor: tier?.floor ?? cfg.naFloor, source: "faceit", label: `FACEIT ${faceit}` };
    }
    case "valorant": {
      const val = reg.snapshotRankTier;
      if (isNaRank(val) || !val || !cfg.valorantFallback?.length) return null;
      return {
        floor: floorFromValorantRank(val, cfg.valorantFallback),
        source: "valorant_fallback",
        label: `Valorant ${val}`,
      };
    }
  }
}

export function resolveFloor(game: string, reg: RegistrationRanks, config: AuctionRankConfig): FloorResolution {
  const cfg = normalizeRankConfig(config, game);

  if (game === "CS2") {
    const priority = cfg.priority?.length ? cfg.priority : DEFAULT_CS2_PRIORITY;
    for (const source of priority) {
      const hit = tryResolveCs2Source(source, reg, cfg);
      if (hit) return hit;
    }
    return { floor: cfg.naFloor, source: "na", label: "Noobie" };
  }

  const val = reg.snapshotRankTier;
  if (!isNaRank(val) && val && cfg.valorant?.length) {
    return { floor: floorFromValorantRank(val, cfg.valorant), source: "valorant", label: val };
  }
  return { floor: cfg.naFloor, source: "na", label: "Noobie" };
}

export function floorForRegistration(game: string, reg: RegistrationRanks, config: AuctionRankConfig): number {
  return resolveFloor(game, reg, config).floor;
}
