import { prisma } from "@core/database/client";
import type { PlayedGame, ValorantRole } from "@prisma/client";
import {
  isOlympusIdTaken,
  isUsernameTaken,
  olympusIdKeyFromValue,
  usernameKeyFromDisplayName,
} from "../domain/username";
import {
  parsePlayedGames,
  validateValorantRoles,
  normalizeCs2PeakPremierRank,
  normalizeCs2FaceitRank,
} from "../domain/game-profile";
import { clearSignupSession } from "../infrastructure/signup-session";

export type PlayerGameProfile = {
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  olympusId: string | null;
  playedGames: PlayedGame[];
  valorantRoles: ValorantRole[];
  cs2PeakPremierRank: string | null;
  cs2FaceitRank: string | null;
  riotId: string | null;
  riotPuuid: string | null;
  steamId64: string | null;
  steamPersonaName: string | null;
  steamProfileUrl: string | null;
  cs2HoursPlayed: number | null;
  valorantRankTier: string | null;
  valorantRankTierId: number | null;
  signupCompleted: boolean;
};

export async function getPlayerGameProfile(userId: string): Promise<PlayerGameProfile | null> {
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
  if (!user?.playerProfile) return null;

  const rank = user.leaderboard[0];
  return {
    userId: user.id,
    displayName: user.playerProfile.displayName,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    olympusId: user.olympusId,
    playedGames: user.playerProfile.playedGames,
    valorantRoles: user.playerProfile.valorantRoles,
    cs2PeakPremierRank: user.playerProfile.cs2PeakPremierRank,
    cs2FaceitRank: user.playerProfile.cs2FaceitRank,
    riotId:
      user.riotGameName && user.riotTagLine
        ? `${user.riotGameName}#${user.riotTagLine}`
        : null,
    riotPuuid: user.riotPuuid,
    steamId64: user.steamId64,
    steamPersonaName: user.steamPersonaName,
    steamProfileUrl: user.steamProfileUrl,
    cs2HoursPlayed: user.cs2HoursPlayed,
    valorantRankTier: rank?.rankTier ?? null,
    valorantRankTierId: rank?.rankTierId ?? null,
    signupCompleted: user.signupCompleted,
  };
}

export async function migrateLegacySignupUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });
  if (!user) return;

  if (user.signupCompleted) return;
  if (!user.emailVerified || !user.playerProfile) return;

  await prisma.user.update({
    where: { id: userId },
    data: { signupCompleted: true },
  });
}

export async function selectPlayedGames(
  userId: string,
  input: { valorant?: boolean; cs2?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const games = parsePlayedGames(input);
  if (games.length === 0) {
    return { ok: false, error: "Select at least one game." };
  }

  await prisma.playerProfile.update({
    where: { userId },
    data: { playedGames: games },
  });

  return { ok: true };
}

export async function updateValorantRoles(
  userId: string,
  roles: ValorantRole[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = validateValorantRoles(roles);
  if (err) return { ok: false, error: err };

  await prisma.playerProfile.update({
    where: { userId },
    data: { valorantRoles: roles },
  });
  return { ok: true };
}

export async function updateCs2PeakPremierRank(
  userId: string,
  raw: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const normalized = normalizeCs2PeakPremierRank(raw);
  if (!normalized) {
    return { ok: false, error: "Use format #12345 or NA." };
  }

  await prisma.playerProfile.update({
    where: { userId },
    data: { cs2PeakPremierRank: normalized },
  });
  return { ok: true, value: normalized };
}

export async function updateCs2FaceitRank(
  userId: string,
  raw: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const normalized = normalizeCs2FaceitRank(raw);
  if (!normalized) {
    return { ok: false, error: "Enter your Faceit rank or NA." };
  }

  await prisma.playerProfile.update({
    where: { userId },
    data: { cs2FaceitRank: normalized },
  });
  return { ok: true, value: normalized };
}

export async function updateAccountInfo(
  userId: string,
  input: { dateOfBirth?: string; olympusId?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const data: { dateOfBirth?: Date; olympusId?: string; olympusIdKey?: string } = {};
  if (input.dateOfBirth) {
    const d = new Date(`${input.dateOfBirth}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Invalid date of birth." };
    }
    data.dateOfBirth = d;
  }
  if (input.olympusId !== undefined) {
    const trimmed = input.olympusId.trim();
    if (!trimmed) return { ok: false, error: "Olympus ID cannot be empty." };
    if (await isOlympusIdTaken(trimmed, userId)) {
      return { ok: false, error: "That Olympus ID is already registered to another account." };
    }
    data.olympusId = trimmed;
    data.olympusIdKey = olympusIdKeyFromValue(trimmed);
  }
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }
  await prisma.user.update({ where: { id: userId }, data });
  return { ok: true };
}

export async function addPlayedGame(
  userId: string,
  game: PlayedGame,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false, error: "Profile not found." };

  if (profile.playedGames.includes(game)) return { ok: true };

  await prisma.playerProfile.update({
    where: { userId },
    data: { playedGames: [...profile.playedGames, game] },
  });
  return { ok: true };
}

export async function tryCompleteSignup(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });
  if (!user?.emailVerified) {
    return { ok: false, error: "Verify your email first." };
  }
  if (!user.playerProfile) {
    return { ok: false, error: "Profile not found." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { signupCompleted: true },
  });
  await clearSignupSession();
  return { ok: true };
}

export function computeSignupStep(user: {
  signupCompleted: boolean;
  emailVerified: Date | null;
}): 2 | null {
  if (user.signupCompleted) return null;
  if (!user.emailVerified) return 2;
  return null;
}
