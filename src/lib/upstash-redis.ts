/**
 * Minimal Upstash Redis REST client (JSON get/set/del) shared across cache use cases.
 * Uses the same UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars already
 * relied on by rate-limit.ts, henrik-client.ts, and login-lockout.ts.
 *
 * No-op (returns null / false) when Upstash isn't configured, so callers can
 * always fall back to an in-memory/local cache without branching on env presence.
 */

function credentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function isUpstashConfigured(): boolean {
  return credentials() !== null;
}

/** Get and JSON.parse a value stored via setJson. Returns null on miss/misconfig/error. */
export async function getJson<T>(key: string): Promise<T | null> {
  const creds = credentials();
  if (!creds) return null;

  try {
    const res = await fetch(`${creds.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as T;
  } catch {
    return null;
  }
}

/** JSON.stringify and store a value with a TTL (seconds). Returns true on success. */
export async function setJson<T>(
  key: string,
  value: T,
  ttlSec: number,
): Promise<boolean> {
  const creds = credentials();
  if (!creds) return false;

  try {
    const res = await fetch(
      `${creds.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?EX=${ttlSec}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${creds.token}` },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Delete a key. Best-effort; never throws. */
export async function del(key: string): Promise<void> {
  const creds = credentials();
  if (!creds) return;

  try {
    await fetch(`${creds.url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.token}` },
    });
  } catch {
    // best-effort
  }
}
