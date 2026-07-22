import { prisma } from "@core/database/client";
import type {
  LeaderboardPreview,
  TournamentPreview,
  TournamentRegistrationBanner,
} from "@core/contracts";
import { TournamentRepository } from "../infrastructure/tournament.repository";
import { LeaderboardRepository } from "../infrastructure/leaderboard.repository";
import { resolveAuctionHeroPhase, type HeroCupPhase } from "../domain/auction-hero-phase";
import { syncRegistrationStatus } from "./admin-tournament.service";

const tournamentRepo = new TournamentRepository();
const leaderboardRepo = new LeaderboardRepository();

export async function listTournamentPreviews(): Promise<TournamentPreview[]> {
  // Do NOT call Challonge here — homepage / lists / APIs would burn the API quota
  // (one request per cup with a bracket link on every page load). Champion comes
  // from DB placements. Challonge is only fetched on the cup detail page.
  return tournamentRepo.listPreviews();
}

export async function getTournamentBySlug(slug: string): Promise<TournamentPreview | null> {
  return tournamentRepo.findPreviewBySlug(slug);
}

export async function getTournamentDetail(slug: string, userId?: string) {
  return tournamentRepo.findDetailBySlug(slug, userId);
}

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
  await syncRegistrationStatus().catch(() => {});

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

export async function listActiveRegistrationBanners(): Promise<TournamentRegistrationBanner[]> {
  return tournamentRepo.findActiveRegistrationBanners();
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
