import { Resend } from "resend";

import { serverEnv } from "@core/config/env.server";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const PROGRESSIVE_DELAYS_MS = [0, 500, 1000, 2000, 4000] as const;

type FailBucket = { count: number; lockedUntil: number };

const memoryStore = new Map<string, FailBucket>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function failKey(email: string): string {
  return `lockout:fail:${normalizeEmail(email)}`;
}

async function upstashGet(key: string): Promise<FailBucket | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as FailBucket;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, bucket: FailBucket, ttlSec: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(bucket))}?EX=${ttlSec}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function upstashDelete(key: string): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  try {
    await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}

async function getFailBucket(email: string): Promise<FailBucket> {
  const key = failKey(email);
  const remote = await upstashGet(key);
  if (remote) return remote;

  const local = memoryStore.get(key);
  if (!local) return { count: 0, lockedUntil: 0 };

  if (local.lockedUntil > 0 && Date.now() >= local.lockedUntil) {
    memoryStore.delete(key);
    return { count: 0, lockedUntil: 0 };
  }

  return local;
}

async function setFailBucket(email: string, bucket: FailBucket): Promise<void> {
  const key = failKey(email);
  const ttlSec = Math.ceil(LOCKOUT_MS / 1000) + 60;
  const stored = await upstashSet(key, bucket, ttlSec);
  if (!stored) memoryStore.set(key, bucket);
}

async function clearFailBucket(email: string): Promise<void> {
  const key = failKey(email);
  memoryStore.delete(key);
  await upstashDelete(key);
}

export async function isLoginLocked(email: string): Promise<boolean> {
  const bucket = await getFailBucket(email);
  if (bucket.lockedUntil <= 0) return false;
  if (Date.now() < bucket.lockedUntil) return true;
  await clearFailBucket(email);
  return false;
}

export async function getProgressiveDelayMs(email: string): Promise<number> {
  const bucket = await getFailBucket(email);
  const index = Math.min(bucket.count, PROGRESSIVE_DELAYS_MS.length - 1);
  return PROGRESSIVE_DELAYS_MS[index] ?? 0;
}

export async function clearLoginFailures(email: string): Promise<void> {
  await clearFailBucket(email);
}

async function sendLockoutEmail(email: string): Promise<void> {
  const apiKey = serverEnv.resendApiKey;
  const from = serverEnv.emailFrom;
  if (!apiKey || !from) {
    console.warn(`[login-lockout] Email not configured; skipped lockout notice for ${email}`);
    return;
  }

  const baseUrl = serverEnv.authUrl ?? "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/login`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "NTG Lounge: suspicious sign-in activity",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Sign-in attempts paused</h2>
        <p style="color:#444;line-height:1.5">
          We noticed several failed sign-in attempts on your account. For your security,
          sign-in has been temporarily paused.
        </p>
        <p style="color:#444;line-height:1.5">
          If this was you, wait a few minutes and try again, or
          <a href="${resetUrl}">reset your password</a>.
        </p>
        <p style="color:#888;font-size:13px">If you didn't try to sign in, consider resetting your password.</p>
      </div>
    `,
  });

  if (error) {
    console.error(`[login-lockout] Failed to send lockout email to ${email}: ${error.message}`);
  } else {
    console.info(`[login-lockout] Lockout notice sent to ${email}`);
  }
}

/**
 * Record a failed login. Locks after MAX_FAILED_ATTEMPTS consecutive failures.
 * Sends lockout email only when the account exists.
 */
export async function recordLoginFailure(
  email: string,
  options?: { userExists?: boolean },
): Promise<void> {
  const bucket = await getFailBucket(email);
  const now = Date.now();

  if (bucket.lockedUntil > now) return;

  const nextCount = bucket.count + 1;

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS;
    await setFailBucket(email, { count: nextCount, lockedUntil });
    console.warn(
      `[login-lockout] account locked email=${normalizeEmail(email)} until=${new Date(lockedUntil).toISOString()}`,
    );
    if (options?.userExists) {
      await sendLockoutEmail(email);
    }
    return;
  }

  await setFailBucket(email, { count: nextCount, lockedUntil: 0 });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
