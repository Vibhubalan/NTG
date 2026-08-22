"use client";

import { useEffect, useState } from "react";

type PrizeSplitRow = { place: number; label: string; amount: number };

type LivePrize = {
  mode: "MANUAL" | "DYNAMIC";
  prizePool: number | null;
  prizePerPlayer: number | null;
  registeredCount: number;
};

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function TournamentPrizePoolCard({
  slug,
  initial,
  prizeNotes,
  prizeSplit,
  splitColors,
  splitBadgeColors,
}: {
  slug: string;
  initial: LivePrize;
  prizeNotes: string | null;
  prizeSplit: PrizeSplitRow[];
  splitColors: string[];
  splitBadgeColors: string[];
}) {
  const [live, setLive] = useState<LivePrize>(initial);

  useEffect(() => {
    setLive(initial);
  }, [initial]);

  useEffect(() => {
    if (initial.mode !== "DYNAMIC") return;

    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/tournaments/${encodeURIComponent(slug)}/prize-pool`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as LivePrize;
        if (!cancelled) setLive(data);
      } catch {
        // Keep the last good value if the poll misses.
      }
    };

    void tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [slug, initial.mode]);

  const amount = live.prizePool;
  const showCard = amount != null || prizeNotes || live.mode === "DYNAMIC";
  if (!showCard) return null;

  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/80 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
      <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
        Prizepool
      </p>
      {amount != null ? (
        <p className="mt-1.5 break-words font-display text-2xl font-black tracking-tight text-white drop-shadow-md tabular-nums sm:text-3xl">
          {formatRupees(amount)}
        </p>
      ) : null}
      {live.mode === "DYNAMIC" ? (
        <p className="mt-1.5 text-[12px] font-medium text-white/45">
          {live.registeredCount} registered
          {live.prizePerPlayer && live.prizePerPlayer > 0
            ? ` · ${formatRupees(live.prizePerPlayer)} each`
            : ""}
        </p>
      ) : null}
      {prizeNotes ? (
        <p className="mt-2 text-[13px] leading-snug font-medium break-words text-white/50">
          {prizeNotes}
        </p>
      ) : null}

      {live.mode !== "DYNAMIC" && prizeSplit.length > 0 ? (
        <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
          <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
            Prize Split
          </p>
          <div className="space-y-2">
            {prizeSplit.map((row, i) => (
              <div
                key={row.place}
                className="flex min-w-0 items-center justify-between gap-3"
              >
                <span
                  className={`flex min-w-0 items-center gap-2 text-[13px] font-medium ${splitColors[i] ?? "text-white/70"}`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${splitBadgeColors[i] ?? "bg-white/10 text-white/70"}`}
                  >
                    {row.place}
                  </span>
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="shrink-0 font-display text-sm font-bold text-white/90">
                  {formatRupees(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
