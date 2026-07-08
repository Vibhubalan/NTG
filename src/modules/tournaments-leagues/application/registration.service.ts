import { prisma } from "@core/database/client";
import type { RegistrationResult } from "@core/contracts";
import {
  GameSlug,
  type RegistrationParticipantRole,
  type ValorantRole,
} from "@prisma/client";
import {
  findUserByUsername,
  usernameKeyFromDisplayName,
  validateCs2RanksForRegistration,
  normalizeCs2PeakPremierRank,
} from "@auth-membership/application/registration-helpers";
import { isTournamentRegistrationLive } from "../domain/registration-window";
import { syncUserRank } from "./rank-sync.service";
import { logUserActivity } from "@/lib/user-audit";


export type TournamentRegisterInput = {
  participantRole: RegistrationParticipantRole;
  teamName?: string;
  logoUrl?: string;
  valorantRoles?: ValorantRole[];
  cs2PeakPremierRank?: string;
  coCaptainUsernames?: string[];
};

export type FifaRegisterInput = {
  teamName: string;
  partnerUsername: string;
};

export type RegistrationEligibility = {
  canRegister: boolean;
  missing: string[];
  displayName: string | null;
  email: string | null;
  phone: string | null;
  olympusId: string | null;
  dateOfBirth: string | null;
  riotId: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  cs2HoursPlayed: number | null;
  valorantRoles: ValorantRole[];
  cs2PeakPremierRank: string | null;
  cs2FaceitRank: string | null;
  valorantRankTier: string | null;
};

async function getValorantRankSnapshot(userId: string): Promise<{
  tier: string | null;
  tierId: number | null;
}> {
  let entry = await prisma.leaderboardEntry.findFirst({
    where: { userId, game: "VALORANT", scope: "TOWN" },
  });

  if (!entry?.mmr) {
    await syncUserRank(userId, {
      tryAllRegions: true,
      context: { source: "registration" },
    }).catch(() => {});
    entry = await prisma.leaderboardEntry.findFirst({
      where: { userId, game: "VALORANT", scope: "TOWN" },
    });
  }

  return {
    tier: entry?.rankTier ?? null,
    tierId: entry?.rankTierId ?? null,
  };
}

function validateGameProfile(
  game: GameSlug,
  user: {
    dateOfBirth: Date | null;
    olympusId: string | null;
    riotPuuid: string | null;
    steamId64: string | null;
    playerProfile: {
      valorantRoles: ValorantRole[];
      cs2PeakPremierRank: string | null;
      cs2FaceitRank: string | null;
    } | null;
  },
): string[] {
  const missing: string[] = [];

  if (game === GameSlug.VALORANT) {
    if (!user.riotPuuid) missing.push("Link your Riot ID on your profile.");
    if (!user.playerProfile?.valorantRoles.length) {
      missing.push("Set at least one Valorant role on your profile.");
    }
  }

  if (game === GameSlug.CS2) {
    if (!user.steamId64) missing.push("Link your Steam account on your profile.");
    const cs2Err = validateCs2RanksForRegistration(
      user.playerProfile?.cs2FaceitRank,
      user.playerProfile?.cs2PeakPremierRank,
    );
    if (cs2Err) missing.push(cs2Err);
  }

  if (game === GameSlug.EA_FC26) {
    if (!user.dateOfBirth) {
      missing.push("Add your date of birth on your profile.");
    }
    if (!user.olympusId?.trim()) {
      missing.push("Add your Olympus ID on your profile.");
    }
  }

  return missing;
}

