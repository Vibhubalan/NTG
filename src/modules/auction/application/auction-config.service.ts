import { prisma } from "@core/database/client";
import {
  DEFAULT_CS2_PRIORITY,
  DEFAULT_STARTING_BUDGET,
  defaultRankConfigForGame,
  type AuctionRankConfig,
  type FloorSource,
} from "../domain/rank-pricing";

const AUCTION_RULES_KEY = "auction_rules";

/** Session/economy defaults stored alongside the pricing tables. */
export type AuctionEconomyDefaults = {
  startingBudget: number;
  rosterSize: number;
  timerSeconds: number;
  minBidIncrement: number;
};

export type AuctionRulesConfig = {
  version: 1;
  economy: AuctionEconomyDefaults;
  cs2: AuctionRankConfig;
  valorant: AuctionRankConfig;
};

export function defaultAuctionRules(): AuctionRulesConfig {
  return {
    version: 1,
    economy: {
      startingBudget: DEFAULT_STARTING_BUDGET.CS2 ?? 150,
      rosterSize: 3,
      timerSeconds: 15,
      minBidIncrement: 1,
    },
    cs2: defaultRankConfigForGame("CS2"),
    valorant: defaultRankConfigForGame("VALORANT"),
  };
}

const VALID_SOURCES: FloorSource[] = ["premier", "hours", "faceit", "valorant"];

function sanitizePriority(raw: unknown): FloorSource[] {
  if (!Array.isArray(raw)) return [...DEFAULT_CS2_PRIORITY];
  const seen = new Set<FloorSource>();
  const out: FloorSource[] = [];
  for (const item of raw) {
    if (VALID_SOURCES.includes(item as FloorSource) && !seen.has(item as FloorSource)) {
      seen.add(item as FloorSource);
      out.push(item as FloorSource);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_CS2_PRIORITY];
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

function sanitizeTiers<T extends Record<string, number | string>>(
  raw: unknown,
  fallback: T[],
  keys: (keyof T)[],
): T[] {
  if (!Array.isArray(raw)) return fallback;
  const rows = raw.filter(
    (row): row is T =>
      row != null &&
      typeof row === "object" &&
      keys.every((k) => (row as Record<string, unknown>)[k as string] != null),
  );
  return rows.length > 0 ? rows : fallback;
}

function sanitizeRankConfig(raw: unknown, game: "CS2" | "VALORANT"): AuctionRankConfig {
  const base = defaultRankConfigForGame(game);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const cfg = raw as Partial<AuctionRankConfig>;
  const out: AuctionRankConfig = {
    version: 2,
    naFloor: clampInt(cfg.naFloor, base.naFloor, 0, 100),
  };
  if (game === "CS2") {
    out.priority = sanitizePriority(cfg.priority);
    out.premier = sanitizeTiers(cfg.premier, base.premier ?? [], ["minRating", "floor"]);
    out.faceit = sanitizeTiers(cfg.faceit, base.faceit ?? [], ["level", "floor"]);
    out.hours = sanitizeTiers(cfg.hours, base.hours ?? [], ["minHours", "floor"]);
    out.valorantFallback = sanitizeTiers(cfg.valorantFallback, base.valorantFallback ?? [], ["rank", "floor"]);
  } else {
    out.valorant = sanitizeTiers(cfg.valorant, base.valorant ?? [], ["rank", "floor"]);
  }
  return out;
}

export function sanitizeAuctionRules(raw: unknown): AuctionRulesConfig {
  const base = defaultAuctionRules();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const cfg = raw as Partial<AuctionRulesConfig>;
  const economy = (cfg.economy ?? {}) as Partial<AuctionEconomyDefaults>;
  return {
    version: 1,
    economy: {
      startingBudget: clampInt(economy.startingBudget, base.economy.startingBudget, 1, 10000),
      rosterSize: clampInt(economy.rosterSize, base.economy.rosterSize, 1, 20),
      timerSeconds: clampInt(economy.timerSeconds, base.economy.timerSeconds, 3, 300),
      minBidIncrement: clampInt(economy.minBidIncrement, base.economy.minBidIncrement, 1, 100),
    },
    cs2: sanitizeRankConfig(cfg.cs2, "CS2"),
    valorant: sanitizeRankConfig(cfg.valorant, "VALORANT"),
  };
}

/** Loads global auction rules from PlatformSetting, falling back to code defaults. */
export async function getAuctionRules(): Promise<AuctionRulesConfig> {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: AUCTION_RULES_KEY } });
    if (!row?.value) return defaultAuctionRules();
    return sanitizeAuctionRules(JSON.parse(row.value));
  } catch {
    return defaultAuctionRules();
  }
}

export async function saveAuctionRules(
  raw: unknown,
  updatedById?: string,
): Promise<AuctionRulesConfig> {
  const rules = sanitizeAuctionRules(raw);
  await prisma.platformSetting.upsert({
    where: { key: AUCTION_RULES_KEY },
    create: { key: AUCTION_RULES_KEY, value: JSON.stringify(rules), updatedById: updatedById ?? null },
    update: { value: JSON.stringify(rules), updatedById: updatedById ?? null },
  });
  return rules;
}

export async function resetAuctionRules(updatedById?: string): Promise<AuctionRulesConfig> {
  return saveAuctionRules(defaultAuctionRules(), updatedById);
}

/** Rank config for a game, honoring the globally configured rules. */
export async function getRankConfigForGame(game: string): Promise<AuctionRankConfig> {
  const rules = await getAuctionRules();
  if (game === "CS2") return rules.cs2;
  if (game === "VALORANT") return rules.valorant;
  return defaultRankConfigForGame(game);
}
