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
  | "mvpCount";
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
  }
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

  // Default sorting chain: Chosen field -> Kills -> ACS -> GamesPlayed
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
        (p.userName && p.userName.toLowerCase().includes(q)),
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
      <span className="ml-1 text-emerald-300">{sortDir === "asc" ? "▲" : "▼"}</span>
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
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
        No match data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "players" as const, label: "Players" },
            { id: "meta" as const, label: "Meta" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-all ${
              subTab === tab.id
                ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/35"
                : "text-white/45 ring-1 ring-inset ring-white/10 hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-1 text-xs text-white/35">
          {games.length} match{games.length !== 1 ? "es" : ""}
        </span>
      </div>

      {subTab === "meta" ? (
        <TournamentMetaSection games={games} eligibility={eligibility} />
      ) : (
        <>
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
            Tournament Leaderboard
          </h3>
          <span className="text-xs text-white/40">
            {searchedPlayers.length} players
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Player"
            className="w-full rounded-xl border border-white/10 bg-[#080d16] px-4 py-2 pl-9 text-xs font-medium text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none transition-all shadow-inner"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-white/40 pointer-events-none"
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
      </div>

      <div className="w-full rounded-2xl border border-white/10 bg-[#080d16] shadow-2xl">
        <table className="w-full table-fixed text-sm sm:text-base">
          <thead>
            <tr className="border-b border-white/10 bg-black/50 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/60">
              <th className="w-[4%] px-2 py-3 sm:px-4 sm:py-4 text-left">#</th>
              <th className="w-[28%] px-2 py-3 sm:px-4 sm:py-4 text-left">Player</th>
              <th
                className="w-[6%] px-1 py-3 sm:px-3 sm:py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("gamesPlayed")}
              >
                GP{sortIcon("gamesPlayed")}
              </th>
              <th
                className="w-[7%] px-1 py-3 sm:px-3 sm:py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgAcs")}
              >
                ACS{sortIcon("avgAcs")}
              </th>
              <th
                className="w-[14%] px-1 py-3 sm:px-3 sm:py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Click to sort by Kills (high→low / low→high)"
                onClick={() => toggleSort("totalKills")}
              >
                K / D / A{sortIcon("totalKills")}
              </th>
              <th
                className="w-[8%] px-1 py-3 sm:px-3 sm:py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("kd")}
              >
                K/D{sortIcon("kd")}
              </th>
              <th
                className="w-[8%] px-1 py-3 sm:px-3 sm:py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgHsPercent")}
              >
                HS%{sortIcon("avgHsPercent")}
              </th>
              <th
                className="w-[20%] px-1 py-3 sm:px-3 sm:py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Click to cycle Agent Role filter (All → Duelist → Initiator → Controller → Sentinel)"
                onClick={cycleRoleFilter}
              >
                <div className="inline-flex items-center gap-2 justify-center">
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
                const kd =
                  p.totalDeaths > 0
                    ? (p.totalKills / p.totalDeaths).toFixed(2)
                    : p.totalKills.toFixed(2);
                const agentIcon = getAgentIconUrl(p.mostPlayedAgent);
                const isTop3 = idx < 3;
                const mvps = p.mvpCount;

                // Progressive Golden Highlighting based on MVP count
                let rowBgClass = "border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]";
                let mvpBadgeClass = "";
                let nameColorClass = "text-white font-bold";

                if (mvps >= 3) {
                  rowBgClass = "border-b border-amber-300/60 bg-gradient-to-r from-amber-400/[0.28] via-yellow-400/[0.12] to-transparent shadow-[0_0_25px_rgba(251,191,36,0.25),inset_0_0_30px_rgba(245,158,11,0.15)] transition-all hover:from-amber-400/[0.35]";
                  mvpBadgeClass = "inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-2.5 py-0.5 text-[11px] font-black uppercase text-black border border-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.7)] animate-pulse tracking-wider";
                  nameColorClass = "text-amber-200 font-black tracking-wide drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]";
                } else if (mvps === 2) {
                  rowBgClass = "border-b border-amber-400/40 bg-gradient-to-r from-amber-400/[0.18] via-yellow-500/[0.06] to-transparent shadow-[inset_0_0_20px_rgba(245,158,11,0.1)] transition-all hover:from-amber-400/[0.24]";
                  mvpBadgeClass = "inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400/30 via-yellow-400/20 to-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200 border border-amber-300/50 shadow-[0_0_15px_rgba(245,158,11,0.35)] tracking-wide";
                  nameColorClass = "text-amber-100 font-extrabold drop-shadow-sm";
                } else if (mvps === 1) {
                  rowBgClass = "border-b border-amber-500/25 bg-gradient-to-r from-amber-500/[0.10] via-amber-500/[0.02] to-transparent transition-all hover:from-amber-500/[0.15]";
                  mvpBadgeClass = "inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-400/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
                  nameColorClass = "text-amber-100 font-bold";
                } else if (isTop3) {
                  rowBgClass = "border-b border-white/[0.04] bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent transition-colors hover:bg-white/[0.04]";
                }

                return (
                  <tr
                    key={p.key}
                    className={rowBgClass}
                  >
                    <td className="px-2 py-3 sm:px-4 sm:py-4 text-center">
                      <span
                        className={`font-mono text-sm sm:text-base font-extrabold ${
                          mvps >= 3
                            ? "text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                            : mvps === 2
                              ? "text-amber-300 drop-shadow-sm"
                              : mvps === 1
                                ? "text-amber-400"
                                : idx === 0
                                  ? "text-yellow-400"
                                  : idx === 1
                                    ? "text-gray-300"
                                    : idx === 2
                                      ? "text-amber-500"
                                      : "text-white/40"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>

                    <td className="px-2 py-3 sm:px-4 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="shrink-0">
                          {agentIcon ? (
                            <img
                              src={agentIcon}
                              alt={p.mostPlayedAgent ?? "Agent"}
                              className="h-9 w-9 sm:h-11 sm:w-11 object-contain mix-blend-screen filter drop-shadow-md"
                            />
                          ) : (
                            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white/50">
                              {name.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-sm sm:text-base truncate ${nameColorClass}`}>
                              {name}
                            </span>
                            {mvps > 0 && (
                              <span className={`shrink-0 ${mvpBadgeClass}`}>
                                👑 {mvps}x MVP
                              </span>
                            )}
                          </div>
                          {tag ? (
                            <div className="text-xs text-white/40">#{tag}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-1 py-3 sm:px-3 sm:py-4 text-center text-white/80 font-mono text-xs sm:text-sm font-medium">
                      {p.gamesPlayed}
                    </td>

                    <td className="px-1 py-3 sm:px-3 sm:py-4 text-center font-mono text-sm sm:text-base font-black text-white">
                      {p.avgAcs}
                    </td>

                    <td className="px-1 py-3 sm:px-3 sm:py-4 text-center font-mono text-xs sm:text-sm font-bold whitespace-nowrap">
                      <span className="text-emerald-300 font-black">{p.totalKills}</span>
                      <span className="text-white/30"> / </span>
                      <span className="text-rose-300">{p.totalDeaths}</span>
                      <span className="text-white/30"> / </span>
                      <span className="text-white/60">{p.totalAssists}</span>
                    </td>

                    <td className="px-1 py-3 sm:px-3 sm:py-4 text-center font-mono text-xs sm:text-sm font-bold">
                      <span className={Number(kd) >= 1.0 ? "text-emerald-300" : "text-rose-300"}>
                        {kd}
                      </span>
                    </td>

                    <td className="px-1 py-3 sm:px-3 sm:py-4 text-center font-mono text-xs sm:text-sm text-white/90 font-medium">
                      {p.avgHsPercent}%
                    </td>

                    <td className="px-1 py-3 sm:px-3 sm:py-4">
                      <div className="mx-auto grid w-max grid-cols-4 gap-1 sm:gap-1.5">
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
                                className="h-7 w-7 sm:h-8 sm:w-8 object-contain mix-blend-screen filter drop-shadow-md"
                              />
                            ) : (
                              <span
                                key={agent}
                                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/50"
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
                <td colSpan={8} className="px-5 py-10 text-center text-white/40 italic">
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

