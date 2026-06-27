/**
 * Clash Royale sync worker — runs on Oracle Cloud VM with a static public IP.
 * Supercell API tokens are IP-whitelisted; Vercel/GHA cannot call the API directly.
 *
 * Env (see .env.example in this folder):
 *   CLASH_ROYALE_API_TOKEN, SITE_URL, CRON_SECRET, CLASH_ROYALE_SYNC_WORKER_SECRET, PORT
 */

import http from "node:http";

const API_TOKEN = process.env.CLASH_ROYALE_API_TOKEN?.trim();
const SITE_URL = process.env.SITE_URL?.replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET?.trim();
const WORKER_SECRET = process.env.CLASH_ROYALE_SYNC_WORKER_SECRET?.trim();
const PORT = Number(process.env.PORT ?? 8787);
const FETCH_DELAY_MS = Number(process.env.CLASH_ROYALE_FETCH_DELAY_MS ?? 200);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTag(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0289PYLQGRJCUV]{3,}$/.test(withHash)) return null;
  return withHash;
}

async function fetchPlayer(tag: string) {
  const encoded = tag.replace("#", "%23");
  const res = await fetch(`https://api.clashroyale.com/v1/players/${encoded}`, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supercell ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<{
    tag?: string;
    name?: string;
    trophies?: number;
    bestTrophies?: number;
    wins?: number;
    losses?: number;
  }>;
}

async function runSync() {
  if (!API_TOKEN || !SITE_URL || !CRON_SECRET) {
    throw new Error("Missing CLASH_ROYALE_API_TOKEN, SITE_URL, or CRON_SECRET");
  }

  const authHeader = `Bearer ${CRON_SECRET}`;
  const exportRes = await fetch(`${SITE_URL}/api/cron/clash-royale?mode=export`, {
    headers: { Authorization: authHeader },
  });
  if (!exportRes.ok) {
    throw new Error(`Export failed: ${exportRes.status} ${await exportRes.text()}`);
  }

  const { players } = (await exportRes.json()) as {
    players: Array<{ userId: string; tag: string }>;
  };

  const results: Array<{
    userId: string;
    tag: string;
    name: string;
    trophies: number;
    bestTrophies: number;
    wins: number;
    losses: number;
  }> = [];

  const failures: Array<{ userId: string; tag: string; error: string }> = [];

  for (const player of players) {
    const tag = normalizeTag(player.tag);
    if (!tag) {
      failures.push({ userId: player.userId, tag: player.tag, error: "Invalid tag" });
      continue;
    }
    try {
      const data = await fetchPlayer(tag);
      results.push({
        userId: player.userId,
        tag,
        name: data.name ?? tag,
        trophies: data.trophies ?? 0,
        bestTrophies: data.bestTrophies ?? data.trophies ?? 0,
        wins: data.wins ?? 0,
        losses: data.losses ?? 0,
      });
    } catch (err) {
      failures.push({
        userId: player.userId,
        tag,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(FETCH_DELAY_MS);
  }

  const importRes = await fetch(`${SITE_URL}/api/cron/clash-royale?mode=import`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ players: results }),
  });

  if (!importRes.ok) {
    throw new Error(`Import failed: ${importRes.status} ${await importRes.text()}`);
  }

  const importBody = (await importRes.json()) as { synced?: number; failed?: number };

  return {
    exported: players.length,
    fetched: results.length,
    fetchFailures: failures.length,
    imported: importBody.synced ?? 0,
    importFailed: importBody.failed ?? 0,
    failures: failures.slice(0, 10),
  };
}

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!WORKER_SECRET) return false;
  const auth = req.headers.authorization?.trim();
  return auth === `Bearer ${WORKER_SECRET}`;
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url === "/sync" && req.method === "POST") {
    if (!isAuthorized(req)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const started = Date.now();
    try {
      const summary = await runSync();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          durationMs: Date.now() - started,
          ...summary,
        }),
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - started,
        }),
      );
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Clash Royale sync worker listening on :${PORT}`);
});