function buildEligibilityFromUser(
  user: {
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    olympusId: string | null;
    riotGameName: string | null;
    riotTagLine: string | null;
    steamId64: string | null;
    steamPersonaName: string | null;
    cs2HoursPlayed: number | null;
    playerProfile: {
      displayName: string;
      valorantRoles: ValorantRole[];
      cs2PeakPremierRank: string | null;
      cs2FaceitRank: string | null;
    } | null;
    name: string | null;
    leaderboard?: { rankTier: string | null }[];
  },
  missing: string[],
): RegistrationEligibility {
  const rank = user.leaderboard?.[0];
  return {
    canRegister: missing.length === 0,
    missing,
    displayName: user.playerProfile?.displayName ?? user.name,
    email: user.email,
    phone: user.phone,
    olympusId: user.olympusId,
    dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    riotId:
      user.riotGameName && user.riotTagLine
        ? `${user.riotGameName}#${user.riotTagLine}`
        : null,
    steamId64: user.steamId64,
    steamPersonaName: user.steamPersonaName,
    cs2HoursPlayed: user.cs2HoursPlayed,
    valorantRoles: user.playerProfile?.valorantRoles ?? [],
    cs2PeakPremierRank: user.playerProfile?.cs2PeakPremierRank ?? null,
    cs2FaceitRank: user.playerProfile?.cs2FaceitRank ?? null,
    valorantRankTier: rank?.rankTier ?? null,
  };
}

export async function getRegistrationEligibility(
  slug: string,
  userId: string,
): Promise<RegistrationEligibility | null> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      playerProfile: true,
      leaderboard: {
        where: { game: "VALORANT", scope: "TOWN" },
        take: 1,
      },
    },
  });
  if (!user) return null;

  const missing = validateGameProfile(tournament.game, user);
  return buildEligibilityFromUser(user, missing);
}

function userSnapshotFields(user: {
  phone: string | null;
  dateOfBirth: Date | null;
  olympusId: string | null;
  steamId64: string | null;
  cs2HoursPlayed: number | null;
  riotGameName: string | null;
  riotTagLine: string | null;
  playerProfile: { displayName: string; cs2PeakPremierRank: string | null; cs2FaceitRank: string | null } | null;
  name: string | null;
}) {
  return {
    snapshotDisplayName: user.playerProfile?.displayName ?? user.name,
    snapshotPhone: user.phone,
    snapshotOlympusId: user.olympusId,
    snapshotDateOfBirth: user.dateOfBirth,
    snapshotRiotId:
      user.riotGameName && user.riotTagLine
        ? `${user.riotGameName}#${user.riotTagLine}`
        : null,
    snapshotSteamId64: user.steamId64,
    snapshotCs2Hours: user.cs2HoursPlayed,
    snapshotCs2PeakPremier: user.playerProfile?.cs2PeakPremierRank ?? null,
    snapshotCs2FaceitRank: user.playerProfile?.cs2FaceitRank ?? null,
  };
}

