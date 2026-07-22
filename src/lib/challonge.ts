const CHALLONGE_HOST = "challonge.com";

/** Extract tournament slug from a Challonge page URL. */
export function challongeSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(CHALLONGE_HOST)) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const slug = segments[0];
    if (slug === "module") return null;

    return slug;
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

/** Dedupe + trim Challonge URLs from Json array and/or legacy single field. */
export function normalizeBracketUrls(input: {
  bracketUrl?: string | null;
  bracketUrls?: unknown;
}): string[] {
  const fromArray = Array.isArray(input.bracketUrls)
    ? input.bracketUrls.filter(
        (u): u is string => typeof u === "string" && u.trim().length > 0,
      )
    : [];
  const combined = [
    ...fromArray,
    ...(input.bracketUrl?.trim() ? [input.bracketUrl.trim()] : []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of combined) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Persist shape: primary bracketUrl + full list in bracketUrls. */
export function bracketUrlsForSave(urls: string[]): {
  bracketUrl: string | null;
  bracketUrls: string[] | null;
} {
  const cleaned = normalizeBracketUrls({ bracketUrls: urls });
  if (cleaned.length === 0) {
    return { bracketUrl: null, bracketUrls: null };
  }
  return {
    bracketUrl: cleaned[0] ?? null,
    bracketUrls: cleaned,
  };
}
