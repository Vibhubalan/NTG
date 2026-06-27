/** Supercell Clash Royale API helpers (used by Oracle sync worker, not Vercel). */

const TAG_PATTERN = /^#[0289PYLQGRJCUV]{3,}$/;

export type ClashRoyalePlayer = {
  tag: string;
  name: string;
  trophies: number;
  bestTrophies: number;
  wins: number;
  losses: number;
  expLevel: number;
};

export function normalizeClashRoyaleTag(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!TAG_PATTERN.test(withHash)) return null;
  return withHash;
}

export function encodeClashRoyaleTagForApi(tag: string): string {
  return tag.replace("#", "%23");
}

export async function fetchClashRoyalePlayer(
  tag: string,
  apiToken: string,
): Promise<{ ok: true; player: ClashRoyalePlayer } | { ok: false; error: string; status?: number }> {
  const normalized = normalizeClashRoyaleTag(tag);
  if (!normalized) {
    return { ok: false, error: "Invalid player tag format." };
  }

  const encoded = encodeClashRoyaleTagForApi(normalized);
  const res = await fetch(`https://api.clashroyale.com/v1/players/${encoded}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Supercell API error (${res.status}).`;
    try {
      const body = (await res.json()) as { reason?: string; message?: string };
      message = body.reason ?? body.message ?? message;
    } catch {
      // ignore
    }
    return { ok: false, error: message, status: res.status };
  }

  const data = (await res.json()) as {
    tag?: string;
    name?: string;
    trophies?: number;
    bestTrophies?: number;
    wins?: number;
    losses?: number;
    expLevel?: number;
  };

  return {
    ok: true,
    player: {
      tag: data.tag ?? normalized,
      name: data.name ?? normalized,
      trophies: data.trophies ?? 0,
      bestTrophies: data.bestTrophies ?? data.trophies ?? 0,
      wins: data.wins ?? 0,
      losses: data.losses ?? 0,
      expLevel: data.expLevel ?? 0,
    },
  };
}
