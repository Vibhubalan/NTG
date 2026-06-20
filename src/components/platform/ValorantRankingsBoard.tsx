"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
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

function tierEdgeColor(tierId: number | null | undefined): string {
  if (tierId == null) return "bg-white/10 group-hover:bg-white/30";
  if (tierId >= 24) return "bg-rose-500/40 group-hover:bg-rose-500/80 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.4)]"; // Radiant/Immortal
  if (tierId >= 21) return "bg-emerald-500/40 group-hover:bg-emerald-500/80 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.4)]"; // Ascendant
  if (tierId >= 18) return "bg-violet-500/40 group-hover:bg-violet-500/80 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.4)]"; // Diamond
  if (tierId >= 15) return "bg-cyan-500/40 group-hover:bg-cyan-500/80 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.4)]"; // Platinum
  if (tierId >= 12) return "bg-amber-500/40 group-hover:bg-amber-500/80 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]"; // Gold
  return "bg-white/10 group-hover:bg-white/30";
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
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-sm text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

type Props = { data: LeaderboardPreview };

export default function ValorantRankingsBoard({ data }: Props) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [isFlashing, setIsFlashing] = useState(false);

  const sorted = useMemo(() => sortByMmr(data.entries), [data.entries]);

  const userEntry = useMemo(() => {
    if (!session?.user?.name) return null;
    return sorted.find((e) => e.displayName === session.user.name);
  }, [sorted, session?.user?.name]);

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

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const goToPage = (newPage: number) => {
    setPage(newPage);
  };

  const handleJumpToMe = () => {
    if (!userEntry) return;
    if (query) setQuery("");
    
    const userIndex = sorted.findIndex((e) => e.displayName === userEntry.displayName);
    if (userIndex !== -1) {
      setPage(Math.floor(userIndex / PAGE_SIZE) + 1);
    }
    
    setTimeout(() => {
      const rowElement = document.getElementById(`row-${userEntry.displayName}`);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);
      }
    }, 100);
  };

  let lastRefreshedStr = "--";
  let timeLeftStr = "--:--:--";

  if (mounted) {
    const lastSyncStr = data.entries.reduce((latest, e) => {
      if (!e.lastSyncedAt) return latest;
      if (!latest) return e.lastSyncedAt;
      return new Date(e.lastSyncedAt) > new Date(latest) ? e.lastSyncedAt : latest;
    }, null as string | null);

    const lastSyncDate = lastSyncStr ? new Date(lastSyncStr) : new Date();
    
    // The cron job runs at midnight (12:00 AM) local time
    const nextSyncDate = new Date(now);
    nextSyncDate.setHours(24, 0, 0, 0);

    let timeUntilNext = nextSyncDate.getTime() - now.getTime();
    if (timeUntilNext < 0) timeUntilNext = 0;

    const h = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const m = Math.floor((timeUntilNext / 1000 / 60) % 60);
    const s = Math.floor((timeUntilNext / 1000) % 60);
    timeLeftStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const day = lastSyncDate.getDate();
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    const monthStr = lastSyncDate.toLocaleDateString(undefined, { month: 'short' });
    const timeStr = lastSyncDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

    lastRefreshedStr = `${day}${suffix} ${monthStr} ${timeStr}`;
  }

  return (
    <>
      {/* Immersive Bluish Smoky Background */}
      <div className="fixed inset-0 -z-10 bg-[#0a0f16] overflow-hidden">
        {/* Core highlight light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[100vh] bg-[radial-gradient(ellipse_at_top,_rgba(24,50,80,0.6)_0%,_rgba(10,15,22,0)_70%)] pointer-events-none mix-blend-screen" />
        
        {/* Smoky blue/cyan blurred orbs */}
        <div className="absolute top-1/4 -left-1/4 w-[80vw] h-[80vh] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -right-1/4 w-[80vw] h-[80vh] bg-cyan-900/5 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Subtle grid/texture overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay" />
      </div>

      {/* Increased max-width to make it "zoomed and big" */}
      <div className="relative w-full mx-auto max-w-6xl pb-20">
        
        {/* Premium Header */}
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-black/40 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Subtle glow orb inside the card */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/20 blur-[80px]" />
          
          {/* Valorant Logo (Top Right) */}
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8 opacity-80 pointer-events-none drop-shadow-[0_0_15px_rgba(255,70,85,0.8)]">
            <svg 
              viewBox="0 0 100 100" 
              className="w-20 h-20 sm:w-36 sm:h-36"
              fill="none" 
              stroke="#FF4655" 
              strokeWidth="2.5" 
              strokeLinejoin="round"
            >
              <path d="M99.25 48.66V10.28c0-.59-.75-.86-1.12-.39l-41.92 52.4a.627.627 0 00.49 1.02h30.29c.82 0 1.59-.37 2.1-1.01l9.57-11.96c.38-.48.59-1.07.59-1.68zM1.17 50.34L32.66 89.7c.51.64 1.28 1.01 2.1 1.01h53.46c.53 0 .82-.61.45-1.02L36.6 24.52A3.242 3.242 0 0034.07 23.4H2.23c-.76 0-1.16.89-.66 1.45l31.14 38.3c.53.64.12 1.62-.68 1.66H1.77c-.52.01-.81-.61-.45-1.02z" />
            </svg>
          </div>
          
          <div className="relative z-10">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#FF4655] drop-shadow-md">
              Competitive Ranked
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg uppercase">
              WHO RULES MANGALURU?
            </h2>
            <p className="mt-4 max-w-2xl text-sm sm:text-base font-medium text-white/50 leading-relaxed">
              The official valorant competitive leaderboard for Mangaluru. Link your Riot ID to claim your rank and earn your place among the city's best.
            </p>
          </div>
        </div>

        {/* Search & Meta */}
        <div className="mb-8 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-[400px]">
            <svg
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player or Riot ID…"
              className="w-full rounded-lg border border-white/10 bg-black/40 py-4 pl-12 pr-5 text-base text-white placeholder:text-white/40 focus:border-cyan-500/50 focus:bg-[#0f1923]/90 focus:outline-none transition-colors backdrop-blur-md shadow-lg"
            />
          </div>
          <div className="flex flex-col items-start sm:items-end text-left sm:text-right mt-4 sm:mt-0">
            <div className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-1.5">
               {filtered.length} Players on the board
            </div>
            {/* Refresh Timer */}
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex flex-wrap items-center gap-2">
              <span>Last Refreshed: {lastRefreshedStr}</span>
              <span className="text-white/10 hidden sm:inline">|</span>
              <span className="text-white/60">Next Refresh in: {timeLeftStr}</span>
            </div>
          </div>
        </div>

        {/* Transparent Tile Leaderboard */}
        <div className="w-full sm:px-4">
          
          {/* Column headers (Visible on large screens) */}
          <div
            className="mb-4 hidden items-center px-8 text-xs font-bold uppercase tracking-[0.2em] text-white/30 sm:grid border-b border-white/5 pb-4 sm:gap-x-6"
            style={{ gridTemplateColumns: "80px 220px 1fr 100px" }}
          >
            <div className="text-center">Rank</div>
            <div className="pl-2">Tier</div>
            <div>Player</div>
            <div className="text-right">RR</div>
          </div>

          {/* Rows */}
          <div className="min-h-[1000px] sm:min-h-[1250px] flex flex-col">
            {pageEntries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-24 text-center backdrop-blur-xl">
                <p className="font-display text-2xl text-white/50">No players found</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3 relative">
                {pageEntries.map((e, idx) => {
                  const icon = rankIconUrl(e.rankTierId);
                  const accent = rankAccentClass(e.rankTierId);
                  const label = formatRankLabel(e.rankTierId, e.rankTier);
                  const edgeColorClass = tierEdgeColor(e.rankTierId);
                  
                  const isRank1 = e.rank === 1;
                  const isRank2 = e.rank === 2;
                  const isRank3 = e.rank === 3;
                  const isTop3 = isRank1 || isRank2 || isRank3;
                  
                  const isUser = session?.user?.name === e.displayName;

                  // Rank Colors & Glows
                  let rankColorClass = "text-white/60";
                  let rankGlowClass = "";
                  let rowBgClass = "border-white/5 bg-transparent";
                  
                  if (isRank1) {
                    rankColorClass = "text-[#dfc776]";
                    rankGlowClass = "drop-shadow-[0_0_15px_rgba(223,199,118,0.4)]";
                    rowBgClass = "border-[#dfc776]/40 border-t-[#dfc776]/60 bg-gradient-to-b from-[#dfc776]/[0.08] to-transparent shadow-[inset_0_2px_20px_rgba(223,199,118,0.05),0_0_20px_rgba(223,199,118,0.1)] z-10";
                  } else if (isRank2) {
                    rankColorClass = "text-[#cbd5e1]";
                    rankGlowClass = "drop-shadow-[0_0_15px_rgba(203,213,225,0.4)]";
                    rowBgClass = "border-[#cbd5e1]/40 border-t-[#cbd5e1]/60 bg-gradient-to-b from-[#cbd5e1]/[0.06] to-transparent shadow-[inset_0_2px_20px_rgba(203,213,225,0.05),0_0_20px_rgba(203,213,225,0.08)] z-10";
                  } else if (isRank3) {
                    rankColorClass = "text-[#b48464]";
                    rankGlowClass = "drop-shadow-[0_0_12px_rgba(180,132,100,0.4)]";
                    rowBgClass = "border-[#b48464]/40 border-t-[#b48464]/60 bg-gradient-to-b from-[#b48464]/[0.06] to-transparent shadow-[inset_0_2px_20px_rgba(180,132,100,0.05),0_0_15px_rgba(180,132,100,0.08)] z-10";
                  }

                  if (isUser) {
                    rankColorClass = "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]";
                    rowBgClass = isFlashing 
                      ? "border-white bg-white/20 shadow-[0_0_40px_rgba(255,255,255,0.6)] z-30 scale-[1.02]"
                      : "border-white/30 bg-gradient-to-r from-white/[0.08] to-transparent shadow-[0_0_20px_rgba(255,255,255,0.15)] z-20";
                  }

                  return (
                    <li
                      id={`row-${e.displayName}`}
                      key={`${e.rank}-${e.riotId ?? e.displayName}`}
                      className={`group relative flex items-center rounded-xl border ${rowBgClass} px-5 sm:px-6 h-[90px] sm:h-[110px] backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:z-30 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}
                    >
                      {/* Left Edge Tier Highlight */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-xl transition-all duration-300 ${
                        isUser ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" : edgeColorClass
                      }`} />
                      {/* Grid Layout for Row */}
              <div className="flex w-full items-center gap-x-3 sm:grid sm:gap-x-6 z-10" style={{ gridTemplateColumns: "80px 220px 1fr 100px" }}>
                
                      {/* Rank Column */}
                      <div className="w-12 sm:w-auto shrink-0 flex items-center justify-center sm:justify-start">
                        <span className={`font-display font-black tracking-tight ${rankColorClass} ${rankGlowClass} ${
                          isTop3 ? "text-4xl sm:text-6xl" : "text-2xl sm:text-4xl"
                        }`}>
                          {e.rank}
                          {isRank1 && <span className="ml-1 align-top text-xl sm:text-2xl text-[#dfc776]">★</span>}
                        </span>
                      </div>

                      {/* Tier Column (Icon + Label) */}
                      <div className="hidden sm:flex items-center gap-3">
                        {icon ? (
                          <Image
                            src={icon}
                            alt={label}
                            width={64}
                            height={64}
                            className={`${isTop3 ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-10 w-10 sm:h-12 sm:w-12'} object-contain drop-shadow-md`}
                            unoptimized
                          />
                        ) : (
                          <div className={`${isTop3 ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-10 w-10 sm:h-12 sm:w-12'} rounded-xl bg-white/10`} />
                        )}
                        <span className={`font-bold tracking-wide ${accent} ${isTop3 ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
                          {label}
                        </span>
                      </div>

                      {/* Player Column */}
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        {/* Mobile Tier Icon */}
                        {icon && (
                          <Image
                            src={icon}
                            alt={label}
                            width={48}
                            height={48}
                            className={`${isTop3 ? 'h-12 w-12' : 'h-10 w-10'} shrink-0 object-contain sm:hidden`}
                            unoptimized
                          />
                        )}
                        
                        <div className="min-w-0 flex flex-col justify-center">
                          <p className={`truncate font-display font-bold transition-colors ${
                            isUser ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" : "text-white/95 group-hover:text-white"
                          } ${isTop3 ? 'text-xl sm:text-3xl' : 'text-base sm:text-xl'}`}>
                            {e.displayName}
                          </p>
                          <p className="truncate text-[10px] sm:text-xs font-medium text-white/40 mt-0.5">
                            {e.riotId ? e.riotId : 'No ID'}
                          </p>
                          <span className={`sm:hidden text-[10px] font-bold ${accent} mt-0.5`}>
                            {label}
                          </span>
                        </div>
                      </div>

                      {/* Rating (RR) Column */}
                      <div className="text-right flex flex-col items-end justify-center shrink-0 ml-auto sm:ml-0">
                        <span className={`font-display font-black tracking-tight ${
                          isUser ? "text-white drop-shadow-lg" : "text-white/90 group-hover:text-white"
                        } ${isTop3 ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-3xl'}`}>
                          {e.mmr?.toLocaleString() ?? "—"}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-black text-[#FF4655]/80 uppercase tracking-widest mt-0.5">
                          RR
                        </span>
                      </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Static User Overview Banner */}
            {userEntry && (
              <div 
                className="mt-auto flex justify-center pb-8 pt-12 cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={handleJumpToMe}
              >
                <div className="flex items-center gap-4 sm:gap-6 rounded-2xl border border-white/20 bg-white/[0.03] p-5 px-8 sm:px-10 shadow-[0_0_40px_rgba(255,255,255,0.05)] backdrop-blur-md">
                  <div className="flex flex-col items-end border-r border-white/10 pr-4 sm:pr-6">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Your Rank</span>
                    <span className="font-display text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">#{userEntry.rank}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {rankIconUrl(userEntry.rankTierId) && (
                      <Image
                        src={rankIconUrl(userEntry.rankTierId)!}
                        alt={userEntry.rankTier ?? ""}
                        width={48}
                        height={48}
                        className="object-contain drop-shadow-md"
                        unoptimized
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-base font-black text-white drop-shadow-sm">{userEntry.displayName}</span>
                      <span className={`text-sm font-bold ${rankAccentClass(userEntry.rankTierId)} mt-0.5`}>
                        {formatRankLabel(userEntry.rankTierId, userEntry.rankTier)} • {userEntry.mmr?.toLocaleString() ?? "—"} RR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="mt-10 flex items-center justify-between pt-6 px-2">
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                Showing {(safePage - 1) * PAGE_SIZE + 1} – {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-3">
                <span className="mr-4 text-xs text-white/40 uppercase tracking-widest font-bold hidden sm:block">
                  Page {safePage} / {totalPages}
                </span>
                <PaginationBtn label="First" disabled={safePage <= 1} onClick={() => goToPage(1)}>
                  |&lt;
                </PaginationBtn>
                <PaginationBtn label="Prev" disabled={safePage <= 1} onClick={() => goToPage(Math.max(1, safePage - 1))}>
                  &lt;
                </PaginationBtn>
                <PaginationBtn label="Next" disabled={safePage >= totalPages} onClick={() => goToPage(Math.min(totalPages, safePage + 1))}>
                  &gt;
                </PaginationBtn>
                <PaginationBtn label="Last" disabled={safePage >= totalPages} onClick={() => goToPage(totalPages)}>
                  &gt;|
                </PaginationBtn>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

