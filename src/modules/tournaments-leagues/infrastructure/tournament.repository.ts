import { prisma } from "@core/database/client";
import type { TournamentDetail, PrizeSplitRow, TournamentTeamPlayerView, TournamentTeamView } from "@core/contracts";
import type { GameSlug, TournamentFormat, TournamentStatus } from "@prisma/client";
import { parseRiotId } from "@auth-membership/application/riot-henrik.service";
import { gameMetaFor } from "@/lib/tournament-display";
import { normalizeBracketUrlItems, normalizeBracketUrls } from "@/lib/challonge";
import { teamNamesMatch } from "@/lib/tournament-champion";
import { pickRiotPlayerCardFields } from "@/lib/valorant-player-card";
import { isTournamentRegistrationLive } from "../domain/registration-window";
import { slugWhere } from "@/lib/slug-utils";
import { computeDisplayedPrizePool } from "@/lib/prize-pool";

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

function parseValorantRoles(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const roles = value.filter((r): r is string => typeof r === "string" && r.trim().length > 0);
  return roles.length > 0 ? roles : null;
}

const registrationPlayerSelect = {
  id: true,
  userId: true,
  participantRole: true,
  teamName: true,
  teamId: true,
  snapshotDisplayName: true,
  snapshotOlympusId: true,
  snapshotRiotId: true,
  snapshotSteamId64: true,
  snapshotCs2FaceitRank: true,
  snapshotCs2PeakPremier: true,
  snapshotRankTier: true,
  snapshotRankTierId: true,
  snapshotValorantRoles: true,
  user: {
    select: {
      riotPlayerCard: true,
      riotPlayerCardWide: true,
    },
  },
} as const;

type RegistrationPlayerRow = {
  id: string;
  userId: string;
  participantRole: string;
  teamName: string | null;
  teamId: string | null;
  snapshotDisplayName: string | null;
  snapshotOlympusId: string | null;
  snapshotRiotId: string | null;
  snapshotSteamId64: string | null;
  snapshotCs2FaceitRank: string | null;
  snapshotCs2PeakPremier: string | null;
  snapshotRankTier: string | null;
  snapshotRankTierId: number | null;
  snapshotValorantRoles: unknown;
  user?: {
    riotPlayerCard: string | null;
    riotPlayerCardWide: string | null;
  } | null;
};

function sortRegsByRole(regs: RegistrationPlayerRow[]): RegistrationPlayerRow[] {
  return [...regs].sort((a, b) => {
    const order = (role: string) =>
      role === "CAPTAIN" ? 0 : role === "CO_CAPTAIN" ? 1 : 2;
    return order(a.participantRole) - order(b.participantRole);
  });
}

function registrationsForTeam(
  teamName: string,
  teamId: string,
  allRegs: RegistrationPlayerRow[],
): RegistrationPlayerRow[] {
  return allRegs.filter((r) => {
    if (r.teamId === teamId) return true;
    const label = r.teamName?.trim();
    return label ? teamNamesMatch(label, teamName) : false;
  });
}

