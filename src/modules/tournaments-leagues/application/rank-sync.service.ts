import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { henrikFetch, henrikHeaders } from "@/lib/henrik-client";
import { GameSlug } from "@prisma/client";

const PLATFORM = "pc";
/** Daily cron processes at most this many players per batch (~28 req/min with Henrik spacing). */
export const RANK_SYNC_MAX_BATCH_SIZE = 26;
const SYNC_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_BASE_MS = 1_500;

export type MmrSnapshot = {
  mmr: number;
  rankTier: string;
  rankTierId: number;
  peakMmr: number;
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
    peak?: {
      tier?: { id?: number; name?: string };
    };
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseV3MmrBody(body: HenrikV3MmrResponse): MmrSnapshot | null {
  const current = body.data?.current;
  if (!current?.tier?.id || current.elo == null) return null;

  const rankTierId = current.tier.id;
  const rankTier = current.tier.name ?? "Unranked";
  const mmr = current.elo;
  const peakTierId = body.data?.peak?.tier?.id ?? rankTierId;
  const peakMmr = Math.max(
    mmr,
    peakTierId > rankTierId ? mmr + (peakTierId - rankTierId) * 40 : mmr,
  );

  return {
    mmr,
    rankTier,
    rankTierId,
    peakMmr,
    gameName: body.data?.account?.name,
    tagLine: body.data?.account?.tag,
  };
}

async function fetchV3MmrByPuuid(
  region: string,
  puuid: string,
): Promise<MmrSnapshot | null> {
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
): Promise<MmrSnapshot | null> {
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

export async function fetchCompetitiveMmr(
  region: string,
  gameName: string,
  tagLine: string,
  puuid?: string,
): Promise<MmrSnapshot | null> {
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
      mmr,
      rankTier: tiers[hash % tiers.length]!,
      rankTierId: tierId,
      peakMmr: mmr + 120,
    };
  }

  if (!apiKey) return null;

  if (puuid) {
    const byPuuid = await fetchV3MmrByPuuid(region, puuid);
    if (byPuuid) return byPuuid;
  }

  return fetchV3MmrByName(region, gameName, tagLine);
}

export async function syncUserRank(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!user?.riotPuuid || !user.riotGameName || !user.riotTagLine) {
    return { ok: false, error: "Riot ID not linked." };
  }

  const region = user.riotRegion ?? "ap";

  let snapshot: MmrSnapshot | null;
  try {
    snapshot = await fetchCompetitiveMmr(
      region,
      user.riotGameName,
      user.riotTagLine,
      user.riotPuuid,
    );
  } catch {
    return { ok: false, error: "Could not fetch rank from Riot." };
  }

  if (!snapshot) {
    return { ok: false, error: "No competitive rank data found." };
  }

  if (snapshot.gameName && snapshot.tagLine) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        riotGameName: snapshot.gameName,
        riotTagLine: snapshot.tagLine,
        riotRegion: region,
      },
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

  const data = {
    mmr: snapshot.mmr,
    rankTier: snapshot.rankTier,
    rankTierId: snapshot.rankTierId,
    peakMmr: snapshot.peakMmr,
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
]);

async function syncUserRankWithRetry(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let last: { ok: false; error: string } = { ok: false, error: "Sync failed." };

  for (let attempt = 0; attempt < SYNC_RETRY_ATTEMPTS; attempt++) {
    const result = await syncUserRank(userId);
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

function linkedPlayerWhere(filter: LinkedPlayerFilter = {}) {
  const base = {
    signupCompleted: true,
    riotPuuid: { not: null },
    riotGameName: { not: null },
    riotTagLine: { not: null },
  } as const;

  if (!filter.fullRefreshBefore) {
    return base;
  }

  return {
    ...base,
    OR: [
      {
        leaderboard: {
          none: { game: GameSlug.VALORANT, scope: "TOWN", seasonId: null },
        },
      },
      {
        leaderboard: {
          some: {
            game: GameSlug.VALORANT,
            scope: "TOWN",
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

export async function syncAllLinkedPlayers(options?: {
  /** When set, only players not synced since this timestamp (daily full refresh). */
  fullRefreshBefore?: Date;
  maxBatchSize?: number;
}): Promise<SyncAllResult> {
  const maxBatchSize = Math.min(
    options?.maxBatchSize ?? RANK_SYNC_MAX_BATCH_SIZE,
    RANK_SYNC_MAX_BATCH_SIZE,
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
    const result = await syncUserRankWithRetry(user.id);
    if (result.ok) synced += 1;
    else if (result.error === "No competitive rank data found.") skipped += 1;
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
