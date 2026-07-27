"use client";

import { useEffect, useState } from "react";

export function AuctionTimer({ timerEndsAt }: { timerEndsAt: string | null }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!timerEndsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const ms = new Date(timerEndsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  if (!timerEndsAt) return null;

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-6 py-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/70">Timer</p>
      <p className="mt-1 font-display text-4xl font-bold tabular-nums text-white">{remaining}s</p>
    </div>
  );
}
