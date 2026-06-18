import bcrypt from "bcryptjs";
import { AUTH_RATE_LIMITS, checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@core/database/client";
import {
  normalizePhone,
  type SignupStep1Input,
} from "../domain/schemas";
import { generateUniqueAccountId } from "../domain/account-id";
import { setSignupSession, clearSignupSession } from "../infrastructure/signup-session";
import { sendEmailOtp, verifyEmailOtp } from "./email-otp.service";
import { linkRiotAccount } from "./riot-link.service";
import {
  computeSignupStep,
  migrateLegacySignupUser,
  tryCompleteSignup,
} from "./game-profile.service";

const MIN_PASSWORD = 8;

const SIGNUP_CONFLICT_ERROR =
  "Unable to register with these details. If you already have an account, sign in instead.";

export type RegisterResult =
  | { ok: true; userId: string; resumeStep?: 2; devOtp?: string }
  | { ok: false; error: string };

export type SignupStatus = {
  step: 2 | null;
  email?: string;
  displayName?: string;
};

export type LoginBlockResult = {
  reason: string | null;
  resumeStep?: 2;
  devOtp?: string;
};

function isEmailVerified(user: { emailVerified: Date | null }): boolean {
  return user.emailVerified != null;
}

type SignupUserShape = {
  signupCompleted: boolean;
  emailVerified: Date | null;
};

function signupResumeStep(user: SignupUserShape): 2 | null {
  if (user.signupCompleted) return null;
  return computeSignupStep(user);
}

function parseDateOfBirth(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

async function resumeIncompleteSignup(
  userId: string,
  email: string,
  displayName: string,
  phone: string,
  passwordHash: string,
  dateOfBirth: Date,
  olympusId: string,
): Promise<RegisterResult> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      name: displayName,
      phone,
      passwordHash,
      dateOfBirth,
      olympusId,
      playerProfile: {
        upsert: {
          create: { displayName, town: "Mangaluru" },
          update: { displayName },
        },
      },
    },
  });

  await setSignupSession(userId);

  const otp = await sendEmailOtp(email, userId);
  if (!otp.ok) {
    if (otp.cooldown) {
      return { ok: true, userId, resumeStep: 2 };
    }
    return { ok: false, error: otp.error };
  }

  return { ok: true, userId, resumeStep: 2, devOtp: otp.devOtp };
}

export async function registerStep1(
  input: SignupStep1Input,
): Promise<RegisterResult> {
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

  if (input.password.length < MIN_PASSWORD) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const [existingByEmail, existingByPhone] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      include: { playerProfile: true },
    }),
    prisma.user.findUnique({ where: { phone } }),
  ]);

  if (existingByEmail) {
    const resumeStep = signupResumeStep(existingByEmail);
    if (!resumeStep) {
      return { ok: false, error: SIGNUP_CONFLICT_ERROR };
    }

    if (existingByPhone && existingByPhone.id !== existingByEmail.id) {
      return { ok: false, error: SIGNUP_CONFLICT_ERROR };
    }

    if (resumeStep === 2 && existingByEmail.passwordHash) {
      const passwordMatches = await bcrypt.compare(
        input.password,
        existingByEmail.passwordHash,
      );
      if (!passwordMatches) {
        return { ok: false, error: SIGNUP_CONFLICT_ERROR };
      }

      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          name: displayName,
          phone,
          passwordHash,
          dateOfBirth,
          olympusId,
          playerProfile: {
            upsert: {
              create: { displayName, town: "Mangaluru" },
              update: { displayName },
            },
          },
        },
      });
      await setSignupSession(existingByEmail.id);
      return { ok: true, userId: existingByEmail.id, resumeStep: 2 };
    }

    return resumeIncompleteSignup(
      existingByEmail.id,
      email,
      displayName,
      phone,
      passwordHash,
      dateOfBirth,
      olympusId,
    );
  }

  if (existingByPhone) {
    const phoneUser = await prisma.user.findUniqueOrThrow({
      where: { id: existingByPhone.id },
      include: { playerProfile: true },
    });
    const phoneResumeStep = signupResumeStep(phoneUser);
    if (phoneResumeStep && !existingByPhone.email) {
      return resumeIncompleteSignup(
        existingByPhone.id,
        email,
        displayName,
        phone,
        passwordHash,
        dateOfBirth,
        olympusId,
      );
    }
    return { ok: false, error: SIGNUP_CONFLICT_ERROR };
  }

  const accountId = await generateUniqueAccountId();

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        name: displayName,
        phone,
        passwordHash,
        accountId,
        dateOfBirth,
        olympusId,
        signupCompleted: false,
        playerProfile: {
          create: { displayName, town: "Mangaluru" },
        },
      },
    });
  } catch {
    return { ok: false, error: SIGNUP_CONFLICT_ERROR };
  }

  await setSignupSession(user.id);

  const otp = await sendEmailOtp(email, user.id);
  if (!otp.ok) {
    if (otp.cooldown) {
      return { ok: true, userId: user.id, resumeStep: 2 };
    }
    return { ok: false, error: otp.error };
  }

  return { ok: true, userId: user.id, resumeStep: 2, devOtp: otp.devOtp };
}

export async function getSignupStatus(userId: string): Promise<SignupStatus> {
  await migrateLegacySignupUser(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { playerProfile: true },
  });
  if (!user?.email || user.signupCompleted) {
    return { step: null };
  }

  const step = signupResumeStep(user);
  if (!step) return { step: null };

  return {
    step,
    email: user.email,
    displayName: user.playerProfile?.displayName ?? user.name ?? undefined,
  };
}

export async function resendOtpForSignup(
  userId: string,
): Promise<{ ok: true; devOtp?: string } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) {
    return { ok: false, error: "Session expired. Start signup again." };
  }

  const result = await sendEmailOtp(user.email, userId);
  if (!result.ok) {
    if (result.cooldown) {
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }

  return { ok: true, devOtp: result.devOtp };
}

export async function verifyOtpStep2(
  userId: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) {
    return { ok: false, error: "Session expired. Start signup again." };
  }

  const verified = await verifyEmailOtp(user.email, code, userId);
  if (!verified.ok) return verified;

  return tryCompleteSignup(userId);
}

export async function linkRiotDuringSignup(
  userId: string,
  riotId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Session expired. Start signup again." };
  if (!isEmailVerified(user)) {
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
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: { playerProfile: true },
  });
  if (!user?.passwordHash) return { reason: null };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { reason: null };

  await migrateLegacySignupUser(user.id);
  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    include: { playerProfile: true },
  });
  if (!refreshed) return { reason: null };

  if (!isEmailVerified(refreshed) || !refreshed.signupCompleted) {
    const resumeStep = signupResumeStep(refreshed);
    if (resumeStep) {
      await setSignupSession(refreshed.id);
      let devOtp: string | undefined;
      if (resumeStep === 2 && refreshed.email) {
        const otp = await sendEmailOtp(refreshed.email, refreshed.id);
        devOtp = otp.ok ? otp.devOtp : undefined;
      }
      return {
        reason: "Complete your signup before signing in.",
        resumeStep,
        devOtp,
      };
    }
  }

  return { reason: null };
}
