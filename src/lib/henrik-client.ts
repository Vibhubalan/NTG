import { serverEnv } from "@core/config/env.server";

/** Henrik free tier ≈ 30 req/min — stay under 26/min globally. */
export const HENRIK_MAX_REQUESTS_PER_MINUTE = 26;
const WINDOW_MS = 60_000;
const MIN_GAP_MS = Math.ceil(WINDOW_MS / HENRIK_MAX_REQUESTS_PER_MINUTE);
export const HENRIK_MIN_GAP_MS = MIN_GAP_MS;
const MAX_RETRIES = 4;

let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
let runRequestCount = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(res: Response): number {
  const header = res.headers.get("retry-after");
  if (!header) return 5_000;
  const seconds = Number.parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds * 1_000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return 5_000;
}

function currentWindowKey(): string {
  const bucket = Math.floor(Date.now() / WINDOW_MS);
  return `henrik:rl:${bucket}`;
}

async function waitForUpstashSlot(): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  const windowSec = Math.ceil(WINDOW_MS / 1000);

  for (let attempt = 0; attempt < 120; attempt++) {
    const key = currentWindowKey();
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSec, "NX"],
        ]),
      });
      if (!res.ok) return false;

      const data = (await res.json()) as { result: unknown[] };
      const count = Number(data.result?.[0] ?? 0);
      if (count <= HENRIK_MAX_REQUESTS_PER_MINUTE) return true;

      const msIntoWindow = Date.now() % WINDOW_MS;
      const waitMs = Math.max(250, WINDOW_MS - msIntoWindow + 50);
      await sleep(waitMs);
    } catch {
      return false;
    }
  }

  return false;
}

async function waitForHenrikSlot(): Promise<void> {
  const usedUpstash = await waitForUpstashSlot();
  if (!usedUpstash) {
    const gap = MIN_GAP_MS - (Date.now() - lastRequestAt);
    if (gap > 0) await sleep(gap);
  }
}

export function resetHenrikRequestCount(): void {
  runRequestCount = 0;
}

export function getHenrikRequestCount(): number {
  return runRequestCount;
}

export function henrikHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = serverEnv.henrikdevApiKey;
  if (apiKey) headers.Authorization = apiKey;
  return headers;
}

/**
 * Serialized Henrik API fetch with global 26/min rate limit (Upstash or per-instance gap).
 * Retries on 429 with Retry-After backoff.
 */
export function henrikFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const run = async (): Promise<Response> => {
    await waitForHenrikSlot();

    let lastRes: Response | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      lastRequestAt = Date.now();
      runRequestCount += 1;
      const res = await fetch(url, init);

      if (res.status !== 429) return res;

      const waitMs = parseRetryAfterMs(res) + 500;
      await sleep(waitMs);
      lastRes = res;
    }

    return lastRes ?? fetch(url, init);
  };

  const result = chain.then(run);
  chain = result.catch(() => {});
  return result;
}
