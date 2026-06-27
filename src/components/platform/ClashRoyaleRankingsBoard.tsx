"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClashRoyaleLeaderboardPreview } from "@core/contracts/clash-royale-leaderboard";
import { gameMetaFor } from "@/lib/tournament-display";
import BrandIcon from "@/components/ui/BrandIcon";

type Props = {
  currentData: ClashRoyaleLeaderboardPreview;
  peakData: ClashRoyaleLeaderboardPreview;
};

const PAGE_SIZE = 50;

function formatRefreshAgo(iso: string | null | undefined): string {
  if (!iso) return "--";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function ClashRoyaleRankingsBoard({ currentData, peakData }: Props) {
  const [boardMode, setBoardMode] = useState<"current" | "peak">("current");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());

  const data = boardMode === "peak" ? peakData : currentData;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.entries;
    return data.entries.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        e.playerTag?.toLowerCase().includes(q) ||
        e.playerName?.toLowerCase().includes(q),
    );
  }, [data.entries, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const meta = gameMetaFor("CLASH_ROYALE");
  const scoreLabel = boardMode === "peak" ? "Best Trophies" : "Trophies";
  const lastRefreshed = formatRefreshAgo(data.lastRefreshedAt);

  const msUntilNext = 5 * 60 * 1000 - (now % (5 * 60 * 1000));
  const m = Math.floor(msUntilNext / 60000);
  const s = Math.floor((msUntilNext / 1000) % 60);
  const countdown = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return (
    <div className="relative w-full mx-auto max-w-6xl pb-20">
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-black/40 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-[80px]" />
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 pointer-events-none text-blue-400 opacity-90">
          <BrandIcon path={meta.iconPath} title="Clash Royale" className="h-16 w-16 sm:h-24 sm:w-24" />
        </div>
        <div className="relative z-10">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-blue-400">Ladder Rankings</p>
          <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Clash Royale
          </h2>
          <p className="mt-4 max-w-2xl text-sm sm:text-base font-medium text-white/50 leading-relaxed">
            Link your player tag on your profile to appear on the NTG Clash Royale leaderboard. Stats refresh every 5 minutes.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["current", "peak"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setBoardMode(mode);
              setPage(1);
            }}
            className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              boardMode === mode
                ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {mode === "current" ? "Current Trophies" : "Peak Trophies"}
          </button>
        ))}
      </div>

      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-[400px]">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search player or tag…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-4 pl-5 pr-5 text-base text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none backdrop-blur-md"
          />
        </div>
        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex flex-wrap items-center gap-2">
          <span>{filtered.length} players</span>
          <span className="text-white/10 hidden sm:inline">|</span>
          <span className="text-white/50">Last refresh {lastRefreshed}</span>
          <span className="text-white/10 hidden sm:inline">|</span>
          <span className="text-white/60">Next refresh in {countdown}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="hidden sm:grid grid-cols-[80px_1fr_140px_100px_100px] gap-4 border-b border-white/5 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
          <div>Rank</div>
          <div>Player</div>
          <div>Tag</div>
          <div className="text-right">{scoreLabel}</div>
          <div className="text-right">W / L</div>
        </div>
        {pageEntries.length === 0 ? (
          <div className="px-6 py-20 text-center text-white/40">No players found.</div>
        ) : (
          <ul>
            {pageEntries.map((e) => {
              const score = boardMode === "peak" ? e.bestTrophies : e.trophies;
              return (
                <li
                  key={`${e.rank}-${e.playerTag ?? e.displayName}`}
                  className="grid grid-cols-1 sm:grid-cols-[80px_1fr_140px_100px_100px] gap-2 sm:gap-4 items-center border-b border-white/5 px-6 py-4 last:border-b-0 hover:bg-white/[0.02]"
                >
                  <div className="font-display text-2xl font-black text-white/70">#{e.rank}</div>
                  <div>
                    <p className="font-semibold text-white">{e.displayName}</p>
                    {e.playerName && e.playerName !== e.displayName ? (
                      <p className="text-xs text-white/40">{e.playerName}</p>
                    ) : null}
                  </div>
                  <div className="font-mono text-sm text-blue-300/80">{e.playerTag ?? "—"}</div>
                  <div className="font-display text-2xl font-black text-white sm:text-right">
                    {score?.toLocaleString() ?? "—"}
                  </div>
                  <div className="text-sm text-white/50 sm:text-right">
                    {e.wins} / {e.losses}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-6 flex items-center justify-between text-xs text-white/40">
          <span>
            Page {safePage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
