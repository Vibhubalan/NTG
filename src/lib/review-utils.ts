import type { Review } from "@/lib/reviews";

export type RankedReview = Review & { publishedAt?: string };

/** Newest + highest-rated first. */
export function rankReviews(reviews: RankedReview[]): RankedReview[] {
  return [...reviews].sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;

    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });
}

/** Google API reviews win over supplemental entries with the same id. */
export function mergeReviews(
  primary: RankedReview[],
  supplemental: RankedReview[],
  limit = 10,
): RankedReview[] {
  const seen = new Set<string>();
  const merged: RankedReview[] = [];

  for (const review of rankReviews([...primary, ...supplemental])) {
    if (seen.has(review.id)) continue;
    seen.add(review.id);
    merged.push(review);
    if (merged.length >= limit) break;
  }

  return merged;
}

/** Keep cards readable without dropping good reviews. */
export function trimReviewText(text: string, max = 320): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
