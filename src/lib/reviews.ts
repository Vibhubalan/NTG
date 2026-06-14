// Shared review types + text-highlight helper used by the API route
// and the ReviewCarousel component.

export type Review = {
  id: string;
  author: string;
  text: string;
  rating: number;
  relativeTime?: string;
  publishedAt?: string;
};

// Words we like to highlight inside review text. Order doesn't matter — the
// regex groups them and we cap the number of highlights per review so cards
// stay readable.
const HIGHLIGHT_WORDS = [
  "best",
  "amazing",
  "awesome",
  "incredible",
  "vibe",
  "vibes",
  "atmosphere",
  "gear",
  "setup",
  "stations",
  "experience",
  "tournaments",
  "tournament",
  "energy",
  "premium",
  "smooth",
  "lit",
  "fire",
  "perfect",
  "favourite",
  "favorite",
  "love",
  "loved",
];

const HIGHLIGHT_REGEX = new RegExp(
  `\\b(${HIGHLIGHT_WORDS.join("|")})\\b`,
  "gi",
);

export type HighlightSegment = { text: string; highlight: boolean };

// Splits a review into plain + highlighted segments, capping highlights at
// `maxHighlights` so we never over-decorate a single sentence.
export function splitReviewHighlights(
  text: string,
  maxHighlights = 2,
): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let count = 0;

  for (const match of text.matchAll(HIGHLIGHT_REGEX)) {
    if (match.index === undefined) continue;
    if (count >= maxHighlights) break;

    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        highlight: false,
      });
    }
    segments.push({ text: match[0], highlight: true });
    lastIndex = match.index + match[0].length;
    count += 1;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlight: false });
  }
  return segments;
}
