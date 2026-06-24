import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { sortValorantBoardEntries, computeValorantBoardSnapshotRanks } from "@/lib/leaderboard-sort";
import { henrikFetch, henrikHeaders } from "@/lib/henrik-client";
import { normalizeRiotPlayerCardUrls } from "@/lib/valorant-player-card";
import { mmrRegionsToTry, normalizeHenrikRegion } from "@/lib/henrik-region";
import {
  getActSeasonStats,
  isActSeasonRanked,
  resolveCurrentActSeason,
  type HenrikActSeasonStats,
} from "@/lib/valorant-act";
import { GameSlug, LeaderboardScope, LeaderboardSyncSource, Prisma } from "@prisma/client";

export const UNRANKED_TIER_ID = 0;
export const UNRANKED_TIER_NAME = "Unranked";
const PLATFORM = "pc";
/** Henrik spacing (~2.1s/call) — 1 player/batch (~6.3s for v2+v3+card). */
export const RANK_SYNC_BATCH_SIZE = 1;
/** @deprecated use RANK_SYNC_BATCH_SIZE */
export const RANK_SYNC_MAX_BATCH_SIZE = RANK_SYNC_BATCH_SIZE;
export const RANK_SYNC_ADMIN_BATCH_SIZE = RANK_SYNC_BATCH_SIZE;

export type RankSyncSource =
  | "cron"
  | "manual"
  | "profile"
  | "riot_link"
  | "registration"
  | "admin_member";

export type RankSyncContext = {
  source: RankSyncSource;
  runId?: string;
  adminId?: string;
  /** Manual sync only: act used to judge current ranked vs unranked. */
  currentActOverride?: string | null;
};
function toPrismaSyncSource(source: RankSyncSource): LeaderboardSyncSource {
  const map: Record<RankSyncSource, LeaderboardSyncSource> = {
    cron: LeaderboardSyncSource.CRON,
    manual: LeaderboardSyncSource.MANUAL,
    profile: LeaderboardSyncSource.PROFILE,
    riot_link: LeaderboardSyncSource.RIOT_LINK,
    registration: LeaderboardSyncSource.REGISTRATION,
    admin_member: LeaderboardSyncSource.ADMIN_MEMBER,
  };
  return map[source];
}

type RankSnapshotFields = {
  rankTier: string | null;
  rankTierId: number | null;
  mmr: number | null;
};

function rankChanged(
  previous: RankSnapshotFields | null,
  snapshot: RankSnapshotFields,
): boolean {
  if (!previous?.rankTier && previous?.mmr == null) return true;
  return (
    previous.rankTier !== snapshot.rankTier ||
    previous.rankTierId !== snapshot.rankTierId ||
    previous.mmr !== snapshot.mmr
  );
}

async function writeRankAudit(params: {
  userId: string;
  riotGameName?: string | null;
  riotTagLine?: string | null;
  context: RankSyncContext;
  previous: RankSnapshotFields | null;
  snapshot?: RankSnapshotFields | null;
  error?: string;
}): Promise<void> {
  const changed = params.snapshot
    ? rankChanged(params.previous, params.snapshot)
    : false;

  await prisma.leaderboardRankAuditLog.create({
    data: {
      userId: params.userId,
      riotGameName: params.riotGameName ?? null,
      riotTagLine: params.riotTagLine ?? null,
      source: toPrismaSyncSource(params.context.source),
      runId: params.context.runId ?? null,
      adminId: params.context.adminId ?? null,
      previousRankTier: params.previous?.rankTier ?? null,
      previousRankTierId: params.previous?.rankTierId ?? null,
      previousMmr: params.previous?.mmr ?? null,
      newRankTier: params.snapshot?.rankTier ?? null,
      newRankTierId: params.snapshot?.rankTierId ?? null,
      newMmr: params.snapshot?.mmr ?? null,
      changed,
      error: params.error ?? null,
    },
  });
}