function buildTeamDetailsFromData(
  tournamentTeams: Array<{
    id: string;
    name: string;
    seed: number | null;
    logoUrl: string | null;
    players: Array<{
      id: string;
      userId?: string | null;
      displayName: string;
      riotGameName: string | null;
      riotTagLine: string | null;
      peakPremierRank: string | null;
      valorantRoles: unknown;
      membershipKind?: "PRIMARY" | "POACH" | null;
      poachedFromTeam?: { id: string; name: string } | null;
      registration: RegistrationPlayerRow | null;
      user?: {
        riotPlayerCard: string | null;
        riotPlayerCardWide: string | null;
      } | null;
    }>;
    registrations: RegistrationPlayerRow[];
  }>,
  allRegs: RegistrationPlayerRow[],
): TournamentTeamView[] {
  const claimedRegIds = new Set<string>();

  const fromTeams = tournamentTeams.map((team) => {
    let rosterPlayers: TournamentTeamPlayerView[] =
      team.players.length > 0
        ? team.players.map((p) => {
            const isPoach = p.membershipKind === "POACH";
            const poachMeta = {
              membershipKind: (isPoach ? "POACH" : "PRIMARY") as "PRIMARY" | "POACH",
              poachedFromTeamName: isPoach
                ? (p.poachedFromTeam?.name ?? null)
                : null,
            };
            const cardFields = pickRiotPlayerCardFields([p.user, p.registration?.user]);
            if (p.registration && !isPoach) {
              claimedRegIds.add(p.registration.id);
              return {
                ...mapRegistrationToPlayerView(p.registration),
                id: p.id,
                ...poachMeta,
                ...cardFields,
              };
            }
            return {
              id: p.id,
              userId: p.userId ?? p.registration?.userId ?? null,
              displayName: p.displayName,
              riotId:
                p.riotGameName && p.riotTagLine
                  ? `${p.riotGameName}#${p.riotTagLine}`
                  : (p.registration?.snapshotRiotId ?? null),
              cs2PeakPremier: p.peakPremierRank,
              valorantRoles: parseValorantRoles(p.valorantRoles),
              participantRole: isPoach
                ? undefined
                : ((p.registration?.participantRole as TournamentTeamPlayerView["participantRole"]) ??
                  "PLAYER"),
              ...poachMeta,
              ...cardFields,
            };
          })
        : sortRegsByRole(team.registrations).map((r) => {
            claimedRegIds.add(r.id);
            return mapRegistrationToPlayerView(r);
          });

    if (rosterPlayers.length === 0) {
      const fallbackRegs = sortRegsByRole(
        registrationsForTeam(team.name, team.id, allRegs),
      );
      rosterPlayers = fallbackRegs.map((r) => {
        claimedRegIds.add(r.id);
        return mapRegistrationToPlayerView(r);
      });
    }

    return {
      id: team.id,
      name: team.name,
      seed: team.seed,
      logoUrl: team.logoUrl,
      players: rosterPlayers,
    };
  });

  const leftoverByTeam = new Map<string, RegistrationPlayerRow[]>();
  for (const reg of allRegs) {
    if (claimedRegIds.has(reg.id)) continue;
    const teamLabel = reg.teamName?.trim();
    if (!teamLabel) continue;
    const key = normalizeTeamNameKey(teamLabel);
    const bucket = leftoverByTeam.get(key) ?? [];
    bucket.push(reg);
    leftoverByTeam.set(key, bucket);
  }

  const merged = [...fromTeams];
  for (const [, regs] of leftoverByTeam) {
    const displayName = regs[0]?.teamName?.trim();
    if (!displayName) continue;

    const existing = merged.find((t) => teamNamesMatch(t.name, displayName));
    if (existing) {
      if (existing.players.length === 0) {
        existing.players = sortRegsByRole(regs).map(mapRegistrationToPlayerView);
      }
      continue;
    }

    merged.push({
      id: `reg-team-${displayName}`,
      name: displayName,
      seed: null,
      logoUrl: null,
      players: sortRegsByRole(regs).map(mapRegistrationToPlayerView),
    });
  }

  return merged;
}

function normalizeTeamNameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapRegistrationToPlayerView(r: RegistrationPlayerRow): TournamentTeamPlayerView {
  return {
    id: r.id,
    userId: r.userId,
    displayName: r.snapshotDisplayName ?? "Player",
    riotId: r.snapshotRiotId,
    olympusId: r.snapshotOlympusId,
    steamId64: r.snapshotSteamId64,
    cs2FaceitRank: r.snapshotCs2FaceitRank,
    cs2PeakPremier: r.snapshotCs2PeakPremier,
    valorantRankTier: r.snapshotRankTier,
    valorantRankTierId: r.snapshotRankTierId,
    ...pickRiotPlayerCardFields([r.user]),
    valorantRoles: parseValorantRoles(r.snapshotValorantRoles),
    participantRole: r.participantRole as TournamentTeamPlayerView["participantRole"],
  };
}

