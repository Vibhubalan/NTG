import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@core/config/env.server";

const COOKIE_NAME = "ntg_signup_session";
const MAX_AGE_SEC = 60 * 30; // 30 min

function getSecret(): string {
  const secret = serverEnv.authSecret;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }
  return secret ?? "dev-signup-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export async function setSignupSession(pendingSignupId: string): Promise<void> {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = `${pendingSignupId}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

/** Pending signup id stored in the signup cookie (no User row until OTP verified). */
export async function getSignupPendingId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [pendingSignupId, expStr, sig] = parts;
  const payload = `${pendingSignupId}.${expStr}`;
  const expected = sign(payload);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const exp = Number(expStr);
  if (!pendingSignupId || !exp || Date.now() > exp) return null;

  return pendingSignupId;
}

/** @deprecated Use getSignupPendingId — kept for legacy signup-step handlers. */
export async function getSignupUserId(): Promise<string | null> {
  return getSignupPendingId();
}

export async function clearSignupSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
