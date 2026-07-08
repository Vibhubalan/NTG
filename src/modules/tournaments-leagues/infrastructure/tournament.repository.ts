import { prisma } from "@core/database/client";
import type { TournamentDetail, PrizeSplitRow, TournamentTeamPlayerView, TournamentTeamView } from "@core/contracts";
import type { GameSlug, TournamentFormat, TournamentStatus } from "@prisma/client";
import { gameMetaFor } from "@/lib/tournament-display";
import { syncRegistrationStatus } from "../application/admin-tournament.service";
import { isTournamentRegistrationLive } from "../domain/registration-window";

function parsePrizeSplit(value: unknown): PrizeSplitRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const place = Number(r.place);
      const label = typeof r.label === "string" ? r.label : "";
      const amount = Number(r.amount);
      if (!Number.isFinite(place) || !label || !Number.isFinite(amount)) return null;
      return { place, label, amount };
    })
    .filter((r): r is PrizeSplitRow => r !== null);
  return rows.length > 0 ? rows : null;
}

function parseCarouselImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseValorantRoles(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const roles = value.filter((r): r is string => typeof r === "string" && r.trim().length > 0);
  return roles.length > 0 ? roles : null;
}

const registrationPlayerSelect = {
  id: true,
  participantRole: true,
  snapshotDisplayName: true,
  snapshotOlympusId: true,
  snapshotRiotId: true,
  snapshotSteamId64: true,
  snapshotCs2FaceitRank: true,
  snapshotCs2PeakPremier: true,
  snapshotRankTier: true,
  snapshotValorantRoles: true,
} as const;

type RegistrationPlayerRow = {
  id: string;
  participantRole: string;
  snapshotDisplayName: string | null;
  snapshotOlympusId: string | null;
  snapshotRiotId: string | null;
  snapshotSteamId64: string | null;
  snapshotCs2FaceitRank: string | null;
  snapshotCs2PeakPremier: string | null;
  snapshotRankTier: string | null;
  snapshotValorantRoles: unknown;
};

function mapRegistrationToPlayerView(r: RegistrationPlayerRow): TournamentTeamPlayerView {
  return {
    id: r.id,
    displayName: r.snapshotDisplayName ?? "Player",
    riotId: r.snapshotRiotId,
    olympusId: r.snapshotOlympusId,
    steamId64: r.snapshotSteamId64,
    cs2FaceitRank: r.snapshotCs2FaceitRank,
    cs2PeakPremier: r.snapshotCs2PeakPremier,
    valorantRankTier: r.snapshotRankTier,
    valorantRoles: parseValorantRoles(r.snapshotValorantRoles),
    participantRole: r.participantRole as TournamentTeamPlayerView["participantRole"],
  };
}

