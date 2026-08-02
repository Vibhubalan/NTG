"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroCupPhase } from "@tournaments-leagues/domain/auction-hero-phase";
import { prefetchTournamentCupApis } from "@/lib/prefetch-tournament-cup";

export type HeroCupStatusClient = {
  slug: string;
  name: string;
  phase: HeroCupPhase;
  countdownEndsAt: string | null;
};

function Countdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setTimeLeft(parts.join(" "));
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!timeLeft) return null;
  return <span className="font-mono text-[10px] text-white/55 sm:text-[11px]">{timeLeft}</span>;
}

function labelFor(cup: HeroCupStatusClient): string {
  switch (cup.phase) {
    case "registration_open":
      return `Click here to register for ${cup.name}`;
    case "auction_soon":
      return `Click here to see when the ${cup.name} auction starts`;
    case "auction_live":
      return `Click here to join the ${cup.name} auction`;
    case "awaiting_tournament":
      return `Click here to see when ${cup.name} starts`;
    case "tournament_live":
      return `Click here to check the status of ${cup.name}`;
  }
}

function showCountdown(phase: HeroCupPhase) {
  return phase !== "tournament_live";
}

export default function HeroCupStatusBanner({
  cup,
  auctionHref,
}: {
  cup: HeroCupStatusClient;
  auctionHref?: string | null;
}) {
  const href = auctionHref ?? `/esports/tournaments/${cup.slug}`;
  const label = labelFor(cup);

  return (
    <Link
      href={href}
      target={auctionHref ? "_blank" : undefined}
      rel={auctionHref ? "noopener noreferrer" : undefined}
      aria-label={label}
      onMouseEnter={() => {
        if (!auctionHref) prefetchTournamentCupApis(cup.slug);
      }}
      onFocus={() => {
        if (!auctionHref) prefetchTournamentCupApis(cup.slug);
      }}
      className="glass group inline-flex max-w-[min(100%,22rem)] cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[11px] font-medium text-white/80 transition-colors hover:border-[var(--color-brand)]/30 hover:text-white sm:max-w-none sm:gap-2.5 sm:px-5 sm:py-2.5 sm:text-[13px]"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
      </span>
      <span className="min-w-0 truncate text-left leading-snug">
        {label}
      </span>
      {cup.countdownEndsAt && showCountdown(cup.phase) ? (
        <Countdown endsAt={cup.countdownEndsAt} />
      ) : null}
      <span
        aria-hidden
        className="shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)]"
      >
        →
      </span>
    </Link>
  );
}
