"use client";

import Link from "next/link";
import HeroChampionsShowcase from "./HeroChampionsShowcase";
import type { HeroTournamentSlideData } from "./hero-carousel-types";

type Props = {
  data: HeroTournamentSlideData;
};

export default function HeroTournamentSlide({ data }: Props) {
  if (!data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-10 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          Tournaments
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Cups &amp; brackets
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
          Check the esports hub for upcoming cups and past champions.
        </p>
        <Link
          href="/esports/tournaments"
          className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-[var(--color-brand)]"
        >
          View tournaments
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  if (data.mode === "open") {
    const { banner } = data;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-10 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          Registration open
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl font-semibold uppercase tracking-[-0.02em] text-white sm:text-6xl">
          {banner.title}
        </h2>
        {banner.detail ? (
          <p className="mt-3 text-sm uppercase tracking-[0.22em] text-white/45 sm:text-base">
            {banner.detail}
          </p>
        ) : null}
        {banner.message ? (
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
            {banner.message}
          </p>
        ) : null}
        <Link
          href={banner.href}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-[var(--color-brand)]/45 hover:text-[var(--color-brand)]"
        >
          Register now
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return <HeroChampionsShowcase data={data} />;
}
