import { prisma } from "@core/database/client";
import type { TournamentDetail, PrizeSplitRow, TournamentTeamView } from "@core/contracts";
import type { GameSlug, TournamentStatus } from "@prisma/client";
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
  };
}

export class TournamentRepository {
  async listPreviews() {
    await syncRegistrationStatus();
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
    await syncRegistrationStatus();
    const t = await prisma.tournament.findUnique({
      where: { slug },
      include: {
        season: true,
        placements: {
          include: {
            user: { include: { playerProfile: true } },
          },
        },
        tournamentTeams: {
          orderBy: { sortOrder: "asc" },
          include: {
            players: { orderBy: { sortOrder: "asc" } },
            registrations: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                participantRole: true,
                snapshotDisplayName: true,
                snapshotOlympusId: true,
                snapshotRiotId: true,
              },
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
          ? { where: { userId }, select: { id: true } }
          : { select: { id: true } },
        _count: { select: { registrations: true } },
      },
    });
    if (!t) return null;

    const teamDetails: TournamentTeamView[] = t.tournamentTeams.map((team) => {
      const rosterPlayers =
        team.players.length > 0
          ? team.players.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              riotId:
                p.riotGameName && p.riotTagLine ? `${p.riotGameName}#${p.riotTagLine}` : null,
            }))
          : [...team.registrations]
              .sort((a, b) => {
                if (a.participantRole === "CAPTAIN" && b.participantRole !== "CAPTAIN") return -1;
                if (b.participantRole === "CAPTAIN" && a.participantRole !== "CAPTAIN") return 1;
                return 0;
              })
              .map((r) => ({
              id: r.id,
              displayName: r.snapshotDisplayName ?? "Player",
              riotId: r.snapshotRiotId,
              olympusId: r.snapshotOlympusId,
              participantRole: r.participantRole,
            }));

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
      seasonLabel: t.season?.label ?? null,
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
      placements: t.placements.map((p) => ({
        role: p.role,
        displayName:
          p.user?.playerProfile?.displayName ?? p.user?.name ?? p.teamLabel ?? "TBD",
        teamLabel: p.teamLabel,
      })),
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
    };
  }

  async findActiveRegistrationBanners() {
    await syncRegistrationStatus();
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
    status: TournamentStatus;
    startsAt: Date | null;
    registrationUrl: string | null;
    season: { label: string } | null;
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
      seasonLabel: t.season?.label ?? null,
      status: t.status,
      startsAt: t.startsAt?.toISOString() ?? null,
      registrationUrl: t.registrationUrl,
      championName,
      bracketUrl: t.bracketUrl,
    };
  }
}
