const CHALLONGE_HOST = "challonge.com";

export function challongeSlugFromUrl(url: string): string | null {
  try {
    const raw = url.trim();
    if (!raw) return null;
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!parsed.hostname.includes("challonge.")) return null;

    const hostParts = parsed.hostname.split(".");
    const sub = hostParts.length > 2 && hostParts[0] !== "www" ? hostParts[0] : null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const ignored = new Set([
      "tournaments",
      "module",
      "en",
      "es",
      "fr",
      "de",
      "communities",
      "events",
    ]);
    const filtered = segments.filter((s) => !ignored.has(s.toLowerCase()));

    if (filtered.length === 0) return null;

    const rawSlug = filtered[0];
    if (sub && !rawSlug.startsWith(`${sub}-`)) {
      return `${sub}-${rawSlug}`;
    }
    return rawSlug;
  } catch {
    return null;
  }
}

/** Normalize a Challonge page URL to the embeddable /module iframe src. */
export function challongeEmbedSrc(url: string): string | null {
  const slug = challongeSlugFromUrl(url);
  if (!slug) return null;
  return `https://${CHALLONGE_HOST}/${slug}/module`;
}

export function challongePageUrl(url: string): string | null {
  const slug = challongeSlugFromUrl(url);
  if (!slug) return null;
  return `https://${CHALLONGE_HOST}/${slug}`;
}

export type BracketUrlItem = {
  name?: string | null;
  url: string;
  isFinal?: boolean;
};

export function parseBracketUrlItem(raw: unknown): BracketUrlItem | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return null;
    if (str.includes("|")) {
      const parts = str.split("|");
      const name = parts[0].trim();
      const url = parts.slice(1).join("|").trim();
      return { name: name || null, url, isFinal: true };
    }
    return { name: null, url: str, isFinal: true };
  }
  if (typeof raw === "object" && raw !== null && ("url" in raw || "name" in raw || "label" in raw)) {
    const item = raw as { name?: string; label?: string; url?: string; isFinal?: boolean; useForWinners?: boolean };
    const isFinal = item.isFinal ?? item.useForWinners ?? true;
    return {
      name: (item.name || item.label || "").trim() || null,
      url: (item.url || "").trim(),
      isFinal,
    };
  }
  return null;
}

export function normalizeBracketUrlItems(input: {
  bracketUrl?: string | null;
  bracketUrls?: unknown;
}): BracketUrlItem[] {
  const items: BracketUrlItem[] = [];
  if (Array.isArray(input.bracketUrls)) {
    for (const raw of input.bracketUrls) {
      const parsed = parseBracketUrlItem(raw);
      if (parsed) items.push(parsed);
    }
  }
  if (items.length === 0 && input.bracketUrl) {
    const parsed = parseBracketUrlItem(input.bracketUrl);
    if (parsed) items.push(parsed);
  }

  const seen = new Set<string>();
  const out: BracketUrlItem[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  return out;
}

/** Dedupe + trim Challonge URLs from Json array and/or legacy single field. */
export function normalizeBracketUrls(input: {
  bracketUrl?: string | null;
  bracketUrls?: unknown;
}): string[] {
  return normalizeBracketUrlItems(input).map((item) =>
    item.name ? `${item.name} | ${item.url}` : item.url,
  );
}

/** Persist shape: primary bracketUrl + full list in bracketUrls. */
export function bracketUrlsForSave(urls: (string | BracketUrlItem)[]): {
  bracketUrl: string | null;
  bracketUrls: (string | BracketUrlItem)[] | null;
} {
  const items = normalizeBracketUrlItems({ bracketUrls: urls });
  if (items.length === 0) {
    return { bracketUrl: null, bracketUrls: null };
  }
  return {
    bracketUrl: items[0]?.url ?? null,
    bracketUrls: items.map((i) =>
      i.name || i.isFinal === false
        ? { name: i.name || undefined, url: i.url, isFinal: i.isFinal !== false }
        : i.url,
    ),
  };
}
