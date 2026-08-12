import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@core/database/client";
import type {
  LeaderboardPreview,
  TournamentPreview,
  TournamentRegistrationBanner,
} from "@core/contracts";
import { TournamentRepository } from "../infrastructure/tournament.repository";
import { LeaderboardRepository } from "../infrastructure/leaderboard.repository";
import { resolveAuctionHeroPhase, type HeroCupPhase } from "../domain/auction-hero-phase";

const tournamentRepo = new TournamentRepository();
const leaderboardRepo = new LeaderboardRepository();

const listTournamentPreviewsCached = unstable_cache(
  async () => tournamentRepo.listPreviews(),
  ["tournament-previews"],
  { revalidate: 60, tags: ["tournament-previews"] },
);

export async function listTournamentPreviews(): Promise<TournamentPreview[]> {
  // Do NOT call Challonge here — homepage / lists / APIs would burn the API quota
  // (one request per cup with a bracket link on every page load). Champion comes
  // from DB placements. Challonge is only fetched on the cup detail page / brackets API.
  return listTournamentPreviewsCached();
}

export const getTournamentBySlug = cache(async (slug: string): Promise<TournamentPreview | null> => {
  return tournamentRepo.findPreviewBySlug(slug);
});

/** Cache tag for a tournament's shared (non-personalized) detail payload. */
export function tournamentDetailTag(slug: string): string {
  return `tournament-detail:${slug}`;
}

/**
 * Shared detail (teams, bracket, placements, prize info, ...) is expensive
 * (deep nested query) but identical for every visitor. Cache it across
 * requests/users with a short stale-while-revalidate window: warm hits are
 * instant, and a request landing just after expiry still gets the (slightly
 * stale) cached payload immediately while Next refetches in the background —
 * so nobody, including the very next visitor after expiry, blocks on the DB.
 *
 * Never treat a cached miss as final: `unstable_cache` can store `null` after a
 * transient blip, which would 404 the cup page for the whole revalidate window.
 * On null/error we fall through to a live DB read.
 */
async function getCachedTournamentDetailShared(slug: string) {
  try {
    const cached = await unstable_cache(
      () => tournamentRepo.findDetailBySlug(slug),
      ["tournament-detail-shared", slug],
      { revalidate: 20, tags: [tournamentDetailTag(slug)] },
    )();
    if (cached) return cached;
  } catch (error) {
    console.error(`[tournament] cached detail failed for ${slug}:`, error);
  }
  return tournamentRepo.findDetailBySlug(slug);
}

export const getTournamentDetail = cache(async (slug: string, userId?: string) => {
  let shared: Awaited<ReturnType<typeof getCachedTournamentDetailShared>> = null;
  try {
    shared = await getCachedTournamentDetailShared(slug);
  } catch (error) {
    console.error(`[tournament] detail load failed for ${slug}:`, error);
    // One live retry — avoids a cup 404/500 from a single pooler blip.
    try {
      shared = await tournamentRepo.findDetailBySlug(slug);
    } catch (retryError) {
      console.error(`[tournament] detail retry failed for ${slug}:`, retryError);
      throw retryError;
    }
  }
  if (!shared) return null;

  const role = userId ? shared.registrationRoleByUserId[userId] : undefined;
  return {
    ...shared.detail,
    userRegistered: Boolean(role),
    userParticipantRole: role ?? null,
  };
});

export async function getActiveRegistrationBanner(): Promise<TournamentRegistrationBanner | null> {
  return tournamentRepo.findActiveRegistrationBanner();
}

export type ActiveAuction = { slug: string; name: string; endsAt: string | null };

export type HeroCupStatus = {
  slug: string;
  name: string;
  phase: HeroCupPhase;
  countdownEndsAt: string | null;
};

/** Nearest upcoming auction cup phase for the homepage hero CTA strip. */
export async function getHeroCupStatus(): Promise<HeroCupStatus | null> {
  const now = new Date();
  const tournaments = await prisma.tournament.findMany({
    where: {
      registrationFormat: "AUCTION",
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      registrationOpensAt: { not: null },
      auctionStartsAt: { not: null },
      auctionEndsAt: { not: null },
      startsAt: { not: null },
      endsAt: { not: null },
    },
    orderBy: { startsAt: "asc" },
    select: {
      slug: true,
      name: true,
      registrationFormat: true,
      registrationOpensAt: true,
      auctionStartsAt: true,
      auctionEndsAt: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  });

  for (const t of tournaments) {
    const resolved = resolveAuctionHeroPhase(t, now);
    if (!resolved) continue;
    return {
      slug: t.slug,
      name: t.name,
      phase: resolved.phase,
      countdownEndsAt: resolved.countdownEndsAt.toISOString(),
    };
  }

  return null;
}

/** The auction whose live window (auctionStartsAt..auctionEndsAt) currently contains now, if any. */
export async function getActiveAuction(): Promise<ActiveAuction | null> {
  const hero = await getHeroCupStatus();
  if (hero?.phase === "auction_live") {
    return {
      slug: hero.slug,
      name: hero.name,
      endsAt: hero.countdownEndsAt,
    };
  }

  const now = new Date();
  const t = await prisma.tournament.findFirst({
    where: {
      registrationFormat: "AUCTION",
      status: { not: "CANCELLED" },
      auctionStartsAt: { lte: now },
      auctionEndsAt: { gte: now },
    },
    orderBy: { auctionStartsAt: "desc" },
    select: { slug: true, name: true, auctionEndsAt: true },
  });
  if (!t) return null;
  return { slug: t.slug, name: t.name, endsAt: t.auctionEndsAt?.toISOString() ?? null };
}

export async function getLeaderboardPreview(
  game: Parameters<LeaderboardRepository["listPreview"]>[0],
  limit = 10,
): Promise<LeaderboardPreview> {
  return leaderboardRepo.listPreview(game, limit);
}

export async function getValorantRankings(
  limit = 250,
  search?: string,
): Promise<LeaderboardPreview> {
  return leaderboardRepo.listValorantRankings({ limit, search });
}

export async function recordMatchResult(
  matchId: string,
  winnerSlot: number,
  scoreSummary?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.matchResult.upsert({
      where: { matchId },
      create: { matchId, winnerSlot, scoreSummary },
      update: { winnerSlot, scoreSummary, completedAt: new Date() },
    });
    await tx.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED" },
    });
  });
  // Leaderboard recompute runs in same module — reads match results from DB
  await leaderboardRepo.recomputeFromCompletedMatches();
}
