"use client";

import Link from "next/link";
import HeroChampionsShowcase from "./HeroChampionsShowcase";
import HeroCountdown from "./HeroCountdown";
import type { HeroCupStatusClient, HeroTournamentSlideData } from "./hero-carousel-types";
import { prefetchTournamentCupApis } from "@/lib/prefetch-tournament-cup";

type Props = {
  data: HeroTournamentSlideData;
};

function statusCopy(cup: HeroCupStatusClient): {
  eyebrow: string;
  countdownLabel: string | null;
  cta: string;
} {
  switch (cup.phase) {
    case "registration_open":
      return { eyebrow: "Registration open", countdownLabel: "Closes in", cta: "Register now" };
    case "auction_soon":
      return { eyebrow: "Auction starts soon", countdownLabel: "Starts in", cta: "View cup" };
    case "auction_live":
      return { eyebrow: "Auction live", countdownLabel: "Ends in", cta: "Join auction" };
    case "awaiting_tournament":
      return { eyebrow: "Starts soon", countdownLabel: "Cup starts in", cta: "View cup" };
    case "tournament_live":
      return { eyebrow: "Live now", countdownLabel: null, cta: "View cup" };
  }
}

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

  if (data.mode === "status") {
    const { cup, auctionHref } = data;
    const copy = statusCopy(cup);
    const href = auctionHref ?? `/esports/tournaments/${cup.slug}`;
    const showTimer = Boolean(cup.countdownEndsAt && copy.countdownLabel);
    const cta =
      cup.phase === "auction_live" ? (auctionHref ? "Join auction" : "View cup") : copy.cta;

    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-10 text-center">
        <p className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
          </span>
          {copy.eyebrow}
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold uppercase tracking-[-0.02em] text-white sm:text-6xl">
          {cup.name}
        </h2>
        {showTimer && cup.countdownEndsAt ? (
          <HeroCountdown endsAt={cup.countdownEndsAt} label={copy.countdownLabel ?? undefined} />
        ) : null}
        <Link
          href={href}
          target={auctionHref ? "_blank" : undefined}
          rel={auctionHref ? "noopener noreferrer" : undefined}
          onMouseEnter={() => {
            if (!auctionHref) prefetchTournamentCupApis(cup.slug);
          }}
          onFocus={() => {
            if (!auctionHref) prefetchTournamentCupApis(cup.slug);
          }}
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-[var(--color-brand)]/45 hover:text-[var(--color-brand)]"
        >
          {cta}
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  if (data.mode === "open") {
    const { banner } = data;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-10 text-center">
        <p className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
          </span>
          Registration open
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold uppercase tracking-[-0.02em] text-white sm:text-6xl">
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
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-[var(--color-brand)]/45 hover:text-[var(--color-brand)]"
        >
          Register now
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return <HeroChampionsShowcase data={data} />;
}