async function readTownRankSnapshot(userId: string): Promise<RankSnapshotFields | null> {
  const entry = await prisma.leaderboardEntry.findFirst({
    where: {
      game: GameSlug.VALORANT,
      scope: LeaderboardScope.TOWN,
      seasonId: null,
      userId,
    },
    select: { rankTier: true, rankTierId: true, mmr: true },
  });
  if (!entry) return null;
  return {
    rankTier: entry.rankTier,
    rankTierId: entry.rankTierId,
    mmr: entry.mmr,
  };
}
const SYNC_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_BASE_MS = 1_500;

export type MmrSnapshot = {
  mmr: number;
  rankTier: string;
  rankTierId: number;
  gameName?: string;
  tagLine?: string;
};

type HenrikV3MmrResponse = {
  status?: number;
  data?: {
    account?: { name?: string; tag?: string; puuid?: string };
    current?: {
      tier?: { id?: number; name?: string };
      rr?: number;
      elo?: number;
    };
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type HenrikMmrParseResult =
  | { kind: "ranked"; snapshot: MmrSnapshot }
  | { kind: "unranked"; gameName?: string; tagLine?: string };

function parseV3MmrBody(body: HenrikV3MmrResponse): HenrikMmrParseResult | null {
  const current = body.data?.current;
  const tierId = current?.tier?.id;

  if (current && (tierId == null || tierId <= 0)) {
    return {
      kind: "unranked",
      gameName: body.data?.account?.name,
      tagLine: body.data?.account?.tag,
    };
  }

  if (tierId == null || !current) return null;

  const mmr =
    current.elo ??
    (typeof current.rr === "number" ? estimateEloFromTier(tierId, current.rr) : null);
  if (mmr == null) return null;

  return {
    kind: "ranked",
    snapshot: {
      mmr,
      rankTier: current.tier?.name ?? UNRANKED_TIER_NAME,
      rankTierId: tierId,
      gameName: body.data?.account?.name,
      tagLine: body.data?.account?.tag,
    },
  };
}

/** Rough MMR when Henrik omits `elo` but returns tier + RR. */
function estimateEloFromTier(tierId: number, rr: number): number {
  return tierId * 100 + rr;
}

async function fetchV3MmrByPuuid(
  region: string,
  puuid: string,
): Promise<HenrikMmrParseResult | null> {
  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v3/by-puuid/mmr/${region}/${PLATFORM}/${puuid}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`MMR lookup failed (${res.status})`);
  }

  const body = (await res.json()) as HenrikV3MmrResponse;
  return parseV3MmrBody(body);
}

async function fetchV3MmrByName(
  region: string,
  gameName: string,
  tagLine: string,
): Promise<HenrikMmrParseResult | null> {
  const encodedName = encodeURIComponent(gameName);
  const encodedTag = encodeURIComponent(tagLine);
  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v3/mmr/${region}/${PLATFORM}/${encodedName}/${encodedTag}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`MMR lookup failed (${res.status})`);
  }

  const body = (await res.json()) as HenrikV3MmrResponse;
  return parseV3MmrBody(body);
}

type HenrikV2MmrResponse = {
  data?: {
    current_data?: {
      season?: string;
      currenttierpatched?: string;
      currenttier?: number;
    };
    highest_rank?: {
      patched_tier?: string;
      tier?: number;
      season?: string;
    };
    by_season?: Record<string, HenrikActSeasonStats>;
  };
};

export type HenrikLifetimeRankMeta = {
  currentAct: string | null;
  peakRankTier: string | null;
  peakRankTierId: number | null;
  peakAct: string | null;
};

export type HenrikV2MmrBundle = {
  lifetime: HenrikLifetimeRankMeta;
  bySeason: Record<string, HenrikActSeasonStats>;
  currentActSeason: string | null;
};

