import bcrypt from "bcryptjs";
import { prisma } from "@core/database/client";
import type { SignupStep1Input } from "../domain/schemas";
import { normalizePhone } from "../domain/schemas";
import {
  olympusIdKeyFromValue,
  usernameKeyFromDisplayName,
  validateSignupIdentityFields,
} from "../domain/username";
import { clearSignupSession } from "../infrastructure/signup-session";
import { verifySignupOtp } from "./email-otp.service";

const PENDING_TTL_MS = 30 * 60 * 1000; // matches signup cookie

export type PendingSignupRecord = {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  displayName: string;
  dateOfBirth: Date;
  olympusId: string;
};

function parseDateOfBirth(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

async function purgeExpiredPending(): Promise<void> {
  await prisma.pendingSignup.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/** Remove legacy User rows that were created before OTP-only signup. */
async function deleteLegacyIncompleteUser(email: string, phone: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ email }, { phone }],
      signupCompleted: false,
      emailVerified: null,
    },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.user.deleteMany({
    where: { id: { in: users.map((u) => u.id) } },
  });
}

export async function savePendingSignup(
  input: SignupStep1Input,
  passwordHash: string,
): Promise<
  | { ok: true; pendingId: string }
  | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const olympusId = input.olympusId.trim();
  const dateOfBirth = parseDateOfBirth(input.dateOfBirth);

  let phone: string;
  try {
    phone = normalizePhone(input.phone);
  } catch {
    return { ok: false, error: "Invalid phone number." };
  }

  await purgeExpiredPending();
  await deleteLegacyIncompleteUser(email, phone);

  const identityCheck = await validateSignupIdentityFields({
    email,
    phone,
    displayName,
    olympusId,
    excludePendingEmail: email,
  });
  if (!identityCheck.ok) return identityCheck;

  const phoneConflict = await prisma.pendingSignup.findUnique({ where: { phone } });
  if (phoneConflict && phoneConflict.email !== email) {
    await prisma.pendingSignup.delete({ where: { id: phoneConflict.id } });
  }

  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

  const pending = await prisma.pendingSignup.upsert({
    where: { email },
    create: {
      email,
      phone,
      passwordHash,
      displayName,
      dateOfBirth,
      olympusId,
      olympusIdKey: olympusIdKeyFromValue(olympusId),
      expiresAt,
    },
    update: {
      phone,
      passwordHash,
      displayName,
      dateOfBirth,
      olympusId,
      olympusIdKey: olympusIdKeyFromValue(olympusId),
      expiresAt,
    },
  });

  return { ok: true, pendingId: pending.id };
}

export async function getPendingSignup(
  pendingId: string,
): Promise<PendingSignupRecord | null> {
  await purgeExpiredPending();
  const row = await prisma.pendingSignup.findUnique({ where: { id: pendingId } });
  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.pendingSignup.delete({ where: { id: pendingId } }).catch(() => {});
    return null;
  }
  return row;
}

export async function abandonPendingSignup(
  pendingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await prisma.pendingSignup.deleteMany({ where: { id: pendingId } });
  await clearSignupSession();
  return { ok: true };
}

export async function abandonPendingSignupByEmailPassword(
  emailRaw: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    return { ok: false, error: "No pending signup found for this email." };
  }

  const valid = await bcrypt.compare(password, pending.passwordHash);
  if (!valid) {
    return { ok: false, error: "Password does not match the pending signup." };
  }

  await prisma.pendingSignup.delete({ where: { id: pending.id } });
  await clearSignupSession();
  return { ok: true };
}

/** Verifies OTP, creates the User row, and removes the pending signup. */
export async function finalizePendingSignup(
  pendingId: string,
  code: string,
): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; error: string }
> {
  const pending = await getPendingSignup(pendingId);
  if (!pending) {
    return { ok: false, error: "Signup session expired. Start again." };
  }

  const verified = await verifySignupOtp(pending.email, code);
  if (!verified.ok) return verified;

  const stillTaken = await prisma.user.findFirst({
    where: {
      OR: [{ email: pending.email }, { phone: pending.phone }],
    },
    select: { id: true, signupCompleted: true },
  });
  if (stillTaken?.signupCompleted) {
    await prisma.pendingSignup.delete({ where: { id: pendingId } }).catch(() => {});
    return { ok: false, error: "This email or phone is already registered." };
  }
  if (stillTaken) {
    await prisma.user.delete({ where: { id: stillTaken.id } });
  }

  const identityCheck = await validateSignupIdentityFields({
    email: pending.email,
    phone: pending.phone,
    displayName: pending.displayName,
    olympusId: pending.olympusId,
  });
  if (!identityCheck.ok) return identityCheck;

  const user = await prisma.user.create({
    data: {
      email: pending.email,
      name: pending.displayName,
      phone: pending.phone,
      passwordHash: pending.passwordHash,
      dateOfBirth: pending.dateOfBirth,
      olympusId: pending.olympusId,
      olympusIdKey: olympusIdKeyFromValue(pending.olympusId),
      emailVerified: new Date(),
      signupCompleted: true,
      playerProfile: {
        create: {
          displayName: pending.displayName,
          usernameKey: usernameKeyFromDisplayName(pending.displayName),
          town: "Mangaluru",
        },
      },
    },
  });

  await prisma.pendingSignup.delete({ where: { id: pendingId } });
  await clearSignupSession();

  return { ok: true, userId: user.id, email: pending.email };
}