export async function registerForTournament(
  slug: string,
  userId: string,
  input: TournamentRegisterInput,
): Promise<RegistrationResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { tournamentTeams: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });

  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  if (tournament.game === GameSlug.EA_FC26) {
    return { ok: false, error: "Use the FIFA team registration form." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  if (!user.emailVerified || !user.signupCompleted) {
    return { ok: false, error: "Complete signup before registering for cups." };
  }

  if (!isTournamentRegistrationLive(tournament)) {
    return { ok: false, error: "Registration is not open for this tournament." };
  }

  const missing = validateGameProfile(tournament.game, user);
  if (missing.length > 0) {
    return { ok: false, error: missing[0] };
  }

  let snapshotRankTier: string | null = null;
  let snapshotRankTierId: number | null = null;
  let snapshotValorantRoles: ValorantRole[] | null = null;
  let snapshotCs2PeakPremier: string | null = null;
  let snapshotCs2Faceit: string | null = null;

  if (tournament.game === GameSlug.VALORANT) {
    const rank = await getValorantRankSnapshot(userId);
    snapshotRankTier = rank.tier;
    snapshotRankTierId = rank.tierId;
    snapshotValorantRoles =
      input.valorantRoles?.length
        ? input.valorantRoles
        : (user.playerProfile?.valorantRoles ?? []);
  }

  if (tournament.game === GameSlug.CS2) {
    const premier =
      input.cs2PeakPremierRank ?? user.playerProfile?.cs2PeakPremierRank ?? null;
    snapshotCs2PeakPremier = premier
      ? normalizeCs2PeakPremierRank(premier) ?? premier
      : null;
    snapshotCs2Faceit = user.playerProfile?.cs2FaceitRank ?? null;
  }

  const baseData = {
    tournamentId: tournament.id,
    userId,
    participantRole: input.participantRole,
    ...userSnapshotFields(user),
    snapshotRankTier,
    snapshotRankTierId,
    snapshotValorantRoles: snapshotValorantRoles
      ? (snapshotValorantRoles as unknown as import("@prisma/client").Prisma.InputJsonValue)
      : undefined,
    snapshotCs2PeakPremier,
    snapshotCs2FaceitRank: snapshotCs2Faceit,
    status: "APPROVED" as const,
  };

  try {
    if (input.participantRole === "CAPTAIN") {
      if (!input.teamName?.trim()) {
        return { ok: false, error: "Team name is required." };
      }
      if (!input.logoUrl?.trim()) {
        return { ok: false, error: "Team logo is required." };
      }

      const coCapUsernames = (input.coCaptainUsernames ?? []).map((u) => u.trim()).filter(Boolean);
      if (coCapUsernames.length > tournament.coCaptainSlots) {
        return { ok: false, error: `This tournament only allows up to ${tournament.coCaptainSlots} co-captain(s).` };
      }
      if (new Set(coCapUsernames.map((u) => u.toLowerCase())).size !== coCapUsernames.length) {
        return { ok: false, error: "Duplicate co-captain usernames are not allowed." };
      }

      // Co-captains must already be registered as a PLAYER in this cup (in the pool, not on a team).
      // We upgrade their existing registration to CO_CAPTAIN and attach it to the new team.
      const coCapRegs: { userId: string; email: string | null; name: string | null; registrationId: string }[] = [];
      for (const cleanName of coCapUsernames) {
        const coCapUser = await findUserByUsername(cleanName);
        if (!coCapUser) {
          return { ok: false, error: `Co-captain "${cleanName}" not found.` };
        }
        if (coCapUser.id === userId) {
          return { ok: false, error: "You cannot add yourself as a co-captain." };
        }
        const ccReg = await prisma.tournamentRegistration.findFirst({
          where: { tournamentId: tournament.id, userId: coCapUser.id },
        });
        if (!ccReg) {
          return {
            ok: false,
            error: `"${cleanName}" must register for this cup as a player before you can add them as a co-captain.`,
          };
        }
        if (ccReg.participantRole !== "PLAYER") {
          return { ok: false, error: `"${cleanName}" is already a captain or co-captain and cannot be added.` };
        }
        if (ccReg.teamId) {
          return { ok: false, error: `"${cleanName}" is already assigned to a team.` };
        }
        coCapRegs.push({
          userId: coCapUser.id,
          email: coCapUser.email,
          name: coCapUser.name,
          registrationId: ccReg.id,
        });
      }

      const sortOrder = (tournament.tournamentTeams[0]?.sortOrder ?? -1) + 1;

      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            name: input.teamName!.trim(),
            captainUserId: userId,
            logoUrl: input.logoUrl!.trim(),
            sortOrder,
          },
        });

        const reg = await tx.tournamentRegistration.create({
          data: {
            ...baseData,
            teamId: team.id,
            teamName: input.teamName!.trim(),
          },
        });

        await tx.tournamentTeam.update({
          where: { id: team.id },
          data: { sourceRegistrationId: reg.id },
        });

        for (const cc of coCapRegs) {
          await tx.tournamentRegistration.update({
            where: { id: cc.registrationId },
            data: {
              participantRole: "CO_CAPTAIN",
              teamId: team.id,
              teamName: input.teamName!.trim(),
            },
          });
        }

        return reg;
      });

      await logUserActivity({
        userId,
        email: user.email,
        name: user.name,
        action: "TOURNAMENT_REGISTER",
        target: slug,
        details: `Registered for cup "${tournament.name}" as Captain of ${input.teamName!.trim()} with ${coCapRegs.length} co-captain(s).`,
      });

      for (const cc of coCapRegs) {
        await logUserActivity({
          userId: cc.userId,
          email: cc.email,
          name: cc.name,
          action: "TOURNAMENT_REGISTER",
          target: slug,
          details: `Promoted to Co-Captain of ${input.teamName!.trim()} in cup "${tournament.name}" (by Captain).`,
        });
      }

      return { ok: true, registrationId: result.id };
    }

    const reg = await prisma.tournamentRegistration.create({
      data: {
        ...baseData,
        participantRole: "PLAYER",
      },
    });

    await logUserActivity({
      userId,
      email: user.email,
      name: user.name,
      action: "TOURNAMENT_REGISTER",
      target: slug,
      details: `Registered for cup "${tournament.name}" as Player.`,
    });

    return { ok: true, registrationId: reg.id };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return { ok: false, error: "You are already registered for this tournament." };
    }
    throw e;
  }
}

