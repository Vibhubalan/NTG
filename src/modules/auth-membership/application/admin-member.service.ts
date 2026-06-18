import bcrypt from "bcryptjs";
import { prisma } from "@core/database/client";
import { computeAgeFromDateOfBirth } from "@/lib/date-age";
import {
  isUsernameTaken,
  usernameKeyFromDisplayName,
} from "../domain/username";
import { linkRiotAccount, unlinkRiotAccount } from "@auth-membership/application/riot-link.service";
import { linkSteamAccount, unlinkSteamAccount } from "@auth-membership/application/steam-link.service";
import type { UserRole } from "@prisma/client";

const MIN_PASSWORD = 8;

export async function listMembersAdmin(opts?: { search?: string; limit?: number; offset?: number }) {
  const search = opts?.search?.trim();
  const limit = Math.min(opts?.limit ?? 50, 100);
  const offset = opts?.offset ?? 0;

  const where = {
    signupCompleted: true,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { olympusId: { contains: search, mode: "insensitive" as const } },
            { playerProfile: { displayName: { contains: search, mode: "insensitive" as const } } },
            { riotGameName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { playerProfile: true },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      dateOfBirth: u.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      age: computeAgeFromDateOfBirth(u.dateOfBirth),
      olympusId: u.olympusId,
      role: u.role,
      signupCompleted: u.signupCompleted,
      emailVerified: Boolean(u.emailVerified),
      riotId:
        u.riotGameName && u.riotTagLine ? `${u.riotGameName}#${u.riotTagLine}` : null,
      steamId64: u.steamId64,
      steamPersonaName: u.steamPersonaName,
      displayName: u.playerProfile?.displayName ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
  };
}

export async function getMemberAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    age: computeAgeFromDateOfBirth(user.dateOfBirth),
    olympusId: user.olympusId,
    role: user.role,
    signupCompleted: user.signupCompleted,
    emailVerified: Boolean(user.emailVerified),
    riotId:
      user.riotGameName && user.riotTagLine
        ? `${user.riotGameName}#${user.riotTagLine}`
        : null,
    steamId64: user.steamId64,
    steamPersonaName: user.steamPersonaName,
    displayName: user.playerProfile?.displayName ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createMemberAdmin(input: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  displayName?: string;
  role?: UserRole;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Invalid email." };
  if (input.password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Email already registered." };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const displayName = input.displayName?.trim() || input.name?.trim() || email.split("@")[0];
  if (await isUsernameTaken(displayName)) {
    return { ok: false, error: "That username is already taken." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
      phone: input.phone?.trim() || null,
      role: input.role ?? "PLAYER",
      emailVerified: new Date(),
      signupCompleted: true,
      playerProfile: {
        create: {
          displayName,
          usernameKey: usernameKeyFromDisplayName(displayName),
        },
      },
    },
  });

  return { ok: true, userId: user.id };
}

export async function updateMemberAdmin(
  userId: string,
  input: {
    name?: string;
    phone?: string;
    role?: UserRole;
    displayName?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  if (input.role === "PLAYER" && user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { ok: false, error: "Cannot demote the last admin." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name?.trim(),
      phone: input.phone?.trim() || null,
      role: input.role,
    },
  });

  if (input.displayName !== undefined) {
    const trimmed = input.displayName.trim() || "Player";
    if (await isUsernameTaken(trimmed, userId)) {
      return { ok: false, error: "That username is already taken." };
    }
    await prisma.playerProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: trimmed,
        usernameKey: usernameKeyFromDisplayName(trimmed),
      },
      update: {
        displayName: trimmed,
        usernameKey: usernameKeyFromDisplayName(trimmed),
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { name: trimmed },
    });
  }

  return { ok: true };
}

export async function resetMemberPasswordAdmin(
  userId: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < MIN_PASSWORD) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true };
}

export async function linkMemberRiotAdmin(
  userId: string,
  riotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  return linkRiotAccount(userId, riotId);
}

export async function unlinkMemberRiotAdmin(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  return unlinkRiotAccount(userId);
}

export async function linkMemberSteamAdmin(
  userId: string,
  steamUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  
  const result = await linkSteamAccount(userId, steamUrl);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function unlinkMemberSteamAdmin(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  return unlinkSteamAccount(userId);
}

export async function deleteMemberAdmin(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { ok: false, error: "Cannot delete the last admin." };
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));
}