function riotIdKey(gameName: string, tagLine: string): string {
  return `${gameName.trim().toLowerCase()}#${tagLine.trim().toLowerCase()}`;
}

/** Fill dummy roster art for poaches/subs whose User row was not on the team-player include. */
async function enrichMissingRosterCards(
  teams: TournamentTeamView[],
): Promise<TournamentTeamView[]> {
  const missing: { gameName: string; tagLine: string }[] = [];
  for (const team of teams) {
    for (const player of team.players) {
      if (player.riotPlayerCard || player.riotPlayerCardWide) continue;
      const parsed = player.riotId ? parseRiotId(player.riotId) : null;
      if (!parsed) continue;
      missing.push(parsed);
    }
  }
  if (missing.length === 0) return teams;

  const unique = [
    ...new Map(missing.map((m) => [riotIdKey(m.gameName, m.tagLine), m])).values(),
  ];

  const users = await prisma.user.findMany({
    where: {
      OR: unique.map((u) => ({
        riotGameName: { equals: u.gameName, mode: "insensitive" as const },
        riotTagLine: { equals: u.tagLine, mode: "insensitive" as const },
      })),
    },
    select: {
      riotGameName: true,
      riotTagLine: true,
      riotPlayerCard: true,
      riotPlayerCardWide: true,
    },
  });

  const cardsByRiot = new Map<string, ReturnType<typeof pickRiotPlayerCardFields>>();
  for (const user of users) {
    if (!user.riotGameName || !user.riotTagLine) continue;
    const cards = pickRiotPlayerCardFields([user]);
    if (!cards.riotPlayerCard && !cards.riotPlayerCardWide) continue;
    cardsByRiot.set(riotIdKey(user.riotGameName, user.riotTagLine), cards);
  }
  if (cardsByRiot.size === 0) return teams;

  return teams.map((team) => ({
    ...team,
    players: team.players.map((player) => {
      if (player.riotPlayerCard || player.riotPlayerCardWide) return player;
      const parsed = player.riotId ? parseRiotId(player.riotId) : null;
      if (!parsed) return player;
      const cards = cardsByRiot.get(riotIdKey(parsed.gameName, parsed.tagLine));
      return cards ? { ...player, ...cards } : player;
    }),
  }));
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
    status: t.status,
  };
}

