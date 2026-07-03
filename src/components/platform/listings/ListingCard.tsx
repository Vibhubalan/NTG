"use client";

import Link from "next/link";
import type { ListingPreview } from "@core/contracts/roster-listings";
import BrandIcon from "@/components/ui/BrandIcon";
import { LISTING_BRAND_ACCENT, listingSummary, rosterGameVisual, withHexAlpha } from "@/lib/roster-games";

type Props = {
  listing: ListingPreview;
};

export default function ListingCard({ listing }: Props) {
  const typeLabel = listing.type === "JOB" ? "Job" : "Team tryout";
  const visual = rosterGameVisual(listing.gameKey, listing.gameLabel);
  const summary = listingSummary(listing.description);
  const accent = visual?.hex ?? LISTING_BRAND_ACCENT;

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group relative flex aspect-[4/3] w-full flex-col overflow-hidden rounded-2xl border bg-[#080f1c]/80 p-4 transition-all duration-300 hover:-translate-y-0.5 sm:aspect-square sm:p-5 isolate [transform:translateZ(0)]"
      style={{
        borderColor: withHexAlpha(accent, 0.26),
        boxShadow: `0 12px 40px -24px ${withHexAlpha(accent, 0.28)}`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div
          aria-hidden
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 transition-opacity group-hover:opacity-50 sm:-right-10 sm:-top-10 sm:h-32 sm:w-32 sm:opacity-35 sm:group-hover:opacity-55"
          style={{
            background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          background: `radial-gradient(ellipse at top left, ${withHexAlpha(accent, 0.5)}, transparent 65%)`,
        }}
      />

      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between gap-2">
          {visual ? (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md sm:h-12 sm:w-12"
              style={{
                background: `linear-gradient(135deg, ${withHexAlpha(accent, 0.22)}, ${withHexAlpha(accent, 0.06)})`,
                border: `1px solid ${withHexAlpha(accent, 0.38)}`,
                color: accent,
              }}
            >
              <BrandIcon path={visual.iconPath} title={visual.label} className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-12 sm:w-12"
              style={{
                background: withHexAlpha(accent, 0.1),
                border: `1px solid ${withHexAlpha(accent, 0.28)}`,
                color: accent,
              }}
            >
              NTG
            </div>
          )}

          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] sm:px-2.5 sm:py-1 sm:text-[10px]"
            style={{
              background: withHexAlpha(accent, 0.14),
              color: accent,
              border: `1px solid ${withHexAlpha(accent, 0.28)}`,
            }}
          >
            {typeLabel}
          </span>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
          {visual ? (
            <p
              className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]"
              style={{ color: withHexAlpha(accent, 0.8) }}
            >
              {visual.label}
            </p>
          ) : null}
          <h3 className="shrink-0 font-display text-sm font-semibold leading-snug text-white line-clamp-2 sm:text-base">
            {listing.title}
          </h3>
          {summary ? (
            <p className="min-h-0 flex-1 text-xs leading-relaxed text-white/45 line-clamp-3 sm:text-sm sm:line-clamp-4">
              {summary}
            </p>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        <p
          className="mt-2 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:mt-3 sm:text-xs"
          style={{ color: accent }}
        >
          View details
          <svg
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </p>
      </div>
    </Link>
  );
}
