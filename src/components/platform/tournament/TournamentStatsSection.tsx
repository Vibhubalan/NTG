"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getAgentIconUrl, getAgentRole, type AgentRole } from "@/lib/valorant-agent";
import ValorantRoleIcon from "@/components/icons/ValorantRoleIcon";
import {
  aggregatePlayerStats,
  computeStandoutBaseline,
  weightedAcs,
  type AggregatedPlayerStats,
  type TournamentStatsEligibility,
} from "@/lib/tournament-stats";
import type { PublicGame } from "./TournamentGamesSection";
import TournamentMetaSection from "./TournamentMetaSection";

type AggregatedPlayer = AggregatedPlayerStats;
type StatsSubTab = "players" | "meta";

type SortField =
  | "rating"
  | "totalKills"
  | "avgAcs"
  | "gamesPlayed"
  | "kd"
  | "avgHsPercent"
  | "mvpCount"
  | "totalFirstKills"
  | "totalFirstDeaths";
type SortDir = "asc" | "desc";

/** Player row plus the Bayesian-weighted ACS used for the default ranking. */
type RatedPlayer = AggregatedPlayer & { rating: number };

function parseRiotName(riotId: string) {
  const [name, tag] = riotId.split("#");
  return { name: name ?? riotId, tag: tag ?? "" };
}

function fieldValue(p: RatedPlayer, field: SortField): number {
  switch (field) {
    case "rating":
      return p.rating;
    case "mvpCount":
      return p.mvpCount;
    case "totalKills":
      return p.totalKills;
    case "avgAcs":
      return p.avgAcs;
    case "gamesPlayed":
      return p.gamesPlayed;
    case "kd":
      return p.totalDeaths > 0 ? p.totalKills / p.totalDeaths : p.totalKills;
    case "avgHsPercent":
      return p.avgHsPercent;
    case "totalFirstKills":
      return p.totalFirstKills;
    case "totalFirstDeaths":
      return p.totalFirstDeaths;
  }
}

function playerKd(p: AggregatedPlayer): string {
  return p.totalDeaths > 0
    ? (p.totalKills / p.totalDeaths).toFixed(2)
    : p.totalKills.toFixed(2);
}

function rowStyles(idx: number, mvps: number) {
  const isTop3 = idx < 3;
  const rowBgClass = isTop3
    ? "border-b border-white/[0.035] transition-colors duration-150"
    : "border-b border-white/[0.035] transition-colors duration-150";
  const mvpBadgeClass =
    mvps > 0
      ? "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black tracking-wider text-amber-200 uppercase"
      : "";
  const nameColorClass = idx === 0 ? "text-white font-bold" : "text-white/90 font-semibold";
  const rankClass =
    idx === 0
      ? "text-amber-300"
      : idx === 1
        ? "text-slate-300"
        : idx === 2
          ? "text-amber-600"
          : "text-white/30";

  return { rowBgClass, mvpBadgeClass, nameColorClass, rankClass };
}

/** Where sorting lands initially, and returns to on the third click of a column. */
const DEFAULT_SORT: SortField = "rating";

