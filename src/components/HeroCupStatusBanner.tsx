"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroCupPhase } from "@tournaments-leagues/domain/auction-hero-phase";

export type HeroCupStatusClient = {
  slug: string;
  name: string;
  phase: HeroCupPhase;
  countdownEndsAt: string | null;
};

function Countdown({ endsAt, prefix }: { endsAt: string; prefix?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("Soon");
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

  return (
    <span className="font-mono text-[inherit] opacity-90 whitespace-nowrap">
      {prefix ? `${prefix} ` : ""}({timeLeft})
    </span>
  );
}

const phaseStyles: Record<
  HeroCupPhase,
  { border: string; bg: string; text: string; pulse?: boolean }
> = {
  registration_open: {
    border: "border-[var(--color-brand)]/30",
    bg: "bg-[var(--color-brand)]/[0.08]",
    text: "text-[var(--color-brand)]",
    pulse: true,
  },
  auction_soon: {
    border: "border-[var(--color-magenta)]/30",
    bg: "bg-[var(--color-magenta)]/[0.08]",
    text: "text-[var(--color-magenta)]",
    pulse: true,
  },
  auction_live: {
    border: "border-[var(--color-magenta)]/30",
    bg: "bg-[var(--color-magenta)]/[0.08]",
    text: "text-[var(--color-magenta)]",
    pulse: true,
  },
  awaiting_tournament: {
    border: "border-cyan-400/30",
    bg: "bg-cyan-500/[0.08]",
    text: "text-cyan-200",
  },
  tournament_live: {
    border: "border-emerald-400/30",
    bg: "bg-emerald-500/[0.08]",
    text: "text-emerald-200",
    pulse: true,
  },
};

function phaseLabel(cup: HeroCupStatusClient): string {
  switch (cup.phase) {
    case "registration_open":
      return `Registration open: ${cup.name}`;
    case "auction_soon":
      return `Auction opens soon: ${cup.name}`;
    case "auction_live":
      return `Auction is live: ${cup.name}`;
    case "awaiting_tournament":
      return `Auction completed — ${cup.name}`;
    case "tournament_live":
      return `Tournament is live: ${cup.name}`;
  }
}

function countdownPrefix(cup: HeroCupStatusClient): string | undefined {
  switch (cup.phase) {
    case "registration_open":
      return "Closes in";
    case "auction_soon":
      return "Opens in";
    case "auction_live":
      return "Ends in";
    case "awaiting_tournament":
      return "Tournament starts in";
    case "tournament_live":
      return undefined;
  }
}

export default function HeroCupStatusBanner({
  cup,
  auctionHref,
}: {
  cup: HeroCupStatusClient;
  auctionHref?: string | null;
}) {
  const style = phaseStyles[cup.phase];
  const href = auctionHref ?? `/esports/tournaments/${cup.slug}`;

  return (
    <Link
      href={href}
      target={auctionHref ? "_blank" : undefined}
      rel={auctionHref ? "noopener noreferrer" : undefined}
      className={`group relative inline-flex max-w-full flex-row items-center gap-1.5 rounded-full border px-3 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] transition-all hover:scale-[1.02] sm:px-6 sm:py-2.5 sm:text-xs sm:gap-2.5 sm:tracking-[0.18em] ${style.border} ${style.bg} ${style.text} hover:brightness-110 shadow-[0_0_20px_-5px_rgba(124,58,237,0.15)]`}
    >
      <span className="inline-flex items-center gap-2">
        {style.pulse ? (
          <span className="relative flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          </span>
        ) : null}
        <span className="text-center sm:text-left">{phaseLabel(cup)}</span>
      </span>
      {cup.countdownEndsAt && cup.phase !== "tournament_live" ? (
        <Countdown endsAt={cup.countdownEndsAt} prefix={countdownPrefix(cup)} />
      ) : null}
    </Link>
  );
}