function isRegistrationOpen(t: {
  status: TournamentStatus;
  autoManageStatus: boolean;
  registrationOpensAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  return isTournamentRegistrationLive(t);
}

function formatRegistrationBannerDetail(t: {
  game: GameSlug;
  gameLabel: string | null;
  startsAt: Date | null;
}): string {
  const meta = gameMetaFor(t.game);
  const parts = [];
  const gl = t.gameLabel?.trim();
  
  if (gl && gl.toLowerCase().includes(meta.label.toLowerCase())) {
    parts.push(gl);
  } else {
    parts.push(meta.label);
    if (gl) parts.push(gl);
  }

  if (t.startsAt) {
    parts.push(
      t.startsAt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }
  return parts.join(" · ");
}

type RegistrationBannerRow = {
  slug: string;
  name: string;
  game: GameSlug;
  gameLabel: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  autoManageStatus: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  hideAfter: Date | null;
  hubBannerUrl: string | null;
  hubCarouselImages: unknown;
  status: TournamentStatus;
};

function toRegistrationBanner(t: RegistrationBannerRow) {
  const href = `/esports/tournaments/${t.slug}`;
  return {
    active: true as const,
    tournamentSlug: t.slug,
    title: t.name,
    detail: formatRegistrationBannerDetail(t),
    message: `Registrations are live for ${t.name}.`,
    href,
    hideAfter:
      t.registrationClosesAt?.toISOString().slice(0, 10) ??
      t.hideAfter?.toISOString().slice(0, 10) ??
      null,
    hubBannerUrl: t.hubBannerUrl,
    hubCarouselImages: parseCarouselImages(t.hubCarouselImages),
    status: t.status,
  };
}

export class TournamentRepository {
  async listPreviews() {
    await syncRegistrationStatus().catch(() => {});
    const rows = await prisma.tournament.findMany({
      where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      include: {
        season: true,
        placements: {
          where: { role: "CHAMPION" },
          include: {
            user: { include: { playerProfile: true } },
          },
        },
      },
    });
    return rows.map((t) => this.toPreview(t));
  }

  async findPreviewBySlug(slug: string) {
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: {
        season: true,
        placements: {
          where: { role: "CHAMPION" },
          include: {
            user: { include: { playerProfile: true } },
          },
        },
      },
    });
    return t ? this.toPreview(t) : null;
  }

  async findDetailBySlug(slug: string, userId?: string): Promise<TournamentDetail | null> {
    await syncRegistrationStatus().catch(() => {});
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: {
        season: true,
        placements: {
          include: {
            user: {
              include: {
                playerProfile: { include: { gameLinks: true } },
                registrations: { where: { tournament: { slug } } },
                leaderboard: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
          },
        },
        tournamentTeams: {
          orderBy: { sortOrder: "asc" },
          include: {
            players: {
              orderBy: { sortOrder: "asc" },
              include: {
                registration: { select: registrationPlayerSelect },
              },
            },
            registrations: {
              orderBy: { createdAt: "asc" },
              select: registrationPlayerSelect,
            },
          },
        },
        bracket: {
          include: {
            matches: {
              orderBy: [{ roundNumber: "asc" }, { positionInRound: "asc" }],
              include: {
                participants: {
                  include: { user: { include: { playerProfile: true } } },
                },
                result: true,
              },
            },
          },
        },
        registrations: userId
          ? { where: { userId }, select: { id: true, participantRole: true } }
          : { select: { id: true, participantRole: true } },
        _count: { select: { registrations: true } },
      },
    });
    if (!t) return null;

    const teamDetails: TournamentTeamView[] = t.tournamentTeams.map((team) => {
      const rosterPlayers =
        team.players.length > 0
          ? team.players.map((p) => {
              if (p.registration) {
                return mapRegistrationToPlayerView(p.registration);
              }
              return {
                id: p.id,
                displayName: p.displayName,
                riotId:
                  p.riotGameName && p.riotTagLine
                    ? `${p.riotGameName}#${p.riotTagLine}`
                    : null,
                cs2PeakPremier: p.peakPremierRank,
                valorantRoles: parseValorantRoles(p.valorantRoles),
              };
            })
          : [...team.registrations]
              .sort((a, b) => {
                const order = (role: string) =>
                  role === "CAPTAIN" ? 0 : role === "CO_CAPTAIN" ? 1 : 2;
                const diff = order(a.participantRole) - order(b.participantRole);
                if (diff !== 0) return diff;
                return 0;
              })
              .map((r) => mapRegistrationToPlayerView(r));

      return {
        id: team.id,
        name: team.name,
        seed: team.seed,
        logoUrl: team.logoUrl,
        players: rosterPlayers,
      };
    });

    const teams = teamDetails.map((team) => team.name);

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      gameLabel: t.gameLabel,
      registrationFormat: t.registrationFormat,
      status: t.status,
      description: t.description,
      posterUrl: t.posterUrl,
      startsAt: t.startsAt?.toISOString() ?? null,
      endsAt: t.endsAt?.toISOString() ?? null,
      prizePool: t.prizePool?.toString() ?? null,
      prizeNotes: t.prizeNotes,
      prizeSplit: parsePrizeSplit(t.prizeSplit),
      registrationOpen: isRegistrationOpen(t),
      registrationOpensAt: t.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: t.registrationClosesAt?.toISOString() ?? null,
      bracketUrl: t.bracketUrl ?? null,
      rulebookUrl: t.rulebookUrl ?? null,
      teams,
      teamDetails,
      placements: t.placements.map((p) => {
        const reg = p.user?.registrations?.[0];
        const lb = p.user?.leaderboard?.[0];
        const riotLink = p.user?.playerProfile?.gameLinks?.find(l => l.game === "VALORANT");
        const liveRiotId = riotLink ? riotLink.externalId : null;
        
        return {
          role: p.role,
          displayName:
            p.user?.playerProfile?.displayName ?? p.user?.name ?? p.teamLabel ?? "TBD",
          teamLabel: p.teamLabel,
          user: p.user
            ? {
                id: p.user.id,
                username: p.user.playerProfile?.usernameKey ?? p.user.name ?? "",
                riotId: liveRiotId ?? reg?.snapshotRiotId ?? null,
                rankTier: lb?.rankTier ?? reg?.snapshotRankTier ?? null,
              }
            : null,
        };
      }),
      matches:
        t.bracket?.matches.map((m) => ({
          id: m.id,
          roundNumber: m.roundNumber,
          positionInRound: m.positionInRound,
          status: m.status,
          scoreSummary: m.result?.scoreSummary ?? null,
          participants: m.participants.map((p) => ({
            slot: p.slot,
            label:
              p.teamLabel ??
              p.user?.playerProfile?.displayName ??
              p.user?.name ??
              `Slot ${p.slot}`,
          })),
        })) ?? [],
      registrationCount: t._count.registrations,
      userRegistered: userId ? t.registrations.length > 0 : false,
      userParticipantRole: userId ? (t.registrations[0]?.participantRole ?? null) : null,
      coCaptainSlots: t.coCaptainSlots,
    };
  }

  async findActiveRegistrationBanners() {
    await syncRegistrationStatus().catch(() => {});
    const candidates = await prisma.tournament.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          { status: "REGISTRATION_OPEN" },
          {
            autoManageStatus: true,
            registrationOpensAt: { not: null },
            startsAt: { not: null },
          },
        ],
      },
      orderBy: [{ showOnEsportsHub: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
    });
    return candidates
      .filter((row) => isTournamentRegistrationLive(row))
      .map(toRegistrationBanner);
  }

  async findActiveRegistrationBanner() {
    const banners = await this.findActiveRegistrationBanners();
    return banners[0] ?? null;
  }
  private toPreview(t: {
    id: string;
    slug: string;
    name: string;
    game: GameSlug;
    gameLabel: string | null;
    registrationFormat: TournamentFormat | null;
    status: TournamentStatus;
    startsAt: Date | null;
    endsAt: Date | null;
    registrationOpensAt: Date | null;
    registrationClosesAt: Date | null;
    registrationUrl: string | null;
    format: string | null;
    bracketUrl: string | null;
    placements?: {
      role: string;
      teamLabel: string | null;
      user?: {
        name: string | null;
        playerProfile?: { displayName: string } | null;
      } | null;
    }[];
  }) {
    const champ = t.placements?.find((p) => p.role === "CHAMPION");
    const championName = champ
      ? (champ.user?.playerProfile?.displayName ?? champ.user?.name ?? champ.teamLabel ?? null)
      : null;

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      gameLabel: t.gameLabel,
      registrationFormat: t.registrationFormat,
      status: t.status,
      startsAt: t.startsAt?.toISOString() ?? null,
      endsAt: t.endsAt?.toISOString() ?? null,
      registrationOpensAt: t.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: t.registrationClosesAt?.toISOString() ?? null,
      registrationUrl: t.registrationUrl,
      championName,
      bracketUrl: t.bracketUrl,
    };
  }
}