export async function registerFifaTeam(
  slug: string,
  userId: string,
  input: FifaRegisterInput,
): Promise<RegistrationResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { tournamentTeams: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });

  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  if (tournament.game !== GameSlug.EA_FC26) {
    return { ok: false, error: "This registration flow is for FIFA cups only." };
  }

  const initiator = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });

  if (!initiator) {
    return { ok: false, error: "Account not found." };
  }

  if (!initiator.emailVerified || !initiator.signupCompleted) {
    return { ok: false, error: "Complete signup before registering for cups." };
  }

  if (!isTournamentRegistrationLive(tournament)) {
    return { ok: false, error: "Registration is not open for this tournament." };
  }

  const missing = validateGameProfile(GameSlug.EA_FC26, initiator);
  if (missing.length > 0) {
    return { ok: false, error: missing[0] };
  }

  const partnerUsername = input.partnerUsername.trim();

  if (
    usernameKeyFromDisplayName(initiator.playerProfile?.displayName ?? "") ===
    usernameKeyFromDisplayName(partnerUsername)
  ) {
    return { ok: false, error: "You cannot register yourself as your own partner." };
  }

  const partner = await findUserByUsername(partnerUsername);

  if (!partner) {
    return { ok: false, error: "Partner username not found. They must sign up first." };
  }

  if (!partner.signupCompleted) {
    return { ok: false, error: "Your partner must complete signup before you can register them." };
  }

  const partnerMissing = validateGameProfile(GameSlug.EA_FC26, partner);
  if (partnerMissing.length > 0) {
    return {
      ok: false,
      error: "Your partner must complete their profile (date of birth and Olympus ID) first.",
    };
  }

  const existing = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentId: tournament.id,
      userId: { in: [userId, partner.id] },
    },
    select: { userId: true },
  });

  if (existing.some((r) => r.userId === userId)) {
    return { ok: false, error: "You are already registered for this tournament." };
  }
  if (existing.some((r) => r.userId === partner.id)) {
    return { ok: false, error: "Your partner is already registered for this tournament." };
  }

  const teamName = input.teamName.trim();
  const sortOrder = (tournament.tournamentTeams[0]?.sortOrder ?? -1) + 1;
  const partnerDisplayName =
    partner.playerProfile?.displayName ?? partner.name ?? "Player";
  const initiatorDisplayName =
    initiator.playerProfile?.displayName ?? initiator.name ?? "Captain";

  try {
    const captainReg = await prisma.$transaction(async (tx) => {
      const team = await tx.tournamentTeam.create({
        data: {
          tournamentId: tournament.id,
          name: teamName,
          captainUserId: userId,
          sortOrder,
        },
      });

      const captainRegistration = await tx.tournamentRegistration.create({
        data: {
          tournamentId: tournament.id,
          userId,
          participantRole: "CAPTAIN",
          teamId: team.id,
          teamName,
          partnerUserId: partner.id,
          partnerName: partnerDisplayName,
          snapshotPartnerUsername: partnerDisplayName,
          ...userSnapshotFields(initiator),
          status: "APPROVED",
        },
      });

      await tx.tournamentRegistration.create({
        data: {
          tournamentId: tournament.id,
          userId: partner.id,
          participantRole: "PLAYER",
          teamId: team.id,
          teamName,
          partnerUserId: initiator.id,
          partnerName: initiatorDisplayName,
          snapshotPartnerUsername: initiatorDisplayName,
          ...userSnapshotFields(partner),
          status: "APPROVED",
        },
      });

      await tx.tournamentTeam.update({
        where: { id: team.id },
        data: { sourceRegistrationId: captainRegistration.id },
      });

      return captainRegistration;
    });

    return { ok: true, registrationId: captainReg.id };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return { ok: false, error: "One of you is already registered for this tournament." };
    }
    throw e;
  }
}

