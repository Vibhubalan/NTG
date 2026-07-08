"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  auction: {
    slug: string;
    name: string;
    endsAt: string | null;
  };
};

function AuctionButtonCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    function update() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("Ended");
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
    <span className="font-mono text-xs opacity-90">
      ({timeLeft} left)
    </span>
  );
}

export default function AuctionLiveButton({ auction }: Props) {
  return (
    <Link
      href={`/esports/tournaments/${auction.slug}`}
      className="group relative inline-flex items-center gap-2.5 rounded-full border border-[var(--color-magenta)]/30 bg-[var(--color-magenta)]/[0.08] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-magenta)] transition-all hover:bg-[var(--color-magenta)]/20 hover:scale-[1.02] shadow-[0_0_20px_-5px_rgba(217,70,239,0.2)]"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      <span>Auction is Live: {auction.name}</span>
      {auction.endsAt ? <AuctionButtonCountdown endsAt={auction.endsAt} /> : null}
    </Link>
  );
}
