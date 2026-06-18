import { prisma } from "@core/database/client";

/** Lowercase key used for case-insensitive identity uniqueness. */
export function normalizeIdentityKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Lowercase key used for case-insensitive username uniqueness. */
export function usernameKeyFromDisplayName(name: string): string {
  return normalizeIdentityKey(name);
}

export function olympusIdKeyFromValue(olympusId: string): string {
  return normalizeIdentityKey(olympusId);
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
    return {
      ok: false,
      error: "Unable to register with these details. If you already have an account, sign in instead.",
    };
  }
  if (await isPhoneRegistered(input.phone)) {
    return {
      ok: false,
      error: "Unable to register with these details. If you already have an account, sign in instead.",
    };
  }
  if (await isPhoneReservedByPendingSignup(input.phone, input.excludePendingEmail)) {
    return {
      ok: false,
      error: "Unable to register with these details. If you already have an account, sign in instead.",
    };
  }
  if (await isUsernameTaken(input.displayName)) {
    return { ok: false, error: "That username is already taken. Choose another." };
  }
  if (await isUsernameReservedByPendingSignup(input.displayName, input.excludePendingEmail)) {
    return { ok: false, error: "That username is already taken. Choose another." };
  }
  if (await isOlympusIdTaken(input.olympusId)) {
    return { ok: false, error: "That Olympus ID is already registered. Use your own Olympus ID." };
  }
  if (await isOlympusIdReservedByPendingSignup(input.olympusId, input.excludePendingEmail)) {
    return { ok: false, error: "That Olympus ID is already in use. Choose another." };
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
