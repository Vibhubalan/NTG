import { notFound } from "next/navigation";
import AdminTournamentEditor from "@/components/admin/AdminTournamentEditor";
import {
  getTournamentAdmin,
  listSeasonsAdmin,
  listUnassignedPlayerRegistrations,
  parsePrizeSplit,
} from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";
import { displayCs2Ranks, displayValorantRegistration } from "@auth-membership/domain/game-profile";
import type { PrizeSplitRow } from "@core/contracts";
import { prisma } from "@core/database/client";
import { getSession } from "@core/auth/session";
import { auctionLink } from "@/lib/auction-link";
import { resolveEffectivePublicAuction } from "@tournaments-leagues/domain/auction-hero-phase";

export const metadata = { title: "Edit Cup" };

type Props = { params: Promise<{ slug: string }> };

function parseCarousel(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export default async function AdminTournamentEditPage({ params }: Props) {
  if (!serverEnv.databaseUrl) notFound();

  const { slug } = await params;
  const session = await getSession();
  const userId = session?.user?.id;

  const [t, poolPlayers, seasons, [row]] = await Promise.all([
    getTournamentAdmin(slug),
    listUnassignedPlayerRegistrations(slug),
    listSeasonsAdmin(),
    prisma.$queryRawUnsafe<{ publicAuction: boolean }[]>(
      'SELECT "publicAuction" FROM "Tournament" WHERE slug = $1 LIMIT 1',
      slug
    ),
  ]);
  if (!t) notFound();

  const [auctionRow] = await prisma.$queryRawUnsafe<{ finalized: boolean }[]>(
    'SELECT finalized FROM auction_sessions WHERE tournament_id = $1 LIMIT 1',
    t.id
  );
  const auctionFinalized = auctionRow?.finalized ?? false;

  const initial = {
    slug: t.slug,
    name: t.name,
    game: t.game,
    gameLabel: t.gameLabel,
    seasonId: t.seasonId,
    status: t.status,
    description: t.description,
    posterUrl: t.posterUrl,
    hubBannerUrl: t.hubBannerUrl,
    hubCarouselImages: parseCarousel(t.hubCarouselImages),
    showOnEsportsHub: t.showOnEsportsHub,
    prizePool: t.prizePool?.toString() ?? null,
    prizeNotes: t.prizeNotes,
    prizeSplit: parsePrizeSplit(t.prizeSplit) as PrizeSplitRow[] | null,
    startsAt: t.startsAt?.toISOString() ?? null,
    endsAt: t.endsAt?.toISOString() ?? null,
    registrationOpensAt: t.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: t.registrationClosesAt?.toISOString() ?? null,
    autoManageStatus: t.autoManageStatus,
    hideAfter: t.hideAfter?.toISOString() ?? null,
    registrationFormat: (t.registrationFormat as string | null) ?? null,
    format: (t.format as string | null) ?? null,
    coCaptainSlots: t.coCaptainSlots,
    startingBudget: t.startingBudget,
    rosterSize: t.rosterSize,
    minBidIncrement: t.minBidIncrement,
    auctionStartsAt: t.auctionStartsAt?.toISOString() ?? null,
    auctionEndsAt: t.auctionEndsAt?.toISOString() ?? null,
    groupCount: t.groupCount,
    teamsPerGroup: t.teamsPerGroup,
    advancePerGroup: t.advancePerGroup,
    publicAuction: resolveEffectivePublicAuction(row?.publicAuction ?? false, t),
    rankPoints: (t.rankPoints as { rank: string; floor: number }[] | null) ?? null,
    bracketUrl: t.bracketUrl,
    rulebookUrl: t.rulebookUrl,
    tournamentTeams: t.tournamentTeams.map((team) => ({
      id: team.id,
      name: team.name,
      seed: team.seed,
      logoUrl: team.logoUrl,
      players: team.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        riotGameName: p.riotGameName,
        riotTagLine: p.riotTagLine,
        registrationId: p.registrationId,
      })),
    })),
    registrations: t.registrations.map((r) => {
      const cs2Ranks =
        t.game === "CS2"
          ? displayCs2Ranks(r.user.playerProfile, {
              premier: r.snapshotCs2PeakPremier,
              faceit: r.snapshotCs2FaceitRank,
            })
          : null;

      const valorant =
        t.game === "VALORANT"
          ? displayValorantRegistration(
              r.user.playerProfile,
              r.user.leaderboard[0] ?? null,
              {
                roles: r.snapshotValorantRoles,
                rankTier: r.snapshotRankTier,
                rankTierId: r.snapshotRankTierId,
              },
            )
          : null;

      return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      participantRole: r.participantRole,
      teamName: r.teamName,
      displayName: r.snapshotDisplayName,
      email: r.user.email,
      phone: r.snapshotPhone ?? r.user.phone,
      olympusId: r.snapshotOlympusId ?? r.user.olympusId,
      dateOfBirth: r.snapshotDateOfBirth?.toISOString().slice(0, 10) ?? null,
      partnerUsername: r.snapshotPartnerUsername,
      partnerName: r.partnerName,
      riotId: r.snapshotRiotId,
      rankTier: valorant?.rankTier ?? r.snapshotRankTier,
      valorantRoles: valorant?.valorantRoles ?? null,
      steamId64: r.snapshotSteamId64,
      cs2Hours: r.snapshotCs2Hours,
      cs2PeakPremier: cs2Ranks?.premier ?? r.snapshotCs2PeakPremier,
      cs2FaceitRank: cs2Ranks?.faceit ?? r.snapshotCs2FaceitRank,
      teamId: r.teamId,
    };
    }),
    poolPlayers,
    placements: t.placements.map((p) => ({
      role: p.role,
      teamLabel: p.teamLabel,
      user: p.user
        ? {
            id: p.user.id,
            name: p.user.playerProfile?.displayName ?? p.user.name ?? "",
          }
        : null,
    })),
  };

  const auctionHref = userId && t.registrationFormat === "AUCTION" && serverEnv.auctionUrl && serverEnv.auctionJwtSecret
    ? auctionLink(t.id, "auctioneer", userId)
    : null;

  return (
    <AdminTournamentEditor initial={initial} seasons={seasons} auctionHref={auctionHref} auctionFinalized={auctionFinalized} />
  );
}
