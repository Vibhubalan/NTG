import { serverEnv } from "@core/config/env.server";

/** Henrik free tier ≈ 30 req/min — stay safely under with ~2.1s between calls. */
const MIN_GAP_MS = 2_100;
const MAX_RETRIES = 4;

let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

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

export function henrikHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = serverEnv.henrikdevApiKey;
  if (apiKey) headers.Authorization = apiKey;
  return headers;
}

/**
 * Serialized Henrik API fetch: spaces requests globally within this instance,
 * retries on 429 with Retry-After backoff.
 */
export function henrikFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const run = async (): Promise<Response> => {
    const gap = MIN_GAP_MS - (Date.now() - lastRequestAt);
    if (gap > 0) await sleep(gap);

    let lastRes: Response | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      lastRequestAt = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      let res: Response;
      try {
        res = await fetch(url, { ...init, signal: controller.signal });
      } catch (err) {
        // If it aborted or failed, retry after a short delay
        await sleep(2000);
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.status !== 429) return res;

      const waitMs = parseRetryAfterMs(res) + 500;
      await sleep(waitMs);
      lastRes = res;
    }

    if (lastRes) return lastRes;
    
    // Final fallback attempt with timeout
    const fallbackController = new AbortController();
    const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 8000);
    try {
      return await fetch(url, { ...init, signal: fallbackController.signal });
    } finally {
      clearTimeout(fallbackTimeoutId);
    }
  };

  const result = chain.then(run);
  chain = result.catch(() => {});
  return result;
}
