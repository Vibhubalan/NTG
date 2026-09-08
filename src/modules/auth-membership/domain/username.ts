import { prisma } from "@core/database/client";
import { riotIdSegmentLengths } from "@/lib/riot-id";
import { AUTH_SIGNUP_DETAILS_CONFLICT } from "./auth-messages";

/** Lowercase key used for case-insensitive identity uniqueness. */
export function normalizeIdentityKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Lowercase key used for case-insensitive username uniqueness. */
export function usernameKeyFromDisplayName(name: string): string {
  return normalizeIdentityKey(name);
}

export function isOlympusIdSpecialNA(olympusId: string): boolean {
  const normalized = olympusId.trim().toLowerCase();
  return normalized === "na" || normalized === "n/a" || normalized === "n.a" || normalized === "none";
}

export function olympusIdKeyFromValue(olympusId: string, uniqueSuffix?: string): string {
  const trimmed = olympusId.trim();
  if (isOlympusIdSpecialNA(trimmed)) {
    const suffix = uniqueSuffix || Math.random().toString(36).substring(2, 15);
    return `na-${suffix.toLowerCase()}`;
  }
  return normalizeIdentityKey(trimmed);
}

export async function isUsernameTaken(
  displayName: string,
  excludeUserId?: string,
): Promise<boolean> {
  const usernameKey = usernameKeyFromDisplayName(displayName);
  const profile = await prisma.playerProfile.findUnique({
    where: { usernameKey },
    select: { userId: true },
  });
  if (!profile) return false;
  if (excludeUserId && profile.userId === excludeUserId) return false;
  return true;
}

export async function isUsernameReservedByPendingSignup(
  displayName: string,
  excludeEmail?: string,
): Promise<boolean> {
  const key = usernameKeyFromDisplayName(displayName);
  const pending = await prisma.pendingSignup.findMany({
    where: {
      expiresAt: { gt: new Date() },
      ...(excludeEmail ? { email: { not: excludeEmail } } : {}),
    },
    select: { displayName: true },
  });
  return pending.some((p) => usernameKeyFromDisplayName(p.displayName) === key);
}

export async function isOlympusIdTaken(
  olympusId: string,
  excludeUserId?: string,
): Promise<boolean> {
  if (isOlympusIdSpecialNA(olympusId)) return false;
  const olympusIdKey = olympusIdKeyFromValue(olympusId);
  const user = await prisma.user.findUnique({
    where: { olympusIdKey },
    select: { id: true, signupCompleted: true },
  });
  if (!user?.signupCompleted) return false;
  if (excludeUserId && user.id === excludeUserId) return false;
  return true;
}

export async function isOlympusIdReservedByPendingSignup(
  olympusId: string,
  excludeEmail?: string,
): Promise<boolean> {
  if (isOlympusIdSpecialNA(olympusId)) return false;
  const olympusIdKey = olympusIdKeyFromValue(olympusId);
  const pending = await prisma.pendingSignup.findFirst({
    where: {
      olympusIdKey,
      expiresAt: { gt: new Date() },
      ...(excludeEmail ? { email: { not: excludeEmail } } : {}),
    },
    select: { id: true },
  });
  return Boolean(pending);
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { signupCompleted: true },
  });
  return Boolean(user?.signupCompleted);
}

export async function isPhoneRegistered(phone: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { signupCompleted: true },
  });
  return Boolean(user?.signupCompleted);
}

export async function isPhoneReservedByPendingSignup(
  phone: string,
  excludeEmail?: string,
): Promise<boolean> {
  const pending = await prisma.pendingSignup.findFirst({
    where: {
      phone,
      expiresAt: { gt: new Date() },
      ...(excludeEmail ? { email: { not: excludeEmail } } : {}),
    },
    select: { id: true },
  });
  return Boolean(pending);
}

export type SignupIdentityInput = {
  email: string;
  phone: string;
  displayName: string;
  olympusId: string;
  excludePendingEmail?: string;
};

/** Validates username, email, phone, and Olympus ID are not shared with another account. */
export async function validateSignupIdentityFields(
  input: SignupIdentityInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isEmailRegistered(input.email)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  if (await isPhoneRegistered(input.phone)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  if (await isPhoneReservedByPendingSignup(input.phone, input.excludePendingEmail)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  if (await isUsernameTaken(input.displayName)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  if (await isUsernameReservedByPendingSignup(input.displayName, input.excludePendingEmail)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  if (await isOlympusIdTaken(input.olympusId)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  if (await isOlympusIdReservedByPendingSignup(input.olympusId, input.excludePendingEmail)) {
    return { ok: false, error: AUTH_SIGNUP_DETAILS_CONFLICT };
  }
  return { ok: true };
}

export async function findUserByUsername(username: string) {
  const usernameKey = usernameKeyFromDisplayName(username);
  return prisma.user.findFirst({
    where: {
      playerProfile: { usernameKey },
    },
    include: { playerProfile: true },
  });
}

/**
 * Resolve a teammate lookup that may be an NTG username or a Riot ID (Name#Tag).
 * Tries Riot ID first (only when the query parses as one), then falls back to username.
 */
export async function findUserByUsernameOrRiotId(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const riotParsed = riotIdSegmentLengths(trimmed);
  if (riotParsed) {
    const byRiot = await prisma.user.findFirst({
      where: {
        riotGameName: { equals: riotParsed.gameName, mode: "insensitive" },
        riotTagLine: { equals: riotParsed.tagLine, mode: "insensitive" },
      },
      include: { playerProfile: true },
    });
    if (byRiot) return byRiot;
  }

  return findUserByUsername(trimmed);
}