function parseHenrikV2Body(
  body: HenrikV2MmrResponse,
  currentActOverride?: string | null,
): HenrikV2MmrBundle | null {
  const data = body.data;
  if (!data) return null;

  const highest = data.highest_rank;
  const currentActSeason = resolveCurrentActSeason({
    overrideAct: currentActOverride,
    envAct: serverEnv.valorantCurrentAct,
    currentDataSeason: data.current_data?.season,
  });

  return {
    lifetime: {
      currentAct: currentActSeason ?? data.current_data?.season ?? null,
      peakRankTier: highest?.patched_tier ?? null,
      peakRankTierId: typeof highest?.tier === "number" ? highest.tier : null,
      peakAct: highest?.season ?? null,
    },
    bySeason: data.by_season ?? {},
    currentActSeason,
  };
}

/** Henrik v2/mmr — current act, lifetime peak, and per-act history. */
export async function fetchHenrikV2MmrBundle(
  region: string,
  gameName: string,
  tagLine: string,
  options?: { currentActOverride?: string | null },
): Promise<HenrikV2MmrBundle | null> {
  if (!serverEnv.henrikdevApiKey) return null;

  const encodedName = encodeURIComponent(gameName);
  const encodedTag = encodeURIComponent(tagLine);
  const reg = normalizeHenrikRegion(region);
  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v2/mmr/${reg}/${encodedName}/${encodedTag}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );

  if (!res.ok) return null;

  const body = (await res.json()) as HenrikV2MmrResponse;
  return parseHenrikV2Body(body, options?.currentActOverride);
}

/** @deprecated use fetchHenrikV2MmrBundle */
export async function fetchHenrikV2Lifetime(
  region: string,
  gameName: string,
  tagLine: string,
): Promise<HenrikLifetimeRankMeta | null> {
  const bundle = await fetchHenrikV2MmrBundle(region, gameName, tagLine);
  return bundle?.lifetime ?? null;
}

function currentActIsUnranked(bundle: HenrikV2MmrBundle | null): boolean {
  if (!bundle?.currentActSeason) return false;
  const stats = getActSeasonStats(bundle.bySeason, bundle.currentActSeason);
  return !isActSeasonRanked(stats);
}

function lifetimeDbFields(lifetime: HenrikLifetimeRankMeta | null): {
  currentAct?: string | null;
} {
  if (!lifetime) return {};
  return { currentAct: lifetime.currentAct };
}

export async function fetchCompetitiveMmr(
  region: string,
  gameName: string,
  tagLine: string,
  puuid?: string,
  options?: { tryAllRegions?: boolean },
): Promise<
  | { status: "ranked"; snapshot: MmrSnapshot; region: string }
  | { status: "unranked"; region: string; gameName?: string; tagLine?: string }
  | null
