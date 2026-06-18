"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LeaderboardPreview, LeaderboardPreviewEntry } from "@core/contracts";
import {
  formatRankLabel,
  rankAccentClass,
  rankIconUrl,
} from "@/lib/valorant-rank";

const PAGE_SIZE = 10;

function sortByMmr(entries: LeaderboardPreviewEntry[]): LeaderboardPreviewEntry[] {
  return [...entries]
    .sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

function rowAccentBg(tierId: number | null | undefined): string {
  if (tierId == null) return "from-white/[0.06]";
  if (tierId >= 24) return "from-rose-500/[0.12]";
  if (tierId >= 21) return "from-emerald-500/[0.10]";
  if (tierId >= 18) return "from-violet-500/[0.10]";
  if (tierId >= 15) return "from-cyan-500/[0.08]";
  if (tierId >= 12) return "from-amber-500/[0.08]";
  return "from-white/[0.06]";
}

function PaginationBtn({
  onClick,
  disabled,
  children,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-xs text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

type Props = { data: LeaderboardPreview };

export default function ValorantRankingsBoard({ data }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => sortByMmr(data.entries), [data.entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        (e.riotId?.toLowerCase().includes(q) ?? false),
    );
  }, [sorted, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goToPage = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      {/* Hero */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-[#FF4655]/15 bg-gradient-to-br from-[#1a0a0c] via-[#0d0d0d] to-[#0a0a12] px-8 py-12 sm:px-12 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-[#FF4655]/10 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[var(--color-brand)]/5 blur-[60px]"
        />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.35em] text-[#FF4655]/80">
          Competitive ranked
        </p>
        <h2 className="relative mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          Who runs Mangaluru?
        </h2>
        <p className="relative mt-4 max-w-xl text-base leading-relaxed text-white/45">
          NTG players with linked Riot IDs, sorted by current RR. Link yours at
          signup to join the board.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player or Riot ID…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-4 pl-12 pr-5 text-sm text-white placeholder:text-white/30 shadow-lg shadow-black/20 backdrop-blur-xl focus:border-[#FF4655]/40 focus:outline-none"
          />
        </div>
        <p className="mt-2.5 text-[11px] uppercase tracking-[0.14em] text-white/30">
          {filtered.length} player{filtered.length === 1 ? "" : "s"}
          {query.trim() ? ` matching "${query.trim()}"` : " on the board"}
        </p>
      </div>

      {/* Column headers */}
      <div
        className="mb-3 hidden items-center px-6 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35 sm:grid"
        style={{ gridTemplateColumns: "4.5rem 4rem 11rem 1fr 7rem" }}
      >
        <div className="text-center">Rank</div>
        <div />
        <div>Tier</div>
        <div>Player</div>
        <div className="text-right">RR</div>
      </div>

      {/* Glass rows */}
      {pageEntries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-20 text-center backdrop-blur-xl">
          <p className="font-display text-xl text-white/50">No players found</p>
          <p className="mt-2 text-sm text-white/30">Try a different name or Riot tag.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {pageEntries.map((e) => {
            const icon = rankIconUrl(e.rankTierId);
            const accent = rankAccentClass(e.rankTierId);
            const label = formatRankLabel(e.rankTierId, e.rankTier);
            const accentBg = rowAccentBg(e.rankTierId);
            const isTop3 = e.rank <= 3;

            return (
              <li
                key={`${e.rank}-${e.riotId ?? e.displayName}`}
                className={`group relative grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4 rounded-2xl border border-white/10 bg-gradient-to-r ${accentBg} to-white/[0.04] px-5 py-5 shadow-lg shadow-black/25 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08] sm:grid-cols-[4.5rem_4rem_11rem_1fr_7rem] sm:gap-x-0 sm:px-6 sm:py-6`}
              >
                {isTop3 && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-[#FF4655] to-rose-900/80" />
                )}

                <div
                  className={`text-center font-display font-black tracking-tight ${
                    isTop3
                      ? "text-3xl text-[#FF4655] drop-shadow-[0_0_12px_rgba(255,70,85,0.4)] sm:text-4xl"
                      : "text-2xl text-white/55 sm:text-3xl"
                  }`}
                >
                  {e.rank}
                  {e.rank === 1 && (
                    <span className="ml-0.5 align-top text-base">★</span>
                  )}
                </div>

                <div className="hidden sm:block">
                  {icon ? (
                    <Image
                      src={icon}
                      alt={label}
                      width={48}
                      height={48}
                      className="h-11 w-11 object-contain sm:h-12 sm:w-12"
                      unoptimized
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-white/10 ring-1 ring-white/10 sm:h-12 sm:w-12" />
                  )}
                </div>

                <div className="hidden sm:block">
                  <span className={`text-base font-semibold ${accent}`}>
                    {label}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-3 sm:block">
                    {icon && (
                      <Image
                        src={icon}
                        alt={label}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 object-contain sm:hidden"
                        unoptimized
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-bold text-white sm:text-xl">
                        {e.displayName}
                      </p>
                      {e.riotId && (
                        <p className="truncate text-sm text-white/40">
                          {e.riotId}
                        </p>
                      )}
                      <span
                        className={`mt-0.5 block text-sm font-medium sm:hidden ${accent}`}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-display font-black tracking-tight ${
                      isTop3
                        ? "text-2xl text-white sm:text-3xl"
                        : "text-xl text-white/90 sm:text-2xl"
                    }`}
                  >
                    {e.mmr?.toLocaleString() ?? "—"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF4655]/60">
                    RR
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-white/35">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <span className="mr-2 text-sm text-white/45">
              Page {safePage} / {totalPages}
            </span>
            <PaginationBtn
              label="First page"
              disabled={safePage <= 1}
              onClick={() => goToPage(1)}
            >
              |&lt;
            </PaginationBtn>
            <PaginationBtn
              label="Previous page"
              disabled={safePage <= 1}
              onClick={() => goToPage(Math.max(1, safePage - 1))}
            >
              &lt;
            </PaginationBtn>
            <PaginationBtn
              label="Next page"
              disabled={safePage >= totalPages}
              onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
            >
              &gt;
            </PaginationBtn>
            <PaginationBtn
              label="Last page"
              disabled={safePage >= totalPages}
              onClick={() => goToPage(totalPages)}
            >
              &gt;|
            </PaginationBtn>
          </div>
        </div>
      )}
    </div>
  );
}
