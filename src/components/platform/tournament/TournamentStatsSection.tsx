"use client";

import { useMemo, useState } from "react";
import { getAgentIconUrl, getAgentRole, type AgentRole } from "@/lib/valorant-agent";
import {
  aggregateTeamScopedPlayerStats,
  type AggregatedTeamPlayerStats,
} from "@/lib/tournament-stats";
import type { PublicGame } from "./TournamentGamesSection";

type AggregatedPlayer = AggregatedTeamPlayerStats;

type SortField =
  | "totalKills"
  | "avgAcs"
  | "gamesPlayed"
  | "kd"
  | "avgAdr"
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
    case "avgAdr":
      return p.avgAdr;
    case "avgHsPercent":
      return p.avgHsPercent;
  }
}

type Props = {
  games: PublicGame[];
};

export default function TournamentStatsSection({ games }: Props) {
  const [sortBy, setSortBy] = useState<SortField>("totalKills");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedRole, setSelectedRole] = useState<AgentRole | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlayers = useMemo(() => {
    return aggregateTeamScopedPlayerStats(games, {
      agentRoleFilter:
        selectedRole === "ALL"
          ? undefined
          : (agent) => getAgentRole(agent) === selectedRole,
    });
  }, [games, selectedRole]);

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
        (p.userName && p.userName.toLowerCase().includes(q)) ||
        (p.teamName && p.teamName.toLowerCase().includes(q)),
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
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
            Tournament Leaderboard
          </h3>
          <span className="text-xs text-white/40">
            {games.length} match{games.length !== 1 ? "es" : ""} · {searchedPlayers.length} players
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

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#080d16] shadow-2xl">
        <table className="w-full min-w-[950px] text-base">
          <thead>
            <tr className="border-b border-white/10 bg-black/50 text-xs sm:text-sm font-black uppercase tracking-wider text-white/60">
              <th className="px-5 py-4 text-left w-12">#</th>
              <th className="px-5 py-4 text-left">Player</th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("gamesPlayed")}
              >
                GP{sortIcon("gamesPlayed")}
              </th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgAcs")}
              >
                ACS{sortIcon("avgAcs")}
              </th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Click to sort by Kills (high→low / low→high)"
                onClick={() => toggleSort("totalKills")}
              >
                K / D / A{sortIcon("totalKills")}
              </th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("kd")}
              >
                K/D{sortIcon("kd")}
              </th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgAdr")}
              >
                ADR{sortIcon("avgAdr")}
              </th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgHsPercent")}
              >
                HS%{sortIcon("avgHsPercent")}
              </th>
              <th
                className="px-5 py-4 text-center cursor-pointer hover:text-white select-none transition-colors"
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

                return (
                  <tr
                    key={p.key}
                    className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                      isTop3
                        ? "bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-transparent"
                        : ""
                    }`}
                  >
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`font-mono text-sm sm:text-base font-extrabold ${
                          idx === 0
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

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="shrink-0">
                          {agentIcon ? (
                            <img
                              src={agentIcon}
                              alt={p.mostPlayedAgent ?? "Agent"}
                              className="h-11 w-11 sm:h-12 sm:w-12 object-contain mix-blend-screen filter drop-shadow-md"
                            />
                          ) : (
                            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white/50">
                              {name.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base sm:text-lg text-white truncate block">
                              {name}
                            </span>
                            {mvps > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-400/20">
                                👑 {mvps}x MVP
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/40 flex-wrap">
                            {tag ? <span>#{tag}</span> : null}
                            {p.userName ? (
                              <span className="text-emerald-400/90 font-medium">
                                {p.userName}
                              </span>
                            ) : null}
                            {p.teamName ? (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                                {p.teamName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center text-white/80 font-mono text-sm sm:text-base font-medium">
                      {p.gamesPlayed}
                    </td>

                    <td className="px-5 py-4 text-center font-mono text-base sm:text-lg font-black text-white">
                      {p.avgAcs}
                    </td>

                    <td className="px-5 py-4 text-center font-mono text-base sm:text-lg font-bold">
                      <span className="text-emerald-300 font-black">{p.totalKills}</span>
                      <span className="text-white/30"> / </span>
                      <span className="text-rose-300">{p.totalDeaths}</span>
                      <span className="text-white/30"> / </span>
                      <span className="text-white/60">{p.totalAssists}</span>
                    </td>

                    <td className="px-5 py-4 text-center font-mono text-sm sm:text-base font-bold">
                      <span className={Number(kd) >= 1.0 ? "text-emerald-300" : "text-rose-300"}>
                        {kd}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center font-mono text-sm sm:text-base text-white/90 font-medium">
                      {p.avgAdr}
                    </td>

                    <td className="px-5 py-4 text-center font-mono text-sm sm:text-base text-white/90 font-medium">
                      {p.avgHsPercent}%
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
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
                                className="h-8 w-8 sm:h-9 sm:w-9 object-contain mix-blend-screen filter drop-shadow-md"
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
                <td colSpan={9} className="px-5 py-10 text-center text-white/40 italic">
                  {searchQuery
                    ? `No players found matching "${searchQuery}".`
                    : `No players found for agent role filter "${selectedRole}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