> {
  const apiKey = serverEnv.henrikdevApiKey;

  if (!apiKey && process.env.NODE_ENV === "development") {
    const hash = `${gameName}${tagLine}`.length;
    const mmr = 1200 + (hash % 800);
    const tierId = 12 + (hash % 10);
    const tiers = [
      "Gold 1",
      "Gold 2",
      "Gold 3",
      "Platinum 1",
      "Platinum 2",
      "Platinum 3",
      "Diamond 1",
      "Diamond 2",
      "Diamond 3",
      "Ascendant 1",
    ];
    return {
      region: normalizeHenrikRegion(region),
      status: "ranked" as const,
      snapshot: {
        mmr,
        rankTier: tiers[hash % tiers.length]!,
        rankTierId: tierId,
      },
    };
  }

  if (!apiKey) return null;

  const regions = options?.tryAllRegions
    ? mmrRegionsToTry(region)
    : [normalizeHenrikRegion(region)];

  for (const reg of regions) {
    try {
      if (puuid) {
        const byPuuid = await fetchV3MmrByPuuid(reg, puuid);
        if (byPuuid?.kind === "ranked") {
          return { status: "ranked", snapshot: byPuuid.snapshot, region: reg };
        }
        if (byPuuid?.kind === "unranked") {
          return {
            status: "unranked",
            region: reg,
            gameName: byPuuid.gameName,
            tagLine: byPuuid.tagLine,
          };
        }
        continue;
      }

      const byName = await fetchV3MmrByName(reg, gameName, tagLine);
      if (byName?.kind === "ranked") {
        return { status: "ranked", snapshot: byName.snapshot, region: reg };
      }
      if (byName?.kind === "unranked") {
        return {
          status: "unranked",
          region: reg,
          gameName: byName.gameName,
          tagLine: byName.tagLine,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function syncUserRank(
  userId: string,
  options?: {
    tryAllRegions?: boolean;
    skipPlayerCard?: boolean;
    context?: RankSyncContext;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  const auditContext = options?.context;
  const previousRank = auditContext ? await readTownRankSnapshot(userId) : null;

  async function fail(error: string): Promise<{ ok: false; error: string }> {
    if (auditContext) {
      await writeRankAudit({
        userId,
        riotGameName: user?.riotGameName,
        riotTagLine: user?.riotTagLine,
        context: auditContext,
        previous: previousRank,
        error,
      }).catch(() => {});
    }
    return { ok: false, error };
  }

  if (!user?.riotPuuid || !user.riotGameName || !user.riotTagLine) {
    return fail("Riot ID not linked.");
  }

  const region = normalizeHenrikRegion(user.riotRegion);
  const syncName = user.riotGameName;
  const syncTag = user.riotTagLine;
  const actOverride = options?.context?.currentActOverride ?? null;
  const v2Opts = { currentActOverride: actOverride };

  let v2Bundle: HenrikV2MmrBundle | null = null;
  try {
    v2Bundle = await fetchHenrikV2MmrBundle(region, syncName, syncTag, v2Opts);
  } catch {
    v2Bundle = null;
  }

  let fetched:
    | { status: "ranked"; snapshot: MmrSnapshot; region: string }
    | { status: "unranked"; region: string; gameName?: string; tagLine?: string }
    | null;
  try {
    fetched = await fetchCompetitiveMmr(
      region,
      syncName,
      syncTag,
      user.riotPuuid,
      { tryAllRegions: options?.tryAllRegions ?? false },
    );
  } catch {
    return fail("Could not fetch rank from Riot.");
  }

  if (!fetched && v2Bundle) {
    fetched = {
      status: "unranked",
      region,
      gameName: syncName,
      tagLine: syncTag,
    };
  }

  if (!fetched) {
    if (!serverEnv.henrikdevApiKey) {
      return fail("Rank sync is not configured (HENRIKDEV_API_KEY).");
    }
    return fail("No competitive rank data found.");
  }

  const { region: resolvedRegion } = fetched;
  const resolvedGameName =
    fetched.status === "ranked" ? fetched.snapshot.gameName : fetched.gameName;
  const resolvedTagLine =
    fetched.status === "ranked" ? fetched.snapshot.tagLine : fetched.tagLine;

  const lookupName = resolvedGameName || syncName;
  const lookupTag = resolvedTagLine || syncTag;
  if (resolvedRegion !== region || !v2Bundle) {
    try {
      v2Bundle = await fetchHenrikV2MmrBundle(resolvedRegion, lookupName, lookupTag, v2Opts);
    } catch {
      /* keep prior bundle if any */
    }
  }

  if (currentActIsUnranked(v2Bundle)) {
    fetched = {
      status: "unranked",
      region: resolvedRegion,
      gameName: lookupName,
      tagLine: lookupTag,
    };
  }

  const actFields = lifetimeDbFields(v2Bundle?.lifetime ?? null);

  let cardLarge: string | undefined;
  let cardWide: string | undefined;
  if (!options?.skipPlayerCard) {
    try {
      const name = resolvedGameName || user.riotGameName;
      const tag = resolvedTagLine || user.riotTagLine;
      const encodedName = encodeURIComponent(name);
      const encodedTag = encodeURIComponent(tag);
      const res = await henrikFetch(
        `https://api.henrikdev.xyz/valorant/v1/account/${encodedName}/${encodedTag}`,
        { headers: henrikHeaders(), next: { revalidate: 0 } },
      );
      if (res.ok) {
        const accData = (await res.json()) as { data?: { card?: { large?: string; wide?: string } } };
        cardLarge = accData.data?.card?.large;
        cardWide = accData.data?.card?.wide;
      }
    } catch (e) {
      console.error("Failed to fetch player card on rank sync:", e);
    }
  }

  const userUpdateData: Prisma.UserUpdateInput = {};
  if (resolvedGameName && resolvedTagLine) {
    userUpdateData.riotGameName = resolvedGameName;
    userUpdateData.riotTagLine = resolvedTagLine;
  }
  if (resolvedRegion !== user.riotRegion) {
    userUpdateData.riotRegion = resolvedRegion;
  }
  if (cardLarge) {
    const cards = normalizeRiotPlayerCardUrls(cardLarge, cardWide);
    if (cards.large) userUpdateData.riotPlayerCard = cards.large;
    if (cards.wide) userUpdateData.riotPlayerCardWide = cards.wide;
  } else if (cardWide) {
    userUpdateData.riotPlayerCardWide = cardWide;
  }

  if (Object.keys(userUpdateData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
    });
  }

  const existing = await prisma.leaderboardEntry.findFirst({
    where: {
      game: GameSlug.VALORANT,
      scope: "TOWN",
      seasonId: null,
      userId,
    },
  });

  if (fetched.status === "unranked") {
    const unrankedData = {
      mmr: null,
      rankTier: UNRANKED_TIER_NAME,
      rankTierId: UNRANKED_TIER_ID,
      ...actFields,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      await prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: unrankedData,
      });
    } else {
      await prisma.leaderboardEntry.create({
        data: {
          game: GameSlug.VALORANT,
          scope: "TOWN",
          userId,
          ...unrankedData,
        },
      });
    }

    if (auditContext) {
      await writeRankAudit({
        userId,
        riotGameName: user.riotGameName,
        riotTagLine: user.riotTagLine,
        context: auditContext,
        previous: previousRank,
        snapshot: {
          rankTier: UNRANKED_TIER_NAME,
          rankTierId: UNRANKED_TIER_ID,
          mmr: null,
        },
      }).catch(() => {});
    }

    return { ok: true };
  }

  const { snapshot } = fetched;

  const data = {
    mmr: snapshot.mmr,
    rankTier: snapshot.rankTier,
    rankTierId: snapshot.rankTierId,
    ...actFields,
    lastSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.leaderboardEntry.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.leaderboardEntry.create({
      data: {
        game: GameSlug.VALORANT,
        scope: "TOWN",
        userId,
        ...data,
      },
    });
  }

  if (auditContext) {
    await writeRankAudit({
      userId,
      riotGameName: user.riotGameName,
      riotTagLine: user.riotTagLine,
      context: auditContext,
      previous: previousRank,
      snapshot: {
        rankTier: snapshot.rankTier,
        rankTierId: snapshot.rankTierId,
        mmr: snapshot.mmr,
      },
    }).catch(() => {});
  }

  return { ok: true };
}

/** Prevents the same user from blocking overnight batches after retryable failures. */
async function markSyncAttempted(userId: string): Promise<void> {
  await prisma.leaderboardEntry.updateMany({
    where: {
      userId,
      game: GameSlug.VALORANT,
      scope: "TOWN",
      seasonId: null,
    },
    data: { lastSyncedAt: new Date() },
  });
}

const NON_RETRYABLE_ERRORS = new Set([
  "Riot ID not linked.",
  "No competitive rank data found.",
  "Rank sync is not configured (HENRIKDEV_API_KEY).",
]);

async function syncUserRankWithRetry(
  userId: string,
  options?: {
    tryAllRegions?: boolean;
    skipPlayerCard?: boolean;
    context?: RankSyncContext;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  let last: { ok: false; error: string } = { ok: false, error: "Sync failed." };

  for (let attempt = 0; attempt < SYNC_RETRY_ATTEMPTS; attempt++) {
    const result = await syncUserRank(userId, options);
    if (result.ok) return result;

    last = result;
    if (NON_RETRYABLE_ERRORS.has(result.error)) return result;

    if (attempt < SYNC_RETRY_ATTEMPTS - 1) {
      await sleep(SYNC_RETRY_BASE_MS * (attempt + 1));
    }
  }

  return last;
}

type LinkedPlayerFilter = {
  fullRefreshBefore?: Date;
};

function linkedPlayerWhere(filter: LinkedPlayerFilter = {}): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = {
    signupCompleted: true,
    riotPuuid: { not: null },
    riotGameName: { not: null },
    riotTagLine: { not: null },
  };

  if (!filter.fullRefreshBefore) {
    return base;
  }

  return {
    ...base,
    OR: [
      {
        leaderboard: {
          none: { game: GameSlug.VALORANT, scope: LeaderboardScope.TOWN, seasonId: null },
        },
      },
      {
        leaderboard: {
          some: {
            game: GameSlug.VALORANT,
            scope: LeaderboardScope.TOWN,
            seasonId: null,
            lastSyncedAt: { lt: filter.fullRefreshBefore },
          },
        },
      },
    ],
  };
}

export type SyncAllResult = {
  synced: number;
  failed: number;
  skipped: number;
  hasMore: boolean;
  pending: number;
  batchSize: number;
};

export type SyncRunTotals = {
  synced: number;
  failed: number;
  skipped: number;
  batches: number;
};

export type LeaderboardSyncStats = {
  linkedPlayers: number;
  rankedOnLeaderboard: number;
  lastSyncedAt: string | null;
  cronScheduleIst: string;
};

const LINKED_PLAYER_WHERE: Prisma.UserWhereInput = {
  signupCompleted: true,
  riotPuuid: { not: null },
  riotGameName: { not: null },
  riotTagLine: { not: null },
};

export async function getLeaderboardSyncStats(): Promise<LeaderboardSyncStats> {
  const [linkedPlayers, rankedOnLeaderboard, lastEntry] = await Promise.all([
    prisma.user.count({ where: LINKED_PLAYER_WHERE }),
    prisma.leaderboardEntry.count({
      where: {
        game: GameSlug.VALORANT,
        scope: LeaderboardScope.TOWN,
        seasonId: null,
      },
    }),
    prisma.leaderboardEntry.aggregate({
      where: {
        game: GameSlug.VALORANT,
        scope: LeaderboardScope.TOWN,
        seasonId: null,
      },
      _max: { lastSyncedAt: true },
    }),
  ]);

  return {
    linkedPlayers,
    rankedOnLeaderboard,
    lastSyncedAt: lastEntry._max.lastSyncedAt?.toISOString() ?? null,
    cronScheduleIst: "Daily 3:30 AM IST (22:00 UTC)",
  };
}

export async function snapshotTownBoardRanks(): Promise<number> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: {
      game: GameSlug.VALORANT,
      scope: LeaderboardScope.TOWN,
      seasonId: null,
    },
    include: {
      user: {
        include: { playerProfile: true },
      },
    },
  });

  const mapped = entries.map((e) => ({
    id: e.id,
    rank: e.rank ?? 0,
    mmr: e.mmr,
    rankTierId: e.rankTierId,
    displayName: e.user.playerProfile?.displayName ?? e.user.name ?? "Player",
  }));

  const sorted = computeValorantBoardSnapshotRanks(mapped);

  await prisma.$transaction(
    sorted.map((row) =>
      prisma.leaderboardEntry.update({
        where: { id: row.id },
        data: { rank: row.rank },
      }),
    ),
  );

  return sorted.length;
}