type Props = {
  slug?: string;
  games: PublicGame[];
  eligibility?: TournamentStatsEligibility;
  /** ADMIN / ADMIN_EMAILS — shows stats CSV download. */
  isAdmin?: boolean;
};

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function TournamentStatsSection({
  slug,
  games,
  eligibility,
  isAdmin = false,
}: Props) {
  const [subTab, setSubTab] = useState<StatsSubTab>("players");
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedRole, setSelectedRole] = useState<AgentRole | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlayers = useMemo(() => {
    return aggregatePlayerStats(games, {
      agentRoleFilter:
        selectedRole === "ALL"
          ? undefined
          : (agent) => getAgentRole(agent) === selectedRole,
      eligibility,
    });
  }, [games, selectedRole, eligibility]);

  // Baseline follows the visible pool, so filtering to a role compares players
  // against that role rather than against Duelist ACS.
  const ratedPlayers = useMemo<RatedPlayer[]>(() => {
    const baseline = computeStandoutBaseline(filteredPlayers);
    return filteredPlayers.map((p) => ({
      ...p,
      rating: weightedAcs(p.avgAcs, p.gamesPlayed, baseline),
    }));
  }, [filteredPlayers]);

  const sorted = useMemo(() => {
    const arr = [...ratedPlayers];
    arr.sort((a, b) => {
      const primary = fieldValue(a, sortBy) - fieldValue(b, sortBy);
      if (primary !== 0) return sortDir === "desc" ? -primary : primary;

      if (sortBy !== "mvpCount") {
        const mvp = a.mvpCount - b.mvpCount;
        if (mvp !== 0) return -mvp;
      }
      if (sortBy !== "totalKills") {
        const kills = a.totalKills - b.totalKills;
        if (kills !== 0) return -kills;
      }
      if (sortBy !== "avgAcs") {
        const acs = a.avgAcs - b.avgAcs;
        if (acs !== 0) return -acs;
      }
      if (sortBy !== "gamesPlayed") {
        const gp = a.gamesPlayed - b.gamesPlayed;
        if (gp !== 0) return -gp;
      }
      return 0;
    });
    return arr;
  }, [ratedPlayers, sortBy, sortDir]);

  const searchedPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.riotId.toLowerCase().includes(q) ||
        (p.userName && p.userName.toLowerCase().includes(q)) ||
        p.teamNames.some((name) => name.toLowerCase().includes(q)),
    );
  }, [sorted, searchQuery]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      if (sortDir === "desc") {
        setSortDir("asc");
      } else {
        setSortBy(DEFAULT_SORT);
        setSortDir("desc");
      }
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function sortIcon(field: SortField) {
    if (sortBy !== field) return null;
    return (
      <span className="ml-0.5 text-[8px] text-emerald-300" aria-hidden>
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  function cycleRoleFilter() {
    const roleOrder: (AgentRole | "ALL")[] = [
      "ALL",
      "Duelist",
      "Initiator",
      "Controller",
      "Sentinel",
    ];
    const currentIndex = roleOrder.indexOf(selectedRole);
    const nextIndex = (currentIndex + 1) % roleOrder.length;
    setSelectedRole(roleOrder[nextIndex]);
  }

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/40 sm:p-12">
        No match data available yet.
      </div>
    );
  }

  const sortChips: { field: SortField; label: string }[] = [
    { field: "rating", label: "Rating" },
    { field: "avgAcs", label: "ACS" },
    { field: "kd", label: "K/D" },
    { field: "totalKills", label: "KDA" },
    { field: "totalFirstKills", label: "FK" },
    { field: "totalFirstDeaths", label: "FD" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Stats view"
          className="inline-flex gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5"
        >
          {(
            [
              { id: "players" as const, label: "Players" },
              { id: "meta" as const, label: "Maps & agents" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`rounded px-3.5 py-2 text-xs font-medium transition-colors ${
                subTab === tab.id
                  ? "bg-white/[0.08] text-white"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-white/30">
          {games.length} match{games.length !== 1 ? "es" : ""}
        </span>
      </div>

      {subTab === "meta" ? (
        <TournamentMetaSection games={games} eligibility={eligibility} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-black tracking-[0.16em] text-emerald-300 uppercase">
                  Tournament Leaderboard
                </h3>
                <p className="mt-0.5 text-xs text-white/40">
                  {searchedPlayers.length} players
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-white/35">
                  Rating balances score with how many games someone played.
                  One hot match can&apos;t beat a full tournament run.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isAdmin && slug ? (
                  <a
                    href={`/api/admin/tournaments/${encodeURIComponent(slug)}/stats/export`}
                    download
                    title="Download player stats (Excel)"
                    aria-label="Download player stats"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300 md:hidden"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={cycleRoleFilter}
                  className={`inline-flex h-8 w-[8.75rem] items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-black tracking-wider uppercase transition-all md:hidden ${
                    selectedRole === "ALL"
                      ? "bg-white/10 text-white/55 ring-1 ring-white/10"
                      : "bg-emerald-400 text-[#070a12]"
                  }`}
                >
                  {selectedRole !== "ALL" ? (
                    <ValorantRoleIcon role={selectedRole} className="h-3.5 w-3.5" />
                  ) : null}
                  <span className="truncate">
                    Role: {selectedRole === "ALL" ? "All" : selectedRole}
                  </span>
                </button>
              </div>
            </div>

            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Players or Team Name"
                className="w-full rounded-xl border border-white/10 bg-[#080d16] py-2.5 pr-4 pl-9 text-xs font-medium text-white placeholder-white/40 shadow-inner transition-all focus:border-emerald-400 focus:outline-none"
              />
              <svg
                className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Mobile sort chips */}
            <div className="grid w-full min-w-0 grid-cols-6 gap-1 md:hidden">
              {sortChips.map((chip) => (
                <button
                  key={chip.field}
                  type="button"
                  onClick={() => toggleSort(chip.field)}
                  className={`inline-flex min-w-0 items-center justify-center rounded-md border px-0.5 py-1.5 text-center text-[9px] font-black tracking-wide uppercase transition-all ${
                    sortBy === chip.field
                      ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                      : "border-white/10 bg-white/[0.03] text-white/50"
                  }`}
                >
                  <span className="truncate">
                    {chip.label}
                    {sortIcon(chip.field)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Mobile compact leaderboard ── */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080d16] md:hidden">
            {searchedPlayers.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-white/40 italic">
                {searchQuery
                  ? `No players found matching "${searchQuery}".`
                  : `No players found for agent role filter "${selectedRole}".`}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_2.5rem_2.5rem_1.75rem] items-center gap-1.5 border-b border-white/10 bg-black/40 px-2.5 py-2 text-[9px] font-black tracking-wider text-white/40 uppercase">
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Rating</span>
                  <span className="text-right">ACS</span>
                  <span className="text-right">K/D</span>
                  <span className="text-right">GP</span>
                </div>
                <ul className="divide-y divide-white/[0.06]">
                  {searchedPlayers.map((p, idx) => {
                    const { name, tag } = parseRiotName(p.riotId);
                    const kd = playerKd(p);
                    const agentIcon = getAgentIconUrl(p.mostPlayedAgent);
                    const allAgents = Object.entries(p.agentCounts).sort(
                      (a, b) => b[1] - a[1],
                    );
                    const rankClass =
                      idx === 0
                        ? "text-yellow-400"
                        : idx === 1
                          ? "text-white/80"
                          : idx === 2
                            ? "text-amber-500"
                            : "text-white/35";

                    return (
                      <li
                        key={p.key}
                        className={`px-2.5 py-2 ${
                          idx < 3 ? "bg-emerald-500/[0.04]" : ""
                        }`}
                      >
                        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_2.5rem_2.5rem_1.75rem] items-center gap-1.5">
                          <span
                            className={`font-mono text-[11px] font-black tabular-nums ${rankClass}`}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex min-w-0 items-center gap-1.5">
                            {agentIcon ? (
                              <Image
                                src={agentIcon}
                                alt={p.mostPlayedAgent ?? "Agent"}
                                width={28}
                                height={28}
                                className="h-7 w-7 shrink-0 object-contain mix-blend-screen"
                              />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/10 text-[9px] font-bold text-white/50">
                                {name.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-1 min-w-0">
                                <span className="truncate text-[13px] font-bold text-white">
                                  {name}
                                </span>
                                {tag ? (
                                  <span className="shrink-0 font-mono text-[10px] text-white/35">
                                    #{tag}
                                  </span>
                                ) : null}
                              </div>
                              {p.mvpCount > 0 ? (
                                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                  <span className="inline-flex items-center gap-0.5 rounded border border-amber-400/40 bg-amber-400/20 px-1 py-0.5 text-[8px] font-black text-amber-300 uppercase shadow-[0_0_6px_rgba(245,158,11,0.2)]">
                                    👑 {p.mvpCount}x MVP
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <span className="text-right font-mono text-[12px] font-black tabular-nums text-emerald-300">
                            {p.rating.toFixed(1)}
                          </span>
                          <span className="text-right font-mono text-[12px] font-bold tabular-nums text-white/85">
                            {p.avgAcs}
                          </span>
                          <span
                            className={`text-right font-mono text-[12px] font-bold tabular-nums ${
                              Number(kd) >= 1
                                ? "text-cyan-300"
                                : "text-rose-300"
                            }`}
                          >
                            {kd}
                          </span>
                          <span className="text-right font-mono text-[12px] font-bold tabular-nums text-white/55">
                            {p.gamesPlayed}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 pl-9 text-[10px] text-white/35">
                          <span className="font-mono font-semibold">
                            <span className="text-emerald-300/80">
                              {p.totalKills}
                            </span>
                            <span className="text-white/25">/</span>
                            <span className="text-rose-300/80">
                              {p.totalDeaths}
                            </span>
                            <span className="text-white/25">/</span>
                            <span className="text-white/50">
                              {p.totalAssists}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums">
                            FK {p.totalFirstKills}
                            <span className="mx-1 text-white/20">·</span>
                            FD {p.totalFirstDeaths}
                            <span className="mx-1 text-white/20">·</span>
                            HS {p.avgHsPercent}%
                          </span>
                        </div>
                        {allAgents.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-9">
                            {allAgents.map(([agent, count]) => {
                              const icon = getAgentIconUrl(agent);
                              return (
                                <div
                                  key={agent}
                                  title={`${agent} · ${count}g`}
                                  className="flex items-center justify-center rounded bg-black/30 p-0.5 ring-1 ring-white/10"
                                >
                                  {icon ? (
                                    <Image
                                      src={icon}
                                      alt={agent}
                                      width={18}
                                      height={18}
                                      className="h-[18px] w-[18px] object-contain mix-blend-screen"
                                    />
                                  ) : (
                                    <span className="flex h-[18px] w-[18px] items-center justify-center text-[7px] font-bold text-white/50">
                                      {agent.slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* ── Desktop table ── */}
          <div
            className="relative hidden overflow-x-auto rounded-2xl shadow-2xl md:block"
            style={{
              background: "linear-gradient(160deg, rgba(8,12,22,0.98) 0%, rgba(5,8,18,1) 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 0 1px rgba(34,197,94,0.04) inset, 0 24px 48px rgba(0,0,0,0.45)",
            }}
          >
            {/* Top shimmer line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            {isAdmin && slug ? (
              <a
                href={`/api/admin/tournaments/${encodeURIComponent(slug)}/stats/export`}
                download
                title="Download player stats (Excel)"
                aria-label="Download player stats"
                className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/55 backdrop-blur-sm transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/15 hover:text-emerald-300"
              >
                <DownloadIcon className="h-4 w-4" />
              </a>
            ) : null}
            <table className="w-full min-w-[900px] text-sm sm:text-base">
              <thead>
                <tr
                  className="text-[9.5px] font-black tracking-[0.2em] text-white/25 uppercase"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                >
                  <th className="w-12 px-5 py-4 text-left">#</th>
                  <th className="px-4 py-4 text-left">Player</th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="Toggle high→low / low→high"
                    onClick={() => toggleSort("gamesPlayed")}
                  >
                    GP{sortIcon("gamesPlayed")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="Rating: ACS adjusted for how many games were played"
                    onClick={() => toggleSort("rating")}
                  >
                    Rating{sortIcon("rating")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="Toggle high→low / low→high"
                    onClick={() => toggleSort("avgAcs")}
                  >
                    ACS{sortIcon("avgAcs")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="Click to sort by Kills"
                    onClick={() => toggleSort("totalKills")}
                  >
                    K / D / A{sortIcon("totalKills")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    onClick={() => toggleSort("kd")}
                  >
                    K/D{sortIcon("kd")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="First kills"
                    onClick={() => toggleSort("totalFirstKills")}
                  >
                    FK{sortIcon("totalFirstKills")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="First deaths"
                    onClick={() => toggleSort("totalFirstDeaths")}
                  >
                    FD{sortIcon("totalFirstDeaths")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    onClick={() => toggleSort("avgHsPercent")}
                  >
                    HS%{sortIcon("avgHsPercent")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white/60"
                    title="Click to cycle Agent Role filter"
                    onClick={cycleRoleFilter}
                  >
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>Agents</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase transition-all ${
                          selectedRole === "ALL"
                            ? "bg-white/[0.08] text-white/40"
                            : "bg-emerald-400 text-[#070a12] shadow-sm"
                        }`}
                      >
                        {selectedRole !== "ALL" ? (
                          <ValorantRoleIcon role={selectedRole} className="h-3 w-3" />
                        ) : null}
                        {selectedRole === "ALL" ? "All" : selectedRole}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchedPlayers.length > 0 ? (
                  searchedPlayers.map((p, idx) => {
                    const { name, tag } = parseRiotName(p.riotId);
                    const kd = playerKd(p);
                    const agentIcon = getAgentIconUrl(p.mostPlayedAgent);
                    const { rowBgClass, mvpBadgeClass, nameColorClass, rankClass } =
                      rowStyles(idx, p.mvpCount);

                    return (
                      <tr
                        key={p.key}
                        className={rowBgClass}
                        style={{
                          background: idx === 0
                            ? "linear-gradient(90deg, rgba(34,197,94,0.07) 0%, transparent 55%)"
                            : undefined,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.028)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = idx === 0
                            ? "linear-gradient(90deg, rgba(34,197,94,0.07) 0%, transparent 55%)"
                            : "";
                        }}
                      >
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`font-mono text-base font-black tabular-nums ${rankClass}`}
                            style={idx === 0 ? { textShadow: "0 0 12px rgba(251,191,36,0.4)" } : undefined}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="shrink-0">
                              {agentIcon ? (
                                <Image
                                  src={agentIcon}
                                  alt={p.mostPlayedAgent ?? "Agent"}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 object-contain mix-blend-screen drop-shadow-md filter"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-bold text-white/40">
                                  {name.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-1.5 min-w-0">
                                <span className={`truncate text-[13px] leading-tight ${nameColorClass}`}>
                                  {name}
                                </span>
                                {tag ? (
                                  <span className="shrink-0 font-mono text-[10px] text-white/30">
                                    #{tag}
                                  </span>
                                ) : null}
                              </div>
                              {p.mvpCount > 0 ? (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`shrink-0 ${mvpBadgeClass}`}
                                    style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(234,179,8,0.08) 100%)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 8px rgba(245,158,11,0.12)" }}
                                  >
                                    <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 text-amber-300" aria-hidden>
                                      <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" />
                                    </svg>
                                    {p.mvpCount}x MVP
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[13px] font-semibold tabular-nums text-white/55">
                          {p.gamesPlayed}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className="font-mono text-[15px] font-black tabular-nums text-emerald-300">
                            {p.rating.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[14px] font-bold tabular-nums text-white/85">
                          {p.avgAcs}
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[12px] font-semibold whitespace-nowrap">
                          <span className="text-emerald-400">{p.totalKills}</span>
                          <span className="text-white/20"> / </span>
                          <span className="text-rose-400">{p.totalDeaths}</span>
                          <span className="text-white/20"> / </span>
                          <span className="text-white/50">{p.totalAssists}</span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span
                            className={`font-mono text-[13px] font-bold tabular-nums ${
                              Number(kd) >= 1.0 ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {kd}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[13px] font-semibold tabular-nums text-cyan-300">
                          {p.totalFirstKills}
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[13px] font-semibold tabular-nums text-orange-300/80">
                          {p.totalFirstDeaths}
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[13px] font-medium tabular-nums text-white/75">
                          {p.avgHsPercent}%
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="mx-auto flex w-max flex-wrap gap-1">
                            {Object.entries(p.agentCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([agent]) => {
                                const icon = getAgentIconUrl(agent);
                                return icon ? (
                                  <Image
                                    key={agent}
                                    src={icon}
                                    alt={agent}
                                    title={agent}
                                    width={30}
                                    height={30}
                                    className="h-[30px] w-[30px] object-contain mix-blend-screen drop-shadow-md filter"
                                  />
                                ) : (
                                  <span
                                    key={agent}
                                    className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[0.06] text-[8px] font-bold text-white/40"
                                    title={agent}
                                  >
                                    {agent.slice(0, 2)}
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-5 py-12 text-center text-white/30 italic text-sm"
                    >
                      {searchQuery
                        ? `No players found matching "${searchQuery}".`
                        : `No players found for agent role filter "${selectedRole}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
