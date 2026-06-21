import { prisma } from "@core/database/client";
import type { PrizeSplitRow } from "@core/contracts";
import type {
  BracketType,
  GameSlug,
  PlacementRole,
  TournamentStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  computeAutoStatus,
  getRegistrationCloseAt,
  hasValidAutoSchedule,
  validateAutoSchedule,
} from "../domain/tournament-schedule";

export type CreateTournamentInput = {
  slug: string;
  name: string;
  game: GameSlug;
  gameLabel?: string;
  seasonId?: string;
  status?: TournamentStatus;
  format?: BracketType;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  autoManageStatus?: boolean;
  prizePool?: number;
  prizeNotes?: string;
  prizeSplit?: PrizeSplitRow[] | null;
  bracketUrl?: string;
  posterUrl?: string;
  rulebookUrl?: string;
  hubBannerUrl?: string;
  hubCarouselImages?: string[];
  showOnEsportsHub?: boolean;
};

export type UpdateTournamentInput = Partial<
  Omit<
    CreateTournamentInput,
    | "gameLabel"
    | "seasonId"
    | "description"
    | "prizeNotes"
    | "bracketUrl"
    | "posterUrl"
    | "rulebookUrl"
    | "hubBannerUrl"
    | "startsAt"
    | "endsAt"
    | "registrationOpensAt"
    | "registrationClosesAt"
    | "prizePool"
  >
> & {
  /** null clears the stored value on PATCH */
  gameLabel?: string | null;
  seasonId?: string | null;
  description?: string | null;
  prizeNotes?: string | null;
  bracketUrl?: string | null;
  posterUrl?: string | null;
  rulebookUrl?: string | null;
  hubBannerUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  prizePool?: number | null;
  hideAfter?: string | null;
  teams?: string[];
};

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