export async function syncAllLinkedPlayers(options?: {
  /** When set, only players not synced since this timestamp (daily full refresh). */
  fullRefreshBefore?: Date;
  maxBatchSize?: number;
  /** Try all Henrik regions per player (single-player sync only — too slow for batches). */
  tryAllRegions?: boolean;
  /** Skip player-card fetch during bulk refresh (saves ~2s Henrik call per player). */
  skipPlayerCard?: boolean;
  /** Snapshot current board order before syncing (act reset / full refresh). */
  snapshotRanks?: boolean;
  context?: RankSyncContext;
}): Promise<SyncAllResult> {
  if (options?.snapshotRanks) {
    await snapshotTownBoardRanks();
  }

  const maxBatchSize = Math.min(
    options?.maxBatchSize ?? RANK_SYNC_BATCH_SIZE,
    RANK_SYNC_BATCH_SIZE,
  );
  const where = linkedPlayerWhere({ fullRefreshBefore: options?.fullRefreshBefore });

  const [users, pendingBefore] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true },
      orderBy: { updatedAt: "asc" },
      take: maxBatchSize,
    }),
    prisma.user.count({ where }),
  ]);

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    const result = await syncUserRankWithRetry(user.id, {
      tryAllRegions: options?.tryAllRegions ?? false,
      skipPlayerCard: options?.skipPlayerCard ?? false,
      context: options?.context,
    });
    if (result.ok) synced += 1;
    else if (result.error === "No competitive rank data found.") failed += 1;
    else {
      failed += 1;
      await markSyncAttempted(user.id).catch(() => {});
    }
  }

  const pending = Math.max(0, pendingBefore - users.length);

  return {
    synced,
    failed,
    skipped,
    hasMore: pending > 0,
    pending,
    batchSize: users.length,
  };
}

