"use client";

import Link from "next/link";
import type { ListingPreview } from "@core/contracts/roster-listings";

type Props = {
  listings: ListingPreview[];
};

export default function HeroListingsSlide({ listings }: Props) {
  const preview = listings.slice(0, 4);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-8 pb-12 pt-32 sm:px-10 sm:pt-36">
      <div className="w-full max-w-2xl text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40">
          Open listings
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
          Jobs &amp; tryouts
        </h2>
      </div>

      <div className="mt-8 w-full max-w-xl space-y-2.5 sm:mt-10">
        {preview.map((l) => (
          <Link
            key={l.id}
            href={`/careers/${l.slug}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left transition-colors hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/85 transition-colors group-hover:text-white">
                {l.title}
              </p>
              {l.gameLabel ? (
                <p className="mt-0.5 text-[11px] text-white/35">{l.gameLabel}</p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/45">
              {l.type === "JOB" ? "Job" : "Tryout"}
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/careers"
        className="mt-8 text-[10px] font-medium uppercase tracking-[0.22em] text-white/35 transition-colors hover:text-white/70"
      >
        View all listings
        <span aria-hidden> →</span>
      </Link>
    </div>
  );
}