export type SetPlacementInput = {
  role: import("@prisma/client").PlacementRole;
  teamLabel?: string;
  userId?: string;
};

export async function setTournamentPlacements(
  slug: string,
  placements: SetPlacementInput[],
  options?: { clearRoles?: import("@prisma/client").PlacementRole[] },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  const clearRoles = options?.clearRoles ?? [];

  await prisma.$transaction([
    ...clearRoles.map((role) =>
      prisma.tournamentPlacement.deleteMany({
        where: { tournamentId: tournament.id, role },
      }),
    ),
    ...placements.map((p) =>
      prisma.tournamentPlacement.upsert({
        where: {
          tournamentId_role: { tournamentId: tournament.id, role: p.role },
        },
        create: {
          tournamentId: tournament.id,
          role: p.role,
          teamLabel: p.teamLabel ?? null,
          userId: p.userId ?? null,
        },
        update: {
          teamLabel: p.teamLabel ?? null,
          userId: p.userId ?? null,
        },
      }),
    ),
  ]);

  return { ok: true };
}

export type UpdateTournamentAdminInput = {
  status?: "DRAFT" | "UPCOMING" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  prizePool?: number;
  prizeNotes?: string;
  hideAfter?: string | null;
};

export async function updateTournamentAdmin(
  slug: string,
  input: UpdateTournamentAdminInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return { ok: false, error: "Tournament not found." };
  }

  await prisma.tournament.update({
    where: { slug },
    data: {
      status: input.status,
      prizePool: input.prizePool,
      prizeNotes: input.prizeNotes,
      hideAfter: input.hideAfter === null ? null : input.hideAfter ? new Date(input.hideAfter) : undefined,
    },
  });

  return { ok: true };
}

export async function buildRegistrationSnapshotForUser(
  userId: string,
  game: GameSlug,
): Promise<
  | {
      ok: true;
      data: {
        snapshotDisplayName: string | null;
        snapshotPhone: string | null;
        snapshotOlympusId: string | null;
        snapshotDateOfBirth: Date | null;
        snapshotRiotId: string | null;
        snapshotSteamId64: string | null;
        snapshotCs2Hours: number | null;
        snapshotCs2PeakPremier: string | null;
        snapshotCs2FaceitRank: string | null;
        snapshotRankTier: string | null;
        snapshotRankTierId: number | null;
        snapshotValorantRoles: ValorantRole[] | null;
      };
    }
  | { ok: false; error: string }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });
  if (!user) return { ok: false, error: "Member not found." };

  let snapshotRankTier: string | null = null;
  let snapshotRankTierId: number | null = null;
  let snapshotValorantRoles: ValorantRole[] | null = null;
  let snapshotCs2PeakPremier: string | null = null;
  let snapshotCs2Faceit: string | null = null;

  if (game === GameSlug.VALORANT) {
    const rank = await getValorantRankSnapshot(userId);
    snapshotRankTier = rank.tier;
    snapshotRankTierId = rank.tierId;
    snapshotValorantRoles = user.playerProfile?.valorantRoles ?? [];
  }

  if (game === GameSlug.CS2) {
    const premier = user.playerProfile?.cs2PeakPremierRank ?? null;
    snapshotCs2PeakPremier = premier
      ? normalizeCs2PeakPremierRank(premier) ?? premier
      : null;
    snapshotCs2Faceit = user.playerProfile?.cs2FaceitRank ?? null;
  }

  return {
    ok: true,
    data: {
      ...userSnapshotFields(user),
      snapshotRankTier,
      snapshotRankTierId,
      snapshotValorantRoles,
      snapshotCs2PeakPremier,
      snapshotCs2FaceitRank: snapshotCs2Faceit,
    },
  };
}

