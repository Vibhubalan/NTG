import { NextResponse } from "next/server";

type RateLimitConfig = {
  /** Unique bucket id, e.g. `auth:login` */
  prefix: string;
  /** Max requests per window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
};

type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = memoryStore.get(key);

  if (!bucket || now >= bucket.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

async function upstashRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
        ["TTL", key],
      ]),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { result: unknown[] };
    const count = Number(data.result?.[0] ?? 0);
    const ttl = Number(data.result?.[2] ?? windowSec);

    if (count > limit) {
      return { ok: false, retryAfterSec: Math.max(1, ttl) };
    }

    return { ok: true, remaining: Math.max(0, limit - count) };
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const windowSec = Math.ceil(config.windowMs / 1000);
  const key = `rl:${config.prefix}:${identifier}`;

  const upstash = await upstashRateLimit(key, config.limit, windowSec);
  if (upstash) return upstash;

  return memoryRateLimit(key, config.limit, config.windowMs);
}

export const AUTH_RATE_LIMITS = {
  login: { prefix: "auth:login", limit: 10, windowMs: 60 * 1000 },
  loginEmail: { prefix: "auth:login-email", limit: 8, windowMs: 15 * 60 * 1000 },
  register: { prefix: "auth:register", limit: 5, windowMs: 60 * 60 * 1000 },
  otpSend: { prefix: "auth:otp-send", limit: 3, windowMs: 10 * 60 * 1000 },
  otpVerify: { prefix: "auth:otp-verify", limit: 15, windowMs: 10 * 60 * 1000 },
  riotLink: { prefix: "auth:riot-link", limit: 10, windowMs: 15 * 60 * 1000 },
  steamLink: { prefix: "auth:steam-link", limit: 10, windowMs: 15 * 60 * 1000 },
  tournamentRegister: { prefix: "app:tournament-register", limit: 10, windowMs: 15 * 60 * 1000 },
  listingApply: { prefix: "app:listing-apply", limit: 10, windowMs: 15 * 60 * 1000 },
  teamLogoUpload: { prefix: "app:team-logo-upload", limit: 10, windowMs: 60 * 60 * 1000 },
  profilePatch: { prefix: "app:profile-patch", limit: 30, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

/** IP-based rate limit for route handlers. Returns 429 response or null if allowed. */
export async function enforceRateLimit(
  req: Request,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const result = await checkRateLimit(ip, config);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}

/** Identifier-based rate limit (e.g. normalized email). */
export async function enforceRateLimitFor(
  identifier: string,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(identifier.toLowerCase().trim(), config);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}