export class TournamentRepository {
  async listPreviews() {
    const rows = await prisma.tournament.findMany({
      where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
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
    const t = await prisma.tournament.findFirst({
      where: slugWhere(slug),
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

  /**
   * Shared (non-personalized) tournament detail, plus a userId -> participantRole
   * lookup built from the same query. Split out from personalization so the
   * expensive part can be cached across users — see getTournamentDetail in
   * tournament.service.ts, which merges in the per-request userId afterward.
   */
  async findDetailBySlug(slug: string): Promise<{
    detail: TournamentDetail;
    registrationRoleByUserId: Record<string, TournamentDetail["userParticipantRole"]>;
  } | null> {
    const t = await prisma.tournament.findFirst({
      where: slugWhere(slug),
      include: {
        season: true,
        placements: {
          include: {
            user: {
              include: {
                playerProfile: { include: { gameLinks: true } },
                registrations: { where: { tournament: slugWhere(slug) } },
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
                user: {
                  select: {
                    riotPlayerCard: true,
                    riotPlayerCardWide: true,
                  },
                },
                registration: { select: registrationPlayerSelect },
                poachedFromTeam: { select: { id: true, name: true } },
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
        registrations: {
          where: { status: "APPROVED" },
          select: registrationPlayerSelect,
        },
        _count: { select: { registrations: true } },
      },
    });
    if (!t) return null;

    const allRegs = t.registrations;
    const isSoloCup = t.registrationFormat === "SOLO";

    // DYNAMIC leftover solos stay off the public roster until an admin (or
    // a 5-stack signup) puts them on a team.
    const teamDetails = isSoloCup
      ? []
      : await enrichMissingRosterCards(buildTeamDetailsFromData(t.tournamentTeams, allRegs));
    const soloPlayers = isSoloCup
      ? allRegs.map(mapRegistrationToPlayerView)
      : [];

    const teams = teamDetails.map((team) => team.name);

    const registrationRoleByUserId: Record<
      string,
      TournamentDetail["userParticipantRole"]
    > = {};
    for (const reg of allRegs) {
      if (!reg.userId) continue;
      registrationRoleByUserId[reg.userId] =
        reg.participantRole as TournamentDetail["userParticipantRole"];
    }

    const detail: TournamentDetail = {
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
      prizePoolMode: t.prizePoolMode ?? "MANUAL",
      prizePerPlayer: t.prizePerPlayer?.toString() ?? null,
      prizePool:
        computeDisplayedPrizePool({
          mode: t.prizePoolMode ?? "MANUAL",
          manualAmount: t.prizePool != null ? Number(t.prizePool) : null,
          perPlayer: t.prizePerPlayer != null ? Number(t.prizePerPlayer) : null,
          registeredCount: allRegs.length,
        })?.toString() ?? null,
      prizeNotes: t.prizeNotes,
      prizeSplit: t.prizePoolMode === "DYNAMIC" ? null : parsePrizeSplit(t.prizeSplit),
      registrationCount: allRegs.length,
      registrationOpen: isRegistrationOpen(t),
      registrationOpensAt: t.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: t.registrationClosesAt?.toISOString() ?? null,
      auctionStartsAt: t.auctionStartsAt?.toISOString() ?? null,
      auctionEndsAt: t.auctionEndsAt?.toISOString() ?? null,
      ...(() => {
        const items = normalizeBracketUrlItems({
          bracketUrl: t.bracketUrl,
          bracketUrls: (t as { bracketUrls?: unknown }).bracketUrls,
        });
        return {
          bracketUrl: items[0]?.url ?? t.bracketUrl ?? null,
          // Keep structured items so "Use for Winners" (isFinal) is not lost.
          bracketUrls: items,
        };
      })(),
      rulebookUrl: t.rulebookUrl ?? null,
      rulebookDisclaimer: t.rulebookDisclaimer?.trim() || null,
      teams,
      teamDetails,
      soloPlayers,
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
                rankTierId: lb?.rankTierId ?? reg?.snapshotRankTierId ?? null,
                riotPlayerCard: p.user.riotPlayerCard ?? null,
                riotPlayerCardWide: p.user.riotPlayerCardWide ?? null,
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
      // Personalized per-request in tournament.service.ts from registrationRoleByUserId.
      userRegistered: false,
      userParticipantRole: null,
      coCaptainSlots: t.coCaptainSlots,
      autoManageStatus: t.autoManageStatus,
      publicAuction: t.publicAuction,
      yourGamesEnabled: t.yourGamesEnabled ?? true,
    };

    return { detail, registrationRoleByUserId };
  }

  async findActiveRegistrationBanners() {
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
    auctionStartsAt?: Date | null;
    registrationUrl: string | null;
    format: string | null;
    bracketUrl: string | null;
    bracketUrls?: unknown;
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

    const urls = normalizeBracketUrls({
      bracketUrl: t.bracketUrl,
      bracketUrls: t.bracketUrls,
    });

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
      auctionStartsAt: t.auctionStartsAt?.toISOString() ?? null,
      registrationUrl: t.registrationUrl,
      championName,
      bracketUrl: urls[0] ?? t.bracketUrl ?? null,
      bracketUrls: urls,
    };
  }
}