export async function adminAddTournamentRegistration(
  slug: string,
  input: {
    userId?: string;
    username?: string;
    email?: string;
    participantRole?: RegistrationParticipantRole;
    teamName?: string;
  },
): Promise<{ ok: true; registrationId: string } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { tournamentTeams: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  let userId = input.userId?.trim();
  if (!userId && input.username?.trim()) {
    const byUsername = await findUserByUsername(input.username);
    userId = byUsername?.id;
  }
  if (!userId && input.email?.trim()) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: input.email.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    userId = byEmail?.id;
  }
  if (!userId) return { ok: false, error: "Member not found." };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) return { ok: false, error: "Member not found." };

  const existing = await prisma.tournamentRegistration.findUnique({
    where: {
      tournamentId_userId: { tournamentId: tournament.id, userId },
    },
  });
  if (existing) {
    return { ok: false, error: "Member is already registered for this cup." };
  }

  const snapshot = await buildRegistrationSnapshotForUser(userId, tournament.game);
  if (!snapshot.ok) return snapshot;

  const participantRole = input.participantRole ?? "PLAYER";
  const baseData = {
    tournamentId: tournament.id,
    userId,
    participantRole,
    ...snapshot.data,
    snapshotValorantRoles: snapshot.data.snapshotValorantRoles
      ? (snapshot.data.snapshotValorantRoles as unknown as import("@prisma/client").Prisma.InputJsonValue)
      : undefined,
    status: "APPROVED" as const,
  };

  try {
    if (participantRole === "CAPTAIN") {
      if (!input.teamName?.trim()) {
        return { ok: false, error: "Team name is required for captain registration." };
      }

      const sortOrder = (tournament.tournamentTeams[0]?.sortOrder ?? -1) + 1;
      const teamName = input.teamName.trim();

      const reg = await prisma.$transaction(async (tx) => {
        const team = await tx.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            name: teamName,
            captainUserId: userId,
            sortOrder,
          },
        });

        const created = await tx.tournamentRegistration.create({
          data: {
            ...baseData,
            teamId: team.id,
            teamName,
          },
        });

        await tx.tournamentTeam.update({
          where: { id: team.id },
          data: { sourceRegistrationId: created.id },
        });

        return created;
      });

      await logUserActivity({
        userId,
        email: user.email,
        name: user.name,
        action: "TOURNAMENT_REGISTER",
        target: slug,
        details: `Registered for cup "${tournament.name}" as Captain of ${teamName} (by Admin).`,
      });

      return { ok: true, registrationId: reg.id };
    }

    const reg = await prisma.tournamentRegistration.create({
      data: {
        ...baseData,
        participantRole: "PLAYER",
      },
    });

    await logUserActivity({
      userId,
      email: user.email,
      name: user.name,
      action: "TOURNAMENT_REGISTER",
      target: slug,
      details: `Registered for cup "${tournament.name}" as Player (by Admin).`,
    });

    return { ok: true, registrationId: reg.id };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return { ok: false, error: "Member is already registered for this cup." };
    }
    throw e;
  }
}

export async function adminRemoveTournamentRegistration(
  slug: string,
  registrationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const reg = await prisma.tournamentRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!reg || reg.tournamentId !== tournament.id) {
    return { ok: false, error: "Registration not found." };
  }

  const user = await prisma.user.findUnique({
    where: { id: reg.userId },
    select: { email: true, name: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tournamentTeamPlayer.deleteMany({ where: { registrationId: reg.id } });

    if (reg.participantRole === "CAPTAIN" && reg.teamId) {
      await tx.tournamentTeamPlayer.deleteMany({ where: { teamId: reg.teamId } });
      await tx.tournamentRegistration.deleteMany({ where: { teamId: reg.teamId } });
      await tx.tournamentTeam.delete({ where: { id: reg.teamId } });
    } else {
      await tx.tournamentRegistration.delete({ where: { id: reg.id } });
    }

    await tx.tournament.update({
      where: { id: tournament.id },
      data: { updatedAt: new Date() },
    });
  });

  if (user) {
    await logUserActivity({
      userId: reg.userId,
      email: user.email,
      name: user.name,
      action: "TOURNAMENT_UNREGISTER",
      target: slug,
      details: `Removed registration for cup "${tournament.name}" (by Admin).`,
    });
  }

  return { ok: true };
}
