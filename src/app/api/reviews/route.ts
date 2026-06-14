import { NextResponse } from "next/server";
import type { Review } from "@/lib/reviews";
import {
  mergeReviews,
  rankReviews,
  trimReviewText,
  type RankedReview,
} from "@/lib/review-utils";
import { supplementalReviews } from "@/lib/supplemental-reviews";

// One Google fetch per day — not per visitor.
export const revalidate = 86400;

const MIN_LEN = 12;
const MIN_RATING = 4;
const TARGET_REVIEWS = 10;

type PlacesReview = {
  rating?: number;
  publishTime?: string;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
};

type PlacesResponse = { reviews?: PlacesReview[] };

function pickText(review: PlacesReview): string {
  return (review.text?.text || review.originalText?.text || "").trim();
}

function toReview(review: PlacesReview): RankedReview | null {
  const text = pickText(review);
  if (text.length < MIN_LEN) return null;
  if ((review.rating ?? 0) < MIN_RATING) return null;

  const author = review.authorAttribution?.displayName?.split(" ")[0] ?? "Guest";

  return {
    id:
      review.publishTime ||
      `${author}-${text.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
    author,
    text: trimReviewText(text),
    rating: review.rating ?? 5,
    relativeTime: review.relativePublishTimeDescription,
    publishedAt: review.publishTime,
  };
}

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json(
      { reviews: [] as Review[], reason: "missing_env" },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "reviews",
        },
        next: { revalidate },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { reviews: [] as Review[], reason: `places_${res.status}` },
        { status: 200 },
      );
    }

    const data = (await res.json()) as PlacesResponse;
    const raw = data.reviews ?? [];

    const fromGoogle = rankReviews(
      raw.map(toReview).filter((r): r is RankedReview => r !== null),
    );

    const reviews = mergeReviews(fromGoogle, supplementalReviews, TARGET_REVIEWS);

    return NextResponse.json({
      reviews,
      meta: {
        fromGoogle: fromGoogle.length,
        googleCap: 5,
        total: reviews.length,
      },
    });
  } catch {
    return NextResponse.json(
      { reviews: [] as Review[], reason: "fetch_error" },
      { status: 200 },
    );
  }
}
