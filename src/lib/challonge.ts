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
