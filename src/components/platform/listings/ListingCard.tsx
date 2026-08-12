"use client";

import Link from "next/link";
import type { ListingPreview } from "@core/contracts/roster-listings";
import BrandIcon from "@/components/ui/BrandIcon";
import { LISTING_BRAND_ACCENT, rosterGameVisual, withHexAlpha } from "@/lib/roster-games";

type Props = {
  listing: ListingPreview;
};

export default function ListingCard({ listing }: Props) {
  const typeLabel = listing.type === "JOB" ? "Job" : "Tryout";
  const visual = rosterGameVisual(listing.gameKey, listing.gameLabel);
  const accent = visual?.hex ?? LISTING_BRAND_ACCENT;

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group flex min-h-[200px] w-full flex-col rounded-2xl border bg-[#0b0f16]/80 p-5 transition-[border-color,background-color] duration-300 hover:bg-[#0e141f] sm:min-h-[210px] sm:p-6"
      style={{ borderColor: withHexAlpha(accent, 0.6) }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {visual ? (
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: accent, background: withHexAlpha(accent, 0.08) }}
            >
              <BrandIcon path={visual.iconPath} title={visual.label} className="h-4 w-4" />
            </span>
          ) : (
            <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-white/35">
              NTG
            </span>
          )}
          {visual ? (
            <span className="text-[11px] font-medium tracking-[0.08em] text-white/40 uppercase">
              {visual.label}
            </span>
          ) : null}
        </div>

        <span className="text-[10px] font-medium tracking-[0.16em] text-white/35 uppercase">
          {typeLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="font-display text-[1.05rem] font-medium leading-snug tracking-[-0.01em] text-white/95 line-clamp-2 transition-colors duration-300 group-hover:text-white sm:text-[1.15rem]">
          {listing.title}
        </h3>
        <p className="mt-3 text-[13px] leading-relaxed text-white/40 transition-colors duration-300 group-hover:text-white/55">
          Learn more about this opportunity
        </p>
      </div>

      <span
        className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] uppercase transition-colors duration-300"
        style={{ color: withHexAlpha(accent, 0.95) }}
      >
        Open
        <svg
          className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
