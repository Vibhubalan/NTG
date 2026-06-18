"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TournamentRegistrationBanner } from "@core/contracts";

type Props = {
  banners: TournamentRegistrationBanner[];
  intervalMs?: number;
};

export default function EsportsRegistrationSlides({ banners, intervalMs = 7000 }: Props) {
  const [index, setIndex] = useState(0);
  const count = banners.length;
  const hasMultiple = count > 1;

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => go(1), intervalMs);
    return () => clearInterval(timer);
  }, [count, go, intervalMs]);

  if (count === 0) return null;

  const safeIndex = Math.min(index, count - 1);

  return (
    <div className="group relative">
      <div className="relative min-h-[16rem] overflow-hidden rounded-[2rem] sm:min-h-[22rem]">
        {banners.map((banner, i) => (
          <Link
            key={banner.tournamentSlug}
            href={banner.href}
            prefetch
            aria-hidden={i !== safeIndex}
            className={`group/card absolute inset-0 flex min-h-[16rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-8 ring-1 ring-inset ring-white/[0.08] shadow-2xl transition-all duration-500 sm:min-h-[22rem] sm:p-12 ${
              i === safeIndex
                ? "pointer-events-auto z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            } hover:scale-[1.01] hover:ring-white/20 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] active:scale-[0.98]`}
          >
            {banner.hubBannerUrl || (banner.hubCarouselImages && banner.hubCarouselImages.length > 0) ? (
              <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-50 transition-transform duration-700 group-hover/card:scale-105"
                style={{ backgroundImage: `url('${banner.hubBannerUrl || banner.hubCarouselImages[0]}')` }}
              />
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black via-[#0A0A0A]/80 to-[#0A0A0A]/20"
              aria-hidden
            />
            <div className="pointer-events-none absolute z-0 -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--color-brand)]/20 blur-[100px] transition-all duration-500 group-hover/card:bg-[var(--color-brand)]/30" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-iris)]/10 blur-[100px]" />

            <div className="relative z-10 flex h-full w-full flex-col justify-between gap-8 sm:flex-row sm:items-end">
              <div className="max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                  Registration Open
                </div>
                <h2 className="font-display text-4xl font-black uppercase tracking-tight text-white drop-shadow-md sm:text-5xl">
                  {banner.title}
                </h2>
                <p className="mt-4 text-sm font-medium leading-relaxed text-white/60 sm:text-base">
                  {banner.detail}
                </p>
              </div>

              <div className="shrink-0">
                <span className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-8 text-[12px] font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all group-hover/card:bg-[var(--color-brand)] group-hover/card:text-black group-hover/card:shadow-[0_0_20px_rgba(34,211,238,0.4)] sm:w-auto">
                  Register Now
                  <svg
                    className="ml-2.5 h-4 w-4 transition-transform group-hover/card:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {hasMultiple ? (
        <>
          <button
            type="button"
            aria-label="Previous registration cup"
            onClick={() => go(-1)}
            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/90 opacity-0 ring-1 ring-white/10 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70 sm:left-6"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next registration cup"
            onClick={() => go(1)}
            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/90 opacity-0 ring-1 ring-white/10 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70 sm:right-6"
          >
            ›
          </button>

          <div className="mt-4 flex items-center justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.tournamentSlug}
                type="button"
                aria-label={`Show ${banner.title}`}
                aria-current={i === safeIndex ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex ? "w-6 bg-[var(--color-brand)]" : "w-2 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
            {safeIndex + 1} of {count} open registrations
          </p>
        </>
      ) : null}
    </div>
  );
}
