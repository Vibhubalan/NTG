import { prisma } from "@core/database/client";
import { floorForRegistration, normalizeRankConfig } from "../domain/rank-pricing";
import { getRankConfigForGame } from "./auction-config.service";
import { logAuctionEvent } from "./auction.service";

type RefreshResult =
  | { ok: true; data: { refreshed: number; floorsUpdated: number } }
  | { ok: false; error: string };

/**
 * Re-pulls the latest player data into registration snapshots and recomputes
 * auction floors:
 * - Valorant rank from LeaderboardEntry (game=VALORANT, scope=TOWN)
 * - CS2 Premier / FACEIT from PlayerProfile
 * - CS2 hours from User.cs2HoursPlayed
 *
 * Floor prices of players still in the pool are updated too. Sold players and
 * live/complete sessions keep their prices untouched unless `force` is set.
 */
export async function refreshAuctionSnapshots(
  tournamentSlug: string,
  options?: { force?: boolean },
): Promise<RefreshResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: {
      id: true,
      game: true,
      auctionSession: { select: { id: true, status: true, rankTable: true } },
    },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const session = tournament.auctionSession;
  if (session && ["LIVE", "COMPLETE"].includes(session.status) && !options?.force) {
    return { ok: false, error: "Auction is live or complete — player data is frozen." };
  }

  const rankConfig = session?.rankTable
    ? normalizeRankConfig(session.rankTable, tournament.game)
    : await getRankConfigForGame(tournament.game);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tournament.id, status: "APPROVED" },
    select: {
      id: true,
      userId: true,
      snapshotRankTier: true,
      snapshotRankTierId: true,
      snapshotCs2PeakPremier: true,
      snapshotCs2FaceitRank: true,
      snapshotCs2Hours: true,
      snapshotAuctionFloor: true,
      user: {
        select: {
          cs2HoursPlayed: true,
          playerProfile: { select: { cs2PeakPremierRank: true, cs2FaceitRank: true } },
        },
      },
    },
  });
  if (registrations.length === 0) return { ok: true, data: { refreshed: 0, floorsUpdated: 0 } };

  const valorantEntries =
    tournament.game === "VALORANT"
      ? await prisma.leaderboardEntry.findMany({
          where: {
            game: "VALORANT",
            scope: "TOWN",
            userId: { in: registrations.map((r) => r.userId) },
          },
          select: { userId: true, rankTier: true, rankTierId: true },
        })
      : [];
  const valorantByUser = new Map(valorantEntries.map((e) => [e.userId, e]));

  let refreshed = 0;
  for (const reg of registrations) {
    const valorant = valorantByUser.get(reg.userId);
    const next = {
      snapshotRankTier: valorant?.rankTier ?? reg.snapshotRankTier,
      snapshotRankTierId: valorant?.rankTierId ?? reg.snapshotRankTierId,
      snapshotCs2PeakPremier:
        reg.user.playerProfile?.cs2PeakPremierRank ?? reg.snapshotCs2PeakPremier,
      snapshotCs2FaceitRank:
        reg.user.playerProfile?.cs2FaceitRank ?? reg.snapshotCs2FaceitRank,
      snapshotCs2Hours: reg.user.cs2HoursPlayed ?? reg.snapshotCs2Hours,
    };
    const snapshotAuctionFloor = floorForRegistration(
      tournament.game,
      {
        snapshotRankTier: next.snapshotRankTier,
        snapshotCs2PeakPremier: next.snapshotCs2PeakPremier,
        snapshotCs2FaceitRank: next.snapshotCs2FaceitRank,
        snapshotCs2Hours: next.snapshotCs2Hours,
      },
      rankConfig,
    );

    const changed =
      next.snapshotRankTier !== reg.snapshotRankTier ||
      next.snapshotRankTierId !== reg.snapshotRankTierId ||
      next.snapshotCs2PeakPremier !== reg.snapshotCs2PeakPremier ||
      next.snapshotCs2FaceitRank !== reg.snapshotCs2FaceitRank ||
      next.snapshotCs2Hours !== reg.snapshotCs2Hours ||
      snapshotAuctionFloor !== reg.snapshotAuctionFloor;
    if (!changed) continue;

    await prisma.tournamentRegistration.update({
      where: { id: reg.id },
      data: { ...next, snapshotAuctionFloor },
    });
    refreshed += 1;
  }

  // Recompute floor prices for players still waiting in the pool.
  let floorsUpdated = 0;
  if (session) {
    const poolPlayers = await prisma.auctionPlayer.findMany({
      where: { sessionId: session.id, status: { in: ["POOL", "UNSOLD"] } },
      select: {
        registrationId: true,
        floorPrice: true,
        registration: { select: { snapshotAuctionFloor: true } },
      },
    });
    for (const player of poolPlayers) {
      const nextFloor = Math.max(player.registration.snapshotAuctionFloor ?? 2, 2);
      if (nextFloor === player.floorPrice) continue;
      await prisma.auctionPlayer.update({
        where: {
          sessionId_registrationId: {
            sessionId: session.id,
            registrationId: player.registrationId,
          },
        },
        data: { floorPrice: nextFloor },
      });
      floorsUpdated += 1;
    }
    if (refreshed > 0 || floorsUpdated > 0) {
      await prisma.auctionSession.update({
        where: { id: session.id },
        data: { version: { increment: 1 } },
      });
      await logAuctionEvent(session.id, "snapshot_refresh", { refreshed, floorsUpdated });
    }
  }

  return { ok: true, data: { refreshed, floorsUpdated } };
}