function defaultPrizeSplit(total: number): PrizeSplitRow[] {
  return [
    { place: 1, label: "Winner", amount: Math.round(total * 0.6) },
    { place: 2, label: "Runner Up", amount: Math.round(total * 0.3) },
    { place: 3, label: "3rd Place", amount: Math.round(total * 0.1) },
  ];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listTournamentsAdmin() {
  return prisma.tournament.findMany({
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    include: {
      season: true,
      _count: { select: { registrations: true, tournamentTeams: true } },
    },
  });
}

export async function getTournamentAdmin(slug: string) {
  return prisma.tournament.findUnique({
    where: { slug },
    include: {
      season: true,
      placements: {
        include: { user: { include: { playerProfile: true } } },
      },
      tournamentTeams: {
        orderBy: { sortOrder: "asc" },
        include: {
          players: { orderBy: { sortOrder: "asc" } },
        },
      },
      registrations: {
        include: {
          user: { include: { playerProfile: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { registrations: true } },
    },
  });
}

export async function createTournament(
  input: CreateTournamentInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const slug = slugify(input.slug || input.name);
  if (!slug) return { ok: false, error: "Invalid slug." };

  const existing = await prisma.tournament.findUnique({ where: { slug } });
  if (existing) return { ok: false, error: "A tournament with this slug already exists." };

  const prizeSplit =
    input.prizeSplit ??
    (input.prizePool ? defaultPrizeSplit(input.prizePool) : undefined);

  await prisma.tournament.create({
    data: {
      slug,
      name: input.name.trim(),
      game: input.game,
      gameLabel: input.gameLabel?.trim() || null,
      seasonId: input.seasonId || null,
      status: input.status ?? "DRAFT",
      format: input.format ?? null,
      description: input.description?.trim() || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      registrationOpensAt: input.registrationOpensAt
        ? new Date(input.registrationOpensAt)
        : null,
      registrationClosesAt: input.registrationClosesAt
        ? new Date(input.registrationClosesAt)
        : null,
      autoManageStatus: input.autoManageStatus ?? false,
      prizePool: input.prizePool ?? null,
      prizeNotes: input.prizeNotes?.trim() || null,
      prizeSplit: prizeSplit ? (prizeSplit as unknown as Prisma.InputJsonValue) : undefined,
      bracketUrl: input.bracketUrl?.trim() || null,
      posterUrl: input.posterUrl?.trim() || null,
      rulebookUrl: input.rulebookUrl?.trim() || null,
      hubBannerUrl: input.hubBannerUrl?.trim() || null,
      hubCarouselImages: input.hubCarouselImages?.length
        ? (input.hubCarouselImages as unknown as Prisma.InputJsonValue)
        : undefined,
      showOnEsportsHub: input.showOnEsportsHub ?? false,
    },
  });

  return { ok: true, slug };
}

export async function listSeasonsAdmin() {
  return prisma.season.findMany({
    orderBy: [{ startsAt: "desc" }, { label: "asc" }],
    select: { id: true, label: true },
  });
}

export type AdminCupFieldsSnapshot = {
  name: string;
  game: GameSlug;
  gameLabel: string | null;
  seasonId: string | null;
  status: TournamentStatus;
  description: string | null;
  posterUrl: string | null;
  hubBannerUrl: string | null;
  hubCarouselImages: string[];
  showOnEsportsHub: boolean;
  prizePool: string | null;
  prizeNotes: string | null;
  prizeSplit: PrizeSplitRow[] | null;
  startsAt: string | null;
  endsAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  autoManageStatus: boolean;
  bracketUrl: string | null;
  rulebookUrl: string | null;
};

function parseCarouselImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function toAdminCupFieldsSnapshot(
  t: NonNullable<Awaited<ReturnType<typeof getTournamentAdmin>>>,
): AdminCupFieldsSnapshot {
  return {
    name: t.name,
    game: t.game,
    gameLabel: t.gameLabel,
    seasonId: t.seasonId,
    status: t.status,
    description: t.description,
    posterUrl: t.posterUrl,
    hubBannerUrl: t.hubBannerUrl,
    hubCarouselImages: parseCarouselImages(t.hubCarouselImages),
    showOnEsportsHub: t.showOnEsportsHub,
    prizePool: t.prizePool?.toString() ?? null,
    prizeNotes: t.prizeNotes,
    prizeSplit: parsePrizeSplit(t.prizeSplit),
    startsAt: t.startsAt?.toISOString() ?? null,
    endsAt: t.endsAt?.toISOString() ?? null,
    registrationOpensAt: t.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: t.registrationClosesAt?.toISOString() ?? null,
    autoManageStatus: t.autoManageStatus,
    bracketUrl: t.bracketUrl,
    rulebookUrl: t.rulebookUrl,
  };
}

export async function updateTournamentFull(
  slug: string,
  input: UpdateTournamentInput,
): Promise<{ ok: true; tournament: AdminCupFieldsSnapshot } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const data: Prisma.TournamentUpdateInput = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.game !== undefined) data.game = input.game;
  if (input.gameLabel !== undefined) data.gameLabel = input.gameLabel?.trim() || null;
  if (input.seasonId !== undefined) {
    data.season = input.seasonId
      ? { connect: { id: input.seasonId } }
      : { disconnect: true };
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.format !== undefined) data.format = input.format ?? null;
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.startsAt !== undefined) {
    data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
  }
  if (input.endsAt !== undefined) {
    data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
  }
  if (input.registrationOpensAt !== undefined) {
    data.registrationOpensAt = input.registrationOpensAt
      ? new Date(input.registrationOpensAt)
      : null;
  }
  if (input.registrationClosesAt !== undefined) {
    data.registrationClosesAt = input.registrationClosesAt
      ? new Date(input.registrationClosesAt)
      : null;
  }
  if (input.autoManageStatus !== undefined) data.autoManageStatus = input.autoManageStatus;
  if (input.prizePool !== undefined) {
    data.prizePool = input.prizePool;
  }
  if (input.prizeNotes !== undefined) data.prizeNotes = input.prizeNotes?.trim() || null;
  if (input.prizeSplit !== undefined) {
    data.prizeSplit =
      input.prizeSplit && input.prizeSplit.length
        ? (input.prizeSplit as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }
  if (input.bracketUrl !== undefined) data.bracketUrl = input.bracketUrl?.trim() || null;
  if (input.posterUrl !== undefined) data.posterUrl = input.posterUrl?.trim() || null;
  if (input.rulebookUrl !== undefined) data.rulebookUrl = input.rulebookUrl?.trim() || null;
  if (input.hubBannerUrl !== undefined) data.hubBannerUrl = input.hubBannerUrl?.trim() || null;
  if (input.hubCarouselImages !== undefined) {
    data.hubCarouselImages = input.hubCarouselImages.length
      ? (input.hubCarouselImages as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }
  if (input.showOnEsportsHub !== undefined) data.showOnEsportsHub = input.showOnEsportsHub;
  if (input.hideAfter !== undefined) {
    data.hideAfter =
      input.hideAfter === null ? null : input.hideAfter ? new Date(input.hideAfter) : undefined;
  }
  if (input.teams !== undefined) {
    data.teams = input.teams.length
      ? (input.teams as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  const nextAutoManage =
    input.autoManageStatus !== undefined
      ? input.autoManageStatus
      : tournament.autoManageStatus;
  const nextOpens =
    input.registrationOpensAt !== undefined
      ? input.registrationOpensAt
        ? new Date(input.registrationOpensAt)
        : null
      : tournament.registrationOpensAt;
  const nextStarts =
    input.startsAt !== undefined
      ? input.startsAt
        ? new Date(input.startsAt)
        : null
      : tournament.startsAt;
  const nextEnds =
    input.endsAt !== undefined
      ? input.endsAt
        ? new Date(input.endsAt)
        : null
      : tournament.endsAt;

  if (nextAutoManage) {
    const scheduleError = validateAutoSchedule({
      registrationOpensAt: nextOpens,
      startsAt: nextStarts,
      endsAt: nextEnds,
    });
    if (scheduleError) return { ok: false, error: scheduleError };

    if (nextStarts) {
      data.registrationClosesAt = getRegistrationCloseAt(nextStarts);
    }
  }

  await prisma.tournament.update({ where: { slug }, data });

  if (nextAutoManage && hasValidAutoSchedule({
    status: tournament.status,
    autoManageStatus: true,
    registrationOpensAt: nextOpens,
    startsAt: nextStarts,
    endsAt: nextEnds,
  })) {
    const target = computeAutoStatus({
      status: tournament.status,
      autoManageStatus: true,
      registrationOpensAt: nextOpens,
      startsAt: nextStarts,
      endsAt: nextEnds,
    });
    if (target && target !== tournament.status) {
      await prisma.tournament.update({ where: { slug }, data: { status: target } });
    }
  }

  const saved = await getTournamentAdmin(slug);
  if (!saved) return { ok: false, error: "Tournament not found after save." };

  return { ok: true, tournament: toAdminCupFieldsSnapshot(saved) };
}

export async function deleteTournament(
  slug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  await prisma.tournament.delete({ where: { slug } });
  return { ok: true };
}

export async function clearTournamentPlacement(
  slug: string,
  role: PlacementRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  await prisma.tournamentPlacement.deleteMany({
    where: { tournamentId: tournament.id, role },
  });
  return { ok: true };
}

export async function syncRegistrationStatus(): Promise<{
  updated: number;
}> {
  const now = new Date();
  const tournaments = await prisma.tournament.findMany({
    where: {
      autoManageStatus: true,
      status: { not: "CANCELLED" },
    },
  });

  let updated = 0;

  for (const t of tournaments) {
    if (!hasValidAutoSchedule(t)) continue;

    const target = computeAutoStatus(t, now);
    if (!target || target === t.status) continue;

    const closeAt = t.startsAt ? getRegistrationCloseAt(t.startsAt) : null;

    await prisma.tournament.update({
      where: { id: t.id },
      data: {
        status: target,
        registrationClosesAt: closeAt,
        updatedAt: now,
      },
    });
    updated += 1;
  }

  return { updated };
}
// ─── Teams ───────────────────────────────────────────────────────────────────

export async function createTournamentTeam(
  slug: string,
  name: string,
  seed?: number,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { tournamentTeams: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const sortOrder = (tournament.tournamentTeams[0]?.sortOrder ?? -1) + 1;
  const team = await prisma.tournamentTeam.create({
    data: {
      tournamentId: tournament.id,
      name: name.trim(),
      seed: seed ?? null,
      sortOrder,
    },
  });
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { updatedAt: new Date() },
  });
  return { ok: true, id: team.id };
}

export async function updateTournamentTeam(
  teamId: string,
  input: { name?: string; seed?: number | null; sortOrder?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const team = await prisma.tournamentTeam.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, error: "Team not found." };

  await prisma.tournamentTeam.update({
    where: { id: teamId },
    data: {
      name: input.name?.trim(),
      seed: input.seed,
      sortOrder: input.sortOrder,
    },
  });
  return { ok: true };
}

export async function deleteTournamentTeam(
  teamId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const team = await prisma.tournamentTeam.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, error: "Team not found." };

  await prisma.tournamentTeam.delete({ where: { id: teamId } });
  await prisma.tournament.update({
    where: { id: team.tournamentId },
    data: { updatedAt: new Date() },
  });
  return { ok: true };
}

export async function createTeamPlayer(
  teamId: string,
  input: {
    displayName: string;
    riotGameName?: string;
    riotTagLine?: string;
    registrationId?: string;
    userId?: string;
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const team = await prisma.tournamentTeam.findUnique({
    where: { id: teamId },
    include: { players: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!team) return { ok: false, error: "Team not found." };

  if (input.registrationId) {
    const reg = await prisma.tournamentRegistration.findUnique({
      where: { id: input.registrationId },
      include: { user: true },
    });
    if (!reg || reg.tournamentId !== team.tournamentId) {
      return { ok: false, error: "Registration not found for this cup." };
    }
    if (reg.participantRole !== "PLAYER") {
      return { ok: false, error: "Only player-pool registrations can be assigned." };
    }
    if (reg.teamId && reg.teamId !== teamId) {
      return { ok: false, error: "Player is already on another team." };
    }

    const existingOnTeam = await prisma.tournamentTeamPlayer.findFirst({
      where: { teamId, registrationId: reg.id },
    });
    if (existingOnTeam) {
      return { ok: false, error: "Player already on this team." };
    }

    const sortOrder = (team.players[0]?.sortOrder ?? -1) + 1;
    const player = await prisma.$transaction(async (tx) => {
      const created = await tx.tournamentTeamPlayer.create({
        data: {
          teamId,
          userId: reg.userId,
          registrationId: reg.id,
          displayName: reg.snapshotDisplayName ?? reg.user.name ?? "Player",
          riotGameName: reg.user.riotGameName,
          riotTagLine: reg.user.riotTagLine,
          valorantRoles: reg.snapshotValorantRoles ?? undefined,
          peakPremierRank: reg.snapshotCs2PeakPremier,
          sortOrder,
        },
      });
      await tx.tournamentRegistration.update({
        where: { id: reg.id },
        data: { teamId },
      });
      return created;
    });

    await prisma.tournament.update({
      where: { id: team.tournamentId },
      data: { updatedAt: new Date() },
    });
    return { ok: true, id: player.id };
  }

  const sortOrder = (team.players[0]?.sortOrder ?? -1) + 1;
  const player = await prisma.tournamentTeamPlayer.create({
    data: {
      teamId,
      userId: input.userId ?? null,
      displayName: input.displayName.trim(),
      riotGameName: input.riotGameName?.trim() || null,
      riotTagLine: input.riotTagLine?.trim() || null,
      sortOrder,
    },
  });
  await prisma.tournament.update({
    where: { id: team.tournamentId },
    data: { updatedAt: new Date() },
  });
  return { ok: true, id: player.id };
}

export async function updateTeamPlayer(
  playerId: string,
  input: { displayName?: string; riotGameName?: string; riotTagLine?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const player = await prisma.tournamentTeamPlayer.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: "Player not found." };

  await prisma.tournamentTeamPlayer.update({
    where: { id: playerId },
    data: {
      displayName: input.displayName?.trim(),
      riotGameName: input.riotGameName?.trim() || null,
      riotTagLine: input.riotTagLine?.trim() || null,
    },
  });
  return { ok: true };
}

export async function deleteTeamPlayer(
  playerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const player = await prisma.tournamentTeamPlayer.findUnique({
    where: { id: playerId },
    include: { team: { select: { tournamentId: true } } },
  });
  if (!player) return { ok: false, error: "Player not found." };

  await prisma.tournamentTeamPlayer.delete({ where: { id: playerId } });
  await prisma.tournament.update({
    where: { id: player.team.tournamentId },
    data: { updatedAt: new Date() },
  });
  return { ok: true };
}

export type AdminRegistrationRow = {
  id: string;
  createdAt: string;
  participantRole: string;
  teamName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  olympusId: string | null;
  dateOfBirth: string | null;
  partnerUsername: string | null;
  partnerName: string | null;
  riotId: string | null;
  rankTier: string | null;
  valorantRoles: string | null;
  steamId64: string | null;
  cs2Hours: number | null;
  cs2PeakPremier: string | null;
  cs2FaceitRank: string | null;
  teamId: string | null;
};

export async function listTournamentRegistrationsAdmin(
  slug: string,
): Promise<AdminRegistrationRow[] | null> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return null;

  const rows = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tournament.id },
    include: {
      user: true,
      team: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => {
    const roles = Array.isArray(r.snapshotValorantRoles)
      ? (r.snapshotValorantRoles as string[]).join(", ")
      : null;

    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      participantRole: r.participantRole,
      teamName: r.teamName ?? r.team?.name ?? null,
      displayName: r.snapshotDisplayName,
      email: r.user.email,
      phone: r.snapshotPhone ?? r.user.phone,
      olympusId: r.snapshotOlympusId ?? r.user.olympusId,
      dateOfBirth: r.snapshotDateOfBirth?.toISOString().slice(0, 10) ?? null,
      partnerUsername: r.snapshotPartnerUsername,
      partnerName: r.partnerName,
      riotId: r.snapshotRiotId,
      rankTier: r.snapshotRankTier,
      valorantRoles: roles,
      steamId64: r.snapshotSteamId64,
      cs2Hours: r.snapshotCs2Hours,
      cs2PeakPremier: r.snapshotCs2PeakPremier,
      cs2FaceitRank: r.snapshotCs2FaceitRank,
      teamId: r.teamId,
    };
  });
}

export async function listUnassignedPlayerRegistrations(slug: string) {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return [];

  const rows = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentId: tournament.id,
      participantRole: "PLAYER",
      teamId: null,
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    displayName: r.snapshotDisplayName ?? "Player",
    riotId: r.snapshotRiotId,
    steamId64: r.snapshotSteamId64,
  }));
}

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildRegistrationsCsv(
  game: import("@prisma/client").GameSlug,
  rows: AdminRegistrationRow[],
): string {
  let headers: string[];
  if (game === "CS2") {
    headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Team",
      "Steam64",
      "CS2 Hours",
      "Faceit Rank",
      "Peak Premier",
      "Registered At",
    ];
  } else if (game === "EA_FC26") {
    headers = [
      "Name",
      "Email",
      "Phone",
      "Olympus ID",
      "DOB",
      "Role",
      "Team",
      "Partner Username",
      "Partner Name",
      "Registered At",
    ];
  } else {
    headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Team",
      "Riot ID",
      "Rank",
      "Valorant Roles",
      "Registered At",
    ];
  }

  const lines = [headers.join(",")];

  for (const r of rows) {
    const role = r.participantRole === "CAPTAIN" ? "Captain" : "Player";
    const at = new Date(r.createdAt).toISOString();

    if (game === "CS2") {
      lines.push(
        [
          csvEscape(r.displayName),
          csvEscape(r.email),
          csvEscape(r.phone),
          csvEscape(role),
          csvEscape(r.teamName),
          csvEscape(r.steamId64),
          csvEscape(r.cs2Hours),
          csvEscape(r.cs2FaceitRank),
          csvEscape(r.cs2PeakPremier),
          csvEscape(at),
        ].join(","),
      );
    } else if (game === "EA_FC26") {
      lines.push(
        [
          csvEscape(r.displayName),
          csvEscape(r.email),
          csvEscape(r.phone),
          csvEscape(r.olympusId),
          csvEscape(r.dateOfBirth),
          csvEscape(role),
          csvEscape(r.teamName),
          csvEscape(r.partnerUsername),
          csvEscape(r.partnerName),
          csvEscape(at),
        ].join(","),
      );
    } else {
      lines.push(
        [
          csvEscape(r.displayName),
          csvEscape(r.email),
          csvEscape(r.phone),
          csvEscape(role),
          csvEscape(r.teamName),
          csvEscape(r.riotId),
          csvEscape(r.rankTier),
          csvEscape(r.valorantRoles),
          csvEscape(at),
        ].join(","),
      );
    }
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

export { parsePrizeSplit, defaultPrizeSplit };
