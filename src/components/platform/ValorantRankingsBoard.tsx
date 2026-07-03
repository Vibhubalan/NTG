"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { LeaderboardPreview } from "@core/contracts";
import { formatRankLabel, formatLeaderboardRr, rankAccentClass, rankIconUrl } from "@/lib/valorant-rank";
import {
  buildLeaderboardView,
  type LeaderboardViewEntry,
} from "@/lib/leaderboard-view";
import {
  msUntilNextRefresh,
} from "@/lib/leaderboard-schedule";
import BrandIcon from "@/components/ui/BrandIcon";
import LeaderboardPlayerCardBackdrop from "@/components/platform/LeaderboardPlayerCardBackdrop";
import { gameMetaFor } from "@/lib/tournament-display";

function PodiumCard({
  entry,
  rank,
  widthClass,
  borderColor,
  glowColor,
  pillBg,
  ringColor,
}: {
  entry: LeaderboardViewEntry | undefined;
  rank: number;
  widthClass: string;
  borderColor: string;
  glowColor: string;
  pillBg: string;
  ringColor: string;
}) {
  if (!entry) {
    return (
      <div className={`${widthClass} aspect-[268/640] rounded-2xl sm:rounded-[2rem] border border-dashed border-white/10 bg-black/40 flex flex-col items-center justify-center`}>
        <span className="text-white/20 text-xl sm:text-3xl font-black font-display">#{rank}</span>
        <span className="text-white/20 text-[9px] sm:text-xs mt-1 sm:mt-2 uppercase tracking-widest">Vacant</span>
      </div>
    );
  }

  const icon = rankIconUrl(entry.viewRankTierId);
  const cardImg = entry.riotPlayerCard ?? "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

  return (
    <div 
      className={`${widthClass} aspect-[268/640] rounded-2xl sm:rounded-[2rem] border-2 ${borderColor} ${glowColor} relative overflow-hidden flex flex-col justify-end p-2 sm:p-4 shadow-2xl transition-transform duration-500`}
    >
      {/* Top Left Rank Badge */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10 select-none pointer-events-none">
        {rank === 1 ? (
          <span className="font-display text-3xl sm:text-5xl font-black text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.7)] flex items-center gap-0.5">
            1<span className="text-xl sm:text-2xl align-top">★</span>
          </span>
        ) : rank === 2 ? (
          <span className="font-display text-3xl sm:text-5xl font-black text-rose-500 drop-shadow-[0_2px_12px_rgba(244,63,94,0.7)]">
            2
          </span>
        ) : (
          <span className="font-display text-3xl sm:text-5xl font-black text-cyan-400 drop-shadow-[0_2px_12px_rgba(34,211,238,0.7)]">
            3
          </span>
        )}
      </div>

      {/* Player Card Image Background */}
      <img
        src={cardImg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none"
      />
      {/* Glass Pane & Shimmer effect for Rank 1 */}
      {rank === 1 && (
        <>
          <style>{`
            @keyframes glass-shimmer-sweep {
              0% { transform: translateX(-150%) skewX(-20deg); }
              35%, 100% { transform: translateX(150%) skewX(-20deg); }
            }
          `}</style>
          {/* Glass frosting overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.04] to-white/[0.12] pointer-events-none z-0 mix-blend-overlay" />
          {/* Animated diagonal glass sheen */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            <div 
              className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{
                animation: 'glass-shimmer-sweep 4s cubic-bezier(0.25, 1, 0.5, 1) infinite',
              }}
            />
          </div>
          {/* Extra glass highlight top edge */}
          <div className="absolute inset-0 border border-white/20 rounded-2xl sm:rounded-[2rem] pointer-events-none z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
        </>
      )}
      {/* Dark gradient overlay at the bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Rank Icon (No Circle) */}
        <div className="h-10 w-10 sm:h-16 sm:w-16 flex items-center justify-center mb-2 sm:mb-4">
          {icon ? (
            <img src={icon} alt="" className="h-10 w-10 sm:h-16 sm:w-16 object-contain drop-shadow-md" />
          ) : (
            <div className="h-10 w-10 sm:h-16 sm:w-16 rounded-xl bg-white/10" />
          )}
        </div>

        {/* Username */}
        <h3 className="font-display text-[10px] sm:text-xl font-black text-white leading-tight drop-shadow-md truncate max-w-full">
          {entry.displayName}
        </h3>

        {/* Riot ID */}
        <p className="text-[7px] sm:text-xs text-white/50 font-medium mt-0.5 sm:mt-1 truncate max-w-full">
          {entry.riotId ?? "No Riot ID"}
        </p>

        {/* RR Pill Badge */}
        <div className={`mt-2 sm:mt-4 rounded-full px-2 sm:px-5 py-0.5 sm:py-1.5 text-[8px] sm:text-xs font-black tracking-widest text-white shadow-md uppercase ${pillBg}`}>
          {formatLeaderboardRr(entry.viewMmr)} RR
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function tierEdgeColor(tierId: number | null | undefined): string {
  if (tierId == null || tierId <= 0) return "bg-white/10 group-hover:bg-white/30";
  if (tierId >= 24) return "bg-rose-500/40 group-hover:bg-rose-500/80 group-hover:shadow-[-4px_0_10px_rgba(244,63,94,0.5)]"; // Radiant/Immortal
  if (tierId >= 21) return "bg-emerald-500/40 group-hover:bg-emerald-500/80 group-hover:shadow-[-4px_0_10px_rgba(16,185,129,0.5)]"; // Ascendant
  if (tierId >= 18) return "bg-violet-500/40 group-hover:bg-violet-500/80 group-hover:shadow-[-4px_0_10px_rgba(139,92,246,0.5)]"; // Diamond
  if (tierId >= 15) return "bg-cyan-500/40 group-hover:bg-cyan-500/80 group-hover:shadow-[-4px_0_10px_rgba(6,182,212,0.5)]"; // Platinum
  if (tierId >= 12) return "bg-amber-500/40 group-hover:bg-amber-500/80 group-hover:shadow-[-4px_0_10px_rgba(245,158,11,0.5)]"; // Gold
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
  const [showRest, setShowRest] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  const sorted = useMemo(() => buildLeaderboardView(data.entries), [data.entries]);

  const userEntry = session?.user?.name
    ? sorted.find((e) => e.displayName === session.user.name)
    : null;

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

    // Start fading other components/bg after 2 seconds
    const fadeTimer = setTimeout(() => {
      setShowRest(true);
    }, 2000);

    // Unmount grid overlay after transition completes (2s + 1.2s wave + 0.6s animation)
    const completeTimer = setTimeout(() => {
      setIntroComplete(true);
    }, 4500);

    return () => {
      clearInterval(timer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
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
    const lastSyncStr =
      data.lastRefreshedAt ??
      data.entries.reduce((latest, e) => {
        if (!e.lastSyncedAt) return latest;
        if (!latest) return e.lastSyncedAt;
        return new Date(e.lastSyncedAt) > new Date(latest) ? e.lastSyncedAt : latest;
      }, null as string | null);

    const lastSyncDate = lastSyncStr ? new Date(lastSyncStr) : null;

    const timeUntilNext = msUntilNextRefresh(false, now);

    const h = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const m = Math.floor((timeUntilNext / 1000 / 60) % 60);
    const s = Math.floor((timeUntilNext / 1000) % 60);
    timeLeftStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    if (!lastSyncDate) {
      lastRefreshedStr = "--";
    } else {
    const day = lastSyncDate.getDate();
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    const monthStr = lastSyncDate.toLocaleDateString(undefined, { month: 'short' });
    const timeStr = lastSyncDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

    lastRefreshedStr = `${day}${suffix} ${monthStr} ${timeStr}`;
    }
  }

  return (
    <>
      {/* Immersive Bluish Smoky Background */}
      <div className="fixed inset-0 -z-10 bg-[#0a0f16] overflow-hidden">
        {/* Core highlight light */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[100vh] bg-[radial-gradient(ellipse_at_top,_rgba(24,50,80,0.6)_0%,_rgba(10,15,22,0)_70%)] pointer-events-none mix-blend-screen transition-opacity duration-1000 ease-out"
          style={{ opacity: showRest ? 1 : 0 }}
        />
        
        {/* Smoky blue/cyan blurred orbs */}
        <div 
          className="absolute top-1/4 -left-1/4 w-[80vw] h-[80vh] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none transition-opacity duration-1000 ease-out"
          style={{ opacity: showRest ? 1 : 0 }}
        />
        <div 
          className="absolute bottom-1/4 -right-1/4 w-[80vw] h-[80vh] bg-cyan-900/5 blur-[120px] rounded-full pointer-events-none transition-opacity duration-1000 ease-out"
          style={{ opacity: showRest ? 1 : 0 }}
        />
        
        {/* Subtle grid/texture overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay" />
      </div>

      {/* Grid Overlay for reveal animation */}
      {!introComplete && (
        <div 
          className="fixed inset-0 z-20 pointer-events-none grid"
          style={{
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: "repeat(12, 1fr)",
          }}
        >
          {Array.from({ length: 144 }).map((_, i) => {
            const r = Math.floor(i / 12);
            const c = i % 12;
            // Delay based on distance from bottom-right (r = 11, c = 11)
            const dist = (11 - r) + (11 - c);
            const delay = dist * 0.05; // 0s to 1.1s wave delay relative to fade trigger
            return (
              <div
                key={i}
                className="bg-[#0a0f16] transition-opacity duration-600 ease-in-out"
                style={{
                  opacity: showRest ? 0 : 1,
                  transitionDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Intro Podium Screen */}
      {!introComplete && (
        <div 
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-transparent pointer-events-none transition-opacity duration-700 ease-in-out pb-10 sm:pb-12"
          style={{ opacity: showRest ? 0 : 1 }}
        >
          {/* Spacing to clear the fixed navbar */}
          <div className="h-16 sm:h-20 shrink-0" />

          {/* Rankings Header text at the top of intro screen */}
          <div className="mb-8 sm:mb-12 text-center select-none">
            <h1 className="font-display text-4xl sm:text-6xl font-black text-transparent bg-gradient-to-b from-white to-white/60 bg-clip-text tracking-wider uppercase drop-shadow-md">
              TOP 3 PLAYERS
            </h1>
            <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] mt-2">
              NTG Competitive Leaderboard
            </p>
          </div>

          {/* Podium Row */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 px-4">
            {/* 2nd Place */}
            <PodiumCard
              entry={sorted[1]}
              rank={2}
              widthClass="w-[105px] sm:w-[160px] md:w-[200px]"
              borderColor="border-slate-300/40"
              glowColor="shadow-[0_0_20px_rgba(203,213,225,0.1)]"
              ringColor="border-[#cbd5e1]"
              pillBg="bg-rose-600"
            />
            {/* 1st Place */}
            <PodiumCard
              entry={sorted[0]}
              rank={1}
              widthClass="w-[120px] sm:w-[185px] md:w-[230px]"
              borderColor="border-amber-500/60"
              glowColor="shadow-[0_0_30px_rgba(245,158,11,0.25)]"
              ringColor="border-amber-500"
              pillBg="bg-amber-500"
            />
            {/* 3rd Place */}
            <PodiumCard
              entry={sorted[2]}
              rank={3}
              widthClass="w-[95px] sm:w-[142px] md:w-[175px]"
              borderColor="border-[#b48464]/40"
              glowColor="shadow-[0_0_20px_rgba(180,132,100,0.1)]"
              ringColor="border-[#b48464]"
              pillBg="bg-cyan-600"
            />
          </div>
        </div>
      )}

      {/* Increased max-width to make it "zoomed and big" */}
      <div 
        className={`relative w-full mx-auto max-w-6xl pb-20 transition-opacity duration-700 ease-in-out ${
          showRest ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        
        {/* Premium Header */}
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-black/40 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Subtle glow orb inside the card */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/20 blur-[80px]" />
          
          {/* Valorant Logo (Top Right) — filled paths, not stroke (stroke breaks the V shape) */}
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8 pointer-events-none text-[#FF4655] opacity-90 drop-shadow-[0_0_15px_rgba(255,70,85,0.8)]">
            <BrandIcon
              path={gameMetaFor("VALORANT").iconPath}
              title="Valorant"
              className="h-20 w-20 sm:h-36 sm:w-36"
            />
          </div>
          
          <div className="relative z-10">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#FF4655] drop-shadow-md">
              Competitive Ranked
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg uppercase">
              WHO RULES MANGALURU?
            </h2>
            <p className="mt-4 max-w-2xl text-sm sm:text-base font-medium text-white/50 leading-relaxed">
            The official valorant competitive leaderboard for Mangaluru. Link your Riot ID to claim your rank and earn your place among the city&apos;s best.
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
              <span className="text-white/60">
                Next refresh in {timeLeftStr}
                <span className="text-white/35"> · 2:30 AM IST</span>
              </span>
            </div>
          </div>
        </div>

        {/* Transparent Tile Leaderboard */}
        <div className="w-full sm:px-4">
          
          {/* Column headers (Visible on large screens) */}
          <div
            className="mb-4 hidden items-center px-8 text-xs font-bold uppercase tracking-[0.2em] text-white/30 lg:grid border-b border-white/5 pb-4 gap-x-6"
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
                {pageEntries.map((e) => {
                  const icon = rankIconUrl(e.viewRankTierId);
                  const accent = rankAccentClass(e.viewRankTierId);
                  const label = formatRankLabel(e.viewRankTierId, e.viewRankTier);
                  const edgeColorClass = tierEdgeColor(e.viewRankTierId);
                  
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
                    // Only inset shadow — no outer glow that bleeds onto adjacent rows
                    rowBgClass = "border-[#dfc776]/40 border-t-[#dfc776]/60 bg-gradient-to-b from-[#dfc776]/[0.08] to-transparent shadow-[inset_0_2px_20px_rgba(223,199,118,0.07)] z-10";
                  } else if (isRank2) {
                    rankColorClass = "text-[#cbd5e1]";
                    rankGlowClass = "drop-shadow-[0_0_15px_rgba(203,213,225,0.4)]";
                    rowBgClass = "border-[#cbd5e1]/40 border-t-[#cbd5e1]/60 bg-gradient-to-b from-[#cbd5e1]/[0.06] to-transparent shadow-[inset_0_2px_20px_rgba(203,213,225,0.06)] z-10";
                  } else if (isRank3) {
                    rankColorClass = "text-[#b48464]";
                    rankGlowClass = "drop-shadow-[0_0_12px_rgba(180,132,100,0.4)]";
                    rowBgClass = "border-[#b48464]/40 border-t-[#b48464]/60 bg-gradient-to-b from-[#b48464]/[0.06] to-transparent shadow-[inset_0_2px_20px_rgba(180,132,100,0.06)] z-10";
                  }

                  if (isUser) {
                    rankColorClass = "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]";
                    rowBgClass = isFlashing 
                      ? "border-white bg-white/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.15)] z-30 scale-[1.02]"
                      : "border-white/30 bg-gradient-to-r from-white/[0.08] to-transparent shadow-[inset_0_0_20px_rgba(255,255,255,0.06)] z-20";
                  }

                  return (
                    <li
                      id={`row-${e.displayName}`}
                      key={`${e.rank}-${e.riotId ?? e.displayName}`}
                      style={{ isolation: "isolate" }}
                      className={`group relative flex items-center overflow-hidden rounded-xl border ${rowBgClass} px-5 sm:px-6 h-[90px] sm:h-[110px] backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:z-30 hover:border-white/20 hover:bg-white/[0.04]`}
                    >
                      <LeaderboardPlayerCardBackdrop
                        riotPlayerCard={e.riotPlayerCard}
                        riotPlayerCardWide={e.riotPlayerCardWide}
                        featured={isTop3}
                        shimmer={isRank1}
                      />
                      {/* Left Edge Tier Highlight — clip-path clips glow vertically to prevent bleed onto adjacent rows */}
                      <div
                        style={{ clipPath: 'inset(0px -200px)' }}
                        className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-xl transition-all duration-300 ${
                          isUser ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" : edgeColorClass
                        }`}
                      />
                      {/* Grid Layout for Row */}
              <div className="flex w-full items-center gap-x-3 lg:grid lg:gap-x-6 z-10" style={{ gridTemplateColumns: "80px 220px 1fr 100px" }}>
                
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
                          {formatLeaderboardRr(e.viewMmr)}
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
              <div className="mt-auto flex justify-center pb-8 pt-12">
                <button
                  type="button"
                  onClick={handleJumpToMe}
                  className="flex items-center gap-4 sm:gap-6 rounded-2xl border border-white/20 bg-white/[0.03] p-5 px-8 sm:px-10 shadow-[0_0_40px_rgba(255,255,255,0.05)] backdrop-blur-md transition-transform hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex flex-col items-end border-r border-white/10 pr-4 sm:pr-6">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Your Rank</span>
                    <span className="font-display text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">#{userEntry.rank}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {rankIconUrl(userEntry.viewRankTierId) && (
                      <Image
                        src={rankIconUrl(userEntry.viewRankTierId)!}
                        alt={userEntry.viewRankTier ?? ""}
                        width={48}
                        height={48}
                        className="object-contain drop-shadow-md"
                        unoptimized
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-base font-black text-white drop-shadow-sm">{userEntry.displayName}</span>
                      <span className={`text-sm font-bold ${rankAccentClass(userEntry.viewRankTierId)} mt-0.5`}>
                        {formatRankLabel(userEntry.viewRankTierId, userEntry.viewRankTier)} • {formatLeaderboardRr(userEntry.viewMmr)} RR
                      </span>
                    </div>
                  </div>
                </button>
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