/** Run batched full refresh until all linked players are processed. */
export async function runFullLeaderboardSync(options?: {
  fullRefreshBefore?: Date;
  tryAllRegions?: boolean;
  snapshotRanks?: boolean;
  context?: RankSyncContext;
  onBatch?: (batch: SyncAllResult, totals: SyncRunTotals) => void;
}): Promise<SyncRunTotals & { complete: true }> {
  const runStartedAt = options?.fullRefreshBefore ?? new Date();
  const runId = options?.context?.runId ?? runStartedAt.toISOString();
  const totals: SyncRunTotals = { synced: 0, failed: 0, skipped: 0, batches: 0 };

  let hasMore = true;
  let snapshotRanks = options?.snapshotRanks ?? true;
  while (hasMore) {
    const batch = await syncAllLinkedPlayers({
      fullRefreshBefore: runStartedAt,
      tryAllRegions: options?.tryAllRegions,
      snapshotRanks,
      context: options?.context
        ? { ...options.context, runId }
        : undefined,
    });
    snapshotRanks = false;
    totals.synced += batch.synced;
    totals.failed += batch.failed;
    totals.skipped += batch.skipped;
    totals.batches += 1;
    options?.onBatch?.(batch, totals);
    hasMore = batch.hasMore;
  }

  return { ...totals, complete: true };
}

