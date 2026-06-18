import bcrypt from "bcryptjs";
import { AUTH_RATE_LIMITS, checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@core/database/client";
import type { SignupStep1Input } from "../domain/schemas";
import {
  setSignupSession,
  clearSignupSession,
} from "../infrastructure/signup-session";
import { sendEmailOtp } from "./email-otp.service";
import { linkRiotAccount } from "./riot-link.service";
import { migrateLegacySignupUser, tryCompleteSignup } from "./game-profile.service";
import {
  abandonPendingSignup,
  abandonPendingSignupByEmailPassword,
  finalizePendingSignup,
  getPendingSignup,
  savePendingSignup,
} from "./pending-signup.service";

const MIN_PASSWORD = 8;

const SIGNUP_CONFLICT_ERROR =
  "Unable to register with these details. If you already have an account, sign in instead.";

export type RegisterResult =
  | { ok: true; resumeStep?: 2; devOtp?: string; devOtpHint?: string }
  | { ok: false; error: string };

export type SignupStatus = {
  step: 2 | null;
  email?: string;
  displayName?: string;
  pendingVerification?: boolean;
};

export type LoginBlockResult = {
  reason: string | null;
  resumeStep?: 2;
  devOtp?: string;
  devOtpHint?: string;
};

export async function registerStep1(
  input: SignupStep1Input,
): Promise<RegisterResult> {
  if (input.password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const saved = await savePendingSignup(input, passwordHash);
  if (!saved.ok) return saved;

  await setSignupSession(saved.pendingId);

  const email = input.email.trim().toLowerCase();
  const otp = await sendEmailOtp(email);
  if (!otp.ok) {
    if (otp.cooldown) {
      return { ok: true, resumeStep: 2 };
    }
    await abandonPendingSignup(saved.pendingId);
    return { ok: false, error: otp.error };
  }

  return {
    ok: true,
    resumeStep: 2,
    devOtp: otp.devOtp,
    devOtpHint: otp.devOtpHint,
  };
}

export async function getSignupStatus(pendingId: string): Promise<SignupStatus> {
  const pending = await getPendingSignup(pendingId);
  if (!pending) {
    await clearSignupSession();
    return { step: null };
  }

  return {
    step: null,
    pendingVerification: true,
    email: pending.email,
    displayName: pending.displayName,
  };
}

export async function abandonIncompleteSignup(
  pendingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return abandonPendingSignup(pendingId);
}

export async function abandonIncompleteSignupWithCredentials(
  emailRaw: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return abandonPendingSignupByEmailPassword(emailRaw, password);
}

export async function resendOtpForSignup(
  pendingId: string,
): Promise<{ ok: true; devOtp?: string; devOtpHint?: string } | { ok: false; error: string }> {
  const pending = await getPendingSignup(pendingId);
  if (!pending) {
    return { ok: false, error: "Signup session expired. Start signup again." };
  }

  const result = await sendEmailOtp(pending.email);
  if (!result.ok) {
    if (result.cooldown) return { ok: true };
    return { ok: false, error: result.error };
  }

  return { ok: true, devOtp: result.devOtp, devOtpHint: result.devOtpHint };
}

export async function verifyOtpStep2(
  pendingId: string,
  code: string,
): Promise<{ ok: true; userId: string; email: string } | { ok: false; error: string }> {
  return finalizePendingSignup(pendingId, code);
}

export async function linkRiotDuringSignup(
  userId: string,
  riotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Session expired. Start signup again." };
  if (!user.emailVerified) {
    return { ok: false, error: "Verify your email first." };
  }

  return linkRiotAccount(userId, riotId);
}

/** @deprecated Use linkRiotDuringSignup + completeSignupFlow */
export async function completeRiotStep3(
  userId: string,
  riotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const linked = await linkRiotDuringSignup(userId, riotId);
  if (!linked.ok) return linked;
  return completeSignupFlow(userId);
}

export async function completeSignupFlow(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return tryCompleteSignup(userId);
}

export async function registerMember(): Promise<RegisterResult> {
  return { ok: false, error: "Use the signup wizard at /signup." };
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const normalized = email.trim().toLowerCase();

  const limited = await checkRateLimit(normalized, AUTH_RATE_LIMITS.loginEmail);
  if (!limited.ok) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: { playerProfile: true },
  });
  if (!user?.passwordHash) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  if (!user.phone) {
    return { id: user.id, email: user.email!, name: user.name };
  }

  await migrateLegacySignupUser(user.id);

  const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
  if (!refreshed?.emailVerified || !refreshed.signupCompleted) {
    return null;
  }

  return { id: user.id, email: user.email!, name: user.name };
}

export async function getLoginBlockReason(
  email: string,
  password: string,
): Promise<LoginBlockResult> {
  const normalized = email.trim().toLowerCase();

  const pending = await prisma.pendingSignup.findUnique({ where: { email: normalized } });
  if (pending) {
    const valid = await bcrypt.compare(password, pending.passwordHash);
    if (valid) {
      await setSignupSession(pending.id);
      const otp = await sendEmailOtp(pending.email);
      return {
        reason: "Finish email verification to create your account.",
        resumeStep: 2,
        devOtp: otp.ok ? otp.devOtp : undefined,
        devOtpHint: otp.ok ? otp.devOtpHint : undefined,
      };
    }
  }

  return { reason: null };
}
