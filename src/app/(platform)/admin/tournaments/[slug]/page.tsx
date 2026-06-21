import { notFound } from "next/navigation";
import AdminTournamentEditor from "@/components/admin/AdminTournamentEditor";
import {
  getTournamentAdmin,
  listSeasonsAdmin,
  listUnassignedPlayerRegistrations,
  parsePrizeSplit,
} from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";
import type { PrizeSplitRow } from "@core/contracts";

export const metadata = { title: "Edit Cup" };

type Props = { params: Promise<{ slug: string }> };

function parseCarousel(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export default async function AdminTournamentEditPage({ params }: Props) {
  if (!serverEnv.databaseUrl) notFound();

  const { slug } = await params;
  const [t, poolPlayers, seasons] = await Promise.all([
    getTournamentAdmin(slug),
    listUnassignedPlayerRegistrations(slug),
    listSeasonsAdmin(),
  ]);
  if (!t) notFound();

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
      })),
    })),
    registrations: t.registrations.map((r) => ({
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
      rankTier: r.snapshotRankTier,
      valorantRoles: Array.isArray(r.snapshotValorantRoles)
        ? (r.snapshotValorantRoles as string[]).join(", ")
        : null,
      steamId64: r.snapshotSteamId64,
      cs2Hours: r.snapshotCs2Hours,
      cs2PeakPremier: r.snapshotCs2PeakPremier,
      cs2FaceitRank: r.snapshotCs2FaceitRank,
      teamId: r.teamId,
    })),
    poolPlayers,
    placements: t.placements.map((p) => ({ role: p.role, teamLabel: p.teamLabel })),
  };

  return (
    <AdminTournamentEditor initial={initial} seasons={seasons} />
  );
}