export type LeaderboardRankAuditRow = {
  id: string;
  userId: string;
  displayName: string | null;
  riotId: string | null;
  source: LeaderboardSyncSource;
  runId: string | null;
  previousRankTier: string | null;
  previousMmr: number | null;
  newRankTier: string | null;
  newMmr: number | null;
  changed: boolean;
  error: string | null;
  createdAt: string;
};

export async function listLeaderboardRankAudits(options?: {
  limit?: number;
  changedOnly?: boolean;
  source?: LeaderboardSyncSource;
}): Promise<LeaderboardRankAuditRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  const rows = await prisma.leaderboardRankAuditLog.findMany({
    where: {
      ...(options?.changedOnly ? { changed: true } : {}),
      ...(options?.source ? { source: options.source } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          riotGameName: true,
          riotTagLine: true,
          playerProfile: { select: { displayName: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    displayName: row.user.playerProfile?.displayName ?? row.user.name,
    riotId:
      row.riotGameName && row.riotTagLine
        ? `${row.riotGameName}#${row.riotTagLine}`
        : row.user.riotGameName && row.user.riotTagLine
          ? `${row.user.riotGameName}#${row.user.riotTagLine}`
          : null,
    source: row.source,
    runId: row.runId,
    previousRankTier: row.previousRankTier,
    previousMmr: row.previousMmr,
    newRankTier: row.newRankTier,
    newMmr: row.newMmr,
    changed: row.changed,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  }));
}
