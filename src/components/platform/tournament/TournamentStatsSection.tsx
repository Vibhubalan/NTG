"use client";

import { useMemo, useState } from "react";
import { getAgentIconUrl, getAgentRole, type AgentRole } from "@/lib/valorant-agent";
import {
  aggregatePlayerStats,
  type AggregatedPlayerStats,
  type TournamentStatsEligibility,
} from "@/lib/tournament-stats";
import type { PublicGame } from "./TournamentGamesSection";
import TournamentMetaSection from "./TournamentMetaSection";

type AggregatedPlayer = AggregatedPlayerStats;
type StatsSubTab = "players" | "meta";

type SortField =
  | "totalKills"
  | "avgAcs"
  | "gamesPlayed"
  | "kd"
  | "avgHsPercent"
  | "mvpCount"
  | "totalFirstKills"
  | "totalFirstDeaths";
type SortDir = "asc" | "desc";

function parseRiotName(riotId: string) {
  const [name, tag] = riotId.split("#");
  return { name: name ?? riotId, tag: tag ?? "" };
}

function fieldValue(p: AggregatedPlayer, field: SortField): number {
  switch (field) {
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
    ? "border-b border-white/[0.04] bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent transition-colors hover:bg-white/[0.04]"
    : "border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]";
  const mvpBadgeClass =
    mvps > 0
      ? "inline-flex items-center gap-1 rounded-md border border-amber-300/40 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-amber-200 uppercase"
      : "";
  const nameColorClass = "text-white font-bold";
  const rankClass =
    idx === 0
      ? "text-yellow-400"
      : idx === 1
        ? "text-gray-300"
        : idx === 2
          ? "text-amber-500"
          : "text-white/40";

  return { rowBgClass, mvpBadgeClass, nameColorClass, rankClass };
}

type Props = {
  games: PublicGame[];
  eligibility?: TournamentStatsEligibility;
};

export default function TournamentStatsSection({ games, eligibility }: Props) {
  const [subTab, setSubTab] = useState<StatsSubTab>("players");
  const [sortBy, setSortBy] = useState<SortField>("totalKills");
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

  const sorted = useMemo(() => {
    const arr = [...filteredPlayers];
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
  }, [filteredPlayers, sortBy, sortDir]);

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
        setSortBy("totalKills");
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
    { field: "totalKills", label: "KDA" },
    { field: "avgAcs", label: "ACS" },
    { field: "kd", label: "K/D" },
    { field: "totalFirstKills", label: "FK" },
    { field: "gamesPlayed", label: "GP" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Stats view"
          className="inline-flex rounded-xl border border-white/12 bg-[#080d16] p-1 shadow-inner"
        >
          {(
            [
              { id: "players" as const, label: "Players" },
              { id: "meta" as const, label: "Meta" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`min-w-[5.5rem] rounded-lg px-4 py-2.5 text-[11px] font-black tracking-[0.14em] uppercase transition-all ${
                subTab === tab.id
                  ? "bg-emerald-400 text-[#070a12] shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                  : "bg-transparent text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/35">
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
              </div>
              <button
                type="button"
                onClick={cycleRoleFilter}
                className={`inline-flex h-8 w-[8.75rem] shrink-0 items-center justify-center rounded-lg px-2 text-[10px] font-black tracking-wider uppercase transition-all md:hidden ${
                  selectedRole === "ALL"
                    ? "bg-white/10 text-white/55 ring-1 ring-white/10"
                    : "bg-emerald-400 text-[#070a12]"
                }`}
              >
                <span className="truncate">
                  Role: {selectedRole === "ALL" ? "All" : selectedRole}
                </span>
              </button>
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

            {/* Mobile sort chips — inset rings so edges aren’t clipped by overflow */}
            <div className="grid w-full min-w-0 grid-cols-5 gap-1.5 md:hidden">
              {sortChips.map((chip) => (
                <button
                  key={chip.field}
                  type="button"
                  onClick={() => toggleSort(chip.field)}
                  className={`inline-flex min-w-0 items-center justify-center rounded-lg border px-0.5 py-2 text-center text-[9px] font-black tracking-wide uppercase transition-all ${
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

          {/* ── Mobile cards ── */}
          <div className="space-y-4 md:hidden">
            {searchedPlayers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#080d16] px-4 py-10 text-center text-sm text-white/40 italic">
                {searchQuery
                  ? `No players found matching "${searchQuery}".`
                  : `No players found for agent role filter "${selectedRole}".`}
              </div>
            ) : (
              searchedPlayers.map((p, idx) => {
                const { name, tag } = parseRiotName(p.riotId);
                const kd = playerKd(p);
                const agentIcon = getAgentIconUrl(p.mostPlayedAgent);
                const { mvpBadgeClass, nameColorClass } = rowStyles(
                  idx,
                  p.mvpCount,
                );
                const topAgents = Object.entries(p.agentCounts).sort(
                  (a, b) => b[1] - a[1],
                );
                const cardSurface =
                  idx < 3
                    ? "border-emerald-400/20 bg-[#0b1420] shadow-[inset_0_1px_0_rgba(52,211,153,0.12)]"
                    : "border-white/[0.08] bg-[#0a0f18]";

                return (
                  <article
                    key={p.key}
                    className={`rounded-2xl border px-4 py-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.8)] ${cardSurface}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-black tabular-nums ${
                          idx === 0
                            ? "border-yellow-400/35 bg-yellow-400/10 text-yellow-300"
                            : idx === 1
                              ? "border-white/20 bg-white/10 text-white/85"
                              : idx === 2
                                ? "border-amber-600/35 bg-amber-700/15 text-amber-400"
                                : "border-white/10 bg-white/[0.04] text-white/55"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="shrink-0">
                        {agentIcon ? (
                          <img
                            src={agentIcon}
                            alt={p.mostPlayedAgent ?? "Agent"}
                            className="h-10 w-10 object-contain mix-blend-screen drop-shadow-md"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white/50">
                            {name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`truncate text-[15px] ${nameColorClass}`}>
                            {name}
                          </span>
                          {p.mvpCount > 0 ? (
                            <span className={`shrink-0 ${mvpBadgeClass}`}>
                              👑 {p.mvpCount}x MVP
                            </span>
                          ) : null}
                        </div>
                        {tag ? (
                          <p className="mt-0.5 font-mono text-[11px] text-white/40">
                            #{tag}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.07] bg-black/40 p-3 text-center sm:grid-cols-6">
                      <div>
                        <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                          ACS
                        </p>
                        <p className="mt-1 font-mono text-sm font-black text-white">
                          {p.avgAcs}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                          K/D
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm font-black ${
                            Number(kd) >= 1 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {kd}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                          GP
                        </p>
                        <p className="mt-1 font-mono text-sm font-black text-white/85">
                          {p.gamesPlayed}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                          FK
                        </p>
                        <p className="mt-1 font-mono text-sm font-black text-cyan-300">
                          {p.totalFirstKills}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                          FD
                        </p>
                        <p className="mt-1 font-mono text-sm font-black text-orange-300/90">
                          {p.totalFirstDeaths}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                          HS%
                        </p>
                        <p className="mt-1 font-mono text-sm font-black text-white/85">
                          {p.avgHsPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                      <p className="font-mono text-[11px] font-bold">
                        <span className="text-emerald-300">{p.totalKills}</span>
                        <span className="text-white/30"> / </span>
                        <span className="text-rose-300">{p.totalDeaths}</span>
                        <span className="text-white/30"> / </span>
                        <span className="text-white/55">{p.totalAssists}</span>
                      </p>
                      <span className="text-[9px] font-black tracking-wider text-white/35 uppercase">
                        K / D / A
                      </span>
                    </div>

                    {topAgents.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.08] pt-3">
                        <span className="mr-1 text-[9px] font-black tracking-wider text-white/35 uppercase">
                          Agents
                        </span>
                        {topAgents.map(([agent, count]) => {
                          const icon = getAgentIconUrl(agent);
                          return (
                            <div
                              key={agent}
                              title={`${agent} · ${count}g`}
                              className="relative flex items-center justify-center rounded-md bg-black/30 p-0.5 ring-1 ring-white/10"
                            >
                              {icon ? (
                                <img
                                  src={icon}
                                  alt={agent}
                                  className="h-6 w-6 object-contain mix-blend-screen drop-shadow"
                                />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center text-[8px] font-bold text-white/50">
                                  {agent.slice(0, 2)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-[#080d16] shadow-2xl md:block">
            <table className="w-full min-w-[820px] text-sm sm:text-base">
              <thead>
                <tr className="border-b border-white/10 bg-black/50 text-xs font-black tracking-wider text-white/60 uppercase">
                  <th className="w-12 px-4 py-4 text-left">#</th>
                  <th className="px-4 py-4 text-left">Player</th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    title="Toggle high→low / low→high"
                    onClick={() => toggleSort("gamesPlayed")}
                  >
                    GP{sortIcon("gamesPlayed")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    title="Toggle high→low / low→high"
                    onClick={() => toggleSort("avgAcs")}
                  >
                    ACS{sortIcon("avgAcs")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    title="Click to sort by Kills"
                    onClick={() => toggleSort("totalKills")}
                  >
                    K / D / A{sortIcon("totalKills")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    onClick={() => toggleSort("kd")}
                  >
                    K/D{sortIcon("kd")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    title="First kills"
                    onClick={() => toggleSort("totalFirstKills")}
                  >
                    FK{sortIcon("totalFirstKills")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    title="First deaths"
                    onClick={() => toggleSort("totalFirstDeaths")}
                  >
                    FD{sortIcon("totalFirstDeaths")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    onClick={() => toggleSort("avgHsPercent")}
                  >
                    HS%{sortIcon("avgHsPercent")}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-4 text-center select-none transition-colors hover:text-white"
                    title="Click to cycle Agent Role filter"
                    onClick={cycleRoleFilter}
                  >
                    <div className="inline-flex items-center justify-center gap-2">
                      <span>Agents</span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase transition-all ${
                          selectedRole === "ALL"
                            ? "bg-white/10 text-white/50"
                            : "bg-[#22c55e] text-[#070a12] shadow-sm"
                        }`}
                      >
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
                      <tr key={p.key} className={rowBgClass}>
                        <td className="px-4 py-4 text-center">
                          <span className={`font-mono text-base font-extrabold ${rankClass}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="shrink-0">
                              {agentIcon ? (
                                <img
                                  src={agentIcon}
                                  alt={p.mostPlayedAgent ?? "Agent"}
                                  className="h-11 w-11 object-contain mix-blend-screen drop-shadow-md filter"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white/50">
                                  {name.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className={`truncate text-base ${nameColorClass}`}>
                                  {name}
                                </span>
                                {p.mvpCount > 0 ? (
                                  <span className={`shrink-0 ${mvpBadgeClass}`}>
                                    👑 {p.mvpCount}x MVP
                                  </span>
                                ) : null}
                              </div>
                              {tag ? (
                                <div className="text-xs text-white/40">#{tag}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-sm font-medium text-white/80">
                          {p.gamesPlayed}
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-base font-black text-white">
                          {p.avgAcs}
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-sm font-bold whitespace-nowrap">
                          <span className="font-black text-emerald-300">{p.totalKills}</span>
                          <span className="text-white/30"> / </span>
                          <span className="text-rose-300">{p.totalDeaths}</span>
                          <span className="text-white/30"> / </span>
                          <span className="text-white/60">{p.totalAssists}</span>
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-sm font-bold">
                          <span
                            className={
                              Number(kd) >= 1.0 ? "text-emerald-300" : "text-rose-300"
                            }
                          >
                            {kd}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-sm font-bold text-cyan-300">
                          {p.totalFirstKills}
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-sm font-bold text-orange-300/90">
                          {p.totalFirstDeaths}
                        </td>
                        <td className="px-3 py-4 text-center font-mono text-sm font-medium text-white/90">
                          {p.avgHsPercent}%
                        </td>
                        <td className="px-3 py-4">
                          <div className="mx-auto grid w-max grid-cols-4 gap-1.5">
                            {Object.entries(p.agentCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([agent]) => {
                                const icon = getAgentIconUrl(agent);
                                return icon ? (
                                  <img
                                    key={agent}
                                    src={icon}
                                    alt={agent}
                                    title={agent}
                                    className="h-8 w-8 object-contain mix-blend-screen drop-shadow-md filter"
                                  />
                                ) : (
                                  <span
                                    key={agent}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/50"
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
                      colSpan={10}
                      className="px-5 py-10 text-center text-white/40 italic"
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
