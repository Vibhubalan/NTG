"use client";

import { useMemo, useState } from "react";
import { getAgentIconUrl } from "@/lib/valorant-agent";
import type { PublicGame } from "./TournamentGamesSection";

type AggregatedPlayer = {
  riotId: string;
  teamId: string | null;
  gamesPlayed: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  avgAcs: number;
  avgAdr: number;
  avgHsPercent: number;
  mostPlayedAgent: string | null;
  agentCounts: Record<string, number>;
};

type SortField = "avgAcs" | "avgAdr" | "avgHsPercent" | "kd" | "totalKills" | "gamesPlayed";
type SortDir = "asc" | "desc";

function parseRiotName(riotId: string) {
  const [name, tag] = riotId.split("#");
  return { name: name ?? riotId, tag: tag ?? "" };
}

function fieldValue(p: AggregatedPlayer, field: SortField): number {
  switch (field) {
    case "avgAcs":
      return p.avgAcs;
    case "avgAdr":
      return p.avgAdr;
    case "avgHsPercent":
      return p.avgHsPercent;
    case "kd":
      return p.totalDeaths > 0 ? p.totalKills / p.totalDeaths : p.totalKills;
    case "totalKills":
      return p.totalKills;
    case "gamesPlayed":
      return p.gamesPlayed;
  }
}

type Props = {
  games: PublicGame[];
};

export default function TournamentStatsSection({ games }: Props) {
  // One primary column; click toggles high↔low only (no off).
  // Default: more games → highest avg ACS → highest kills.
  const [sortBy, setSortBy] = useState<SortField>("gamesPlayed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const players = useMemo(() => {
    const map = new Map<
      string,
      {
        riotId: string;
        teamId: string | null;
        kills: number;
        deaths: number;
        assists: number;
        acsSum: number;
        adrSum: number;
        hsSum: number;
        agentCounts: Record<string, number>;
        games: number;
      }
    >();

    for (const game of games) {
      for (const p of game.players) {
        const key = p.riotId.toLowerCase();
        let entry = map.get(key);
        if (!entry) {
          entry = {
            riotId: p.riotId,
            teamId: p.teamId,
            kills: 0,
            deaths: 0,
            assists: 0,
            acsSum: 0,
            adrSum: 0,
            hsSum: 0,
            agentCounts: {},
            games: 0,
          };
          map.set(key, entry);
        }
        entry.kills += p.kills;
        entry.deaths += p.deaths;
        entry.assists += p.assists;
        entry.acsSum += p.acs;
        entry.adrSum += p.adr;
        entry.hsSum += p.hsPercent;
        entry.games += 1;
        if (p.agent) {
          entry.agentCounts[p.agent] = (entry.agentCounts[p.agent] ?? 0) + 1;
        }
      }
    }

    const result: AggregatedPlayer[] = [];
    for (const e of map.values()) {
      const g = e.games;
      const mostPlayedAgent =
        Object.entries(e.agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      result.push({
        riotId: e.riotId,
        teamId: e.teamId,
        gamesPlayed: g,
        totalKills: e.kills,
        totalDeaths: e.deaths,
        totalAssists: e.assists,
        avgAcs: g > 0 ? Math.round(e.acsSum / g) : 0,
        avgAdr: g > 0 ? Math.round((e.adrSum / g) * 10) / 10 : 0,
        avgHsPercent: g > 0 ? Math.round((e.hsSum / g) * 10) / 10 : 0,
        mostPlayedAgent,
        agentCounts: e.agentCounts,
      });
    }
    return result;
  }, [games]);

  const sorted = useMemo(() => {
    const arr = [...players];
    arr.sort((a, b) => {
      const primary = fieldValue(a, sortBy) - fieldValue(b, sortBy);
      if (primary !== 0) return sortDir === "desc" ? -primary : primary;

      // Default preference chain (skip whatever is already the primary column)
      if (sortBy !== "gamesPlayed") {
        const gp = a.gamesPlayed - b.gamesPlayed;
        if (gp !== 0) return -gp;
      }
      if (sortBy !== "avgAcs") {
        const acs = a.avgAcs - b.avgAcs;
        if (acs !== 0) return -acs;
      }
      if (sortBy !== "totalKills") {
        const kills = a.totalKills - b.totalKills;
        if (kills !== 0) return -kills;
      }
      return 0;
    });
    return arr;
  }, [players, sortBy, sortDir]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
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

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
        No match data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
          Tournament Leaderboard
        </h3>
        <span className="text-xs text-white/40">
          {games.length} match{games.length !== 1 ? "es" : ""} · {players.length} players
          <span className="ml-2 text-white/25">· click columns to sort</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#080d16]">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/40 text-[10px] font-bold uppercase tracking-widest text-white/50">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:text-white/80 select-none"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("gamesPlayed")}
              >
                GP{sortIcon("gamesPlayed")}
              </th>
              <th className="px-4 py-3 text-center">K / D / A</th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:text-white/80 select-none"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("kd")}
              >
                K/D{sortIcon("kd")}
              </th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:text-white/80 select-none"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgAcs")}
              >
                ACS{sortIcon("avgAcs")}
              </th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:text-white/80 select-none"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgAdr")}
              >
                ADR{sortIcon("avgAdr")}
              </th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:text-white/80 select-none"
                title="Toggle high→low / low→high"
                onClick={() => toggleSort("avgHsPercent")}
              >
                HS%{sortIcon("avgHsPercent")}
              </th>
              <th className="px-4 py-3 text-center">Agents</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const { name, tag } = parseRiotName(p.riotId);
              const kd =
                p.totalDeaths > 0
                  ? (p.totalKills / p.totalDeaths).toFixed(2)
                  : p.totalKills.toFixed(2);
              const agentIcon = getAgentIconUrl(p.mostPlayedAgent);
              const isTop3 = idx < 3;

              return (
                <tr
                  key={p.riotId}
                  className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                    isTop3
                      ? "bg-gradient-to-r from-emerald-500/[0.06] via-transparent to-transparent"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono text-xs font-bold ${
                        idx === 0
                          ? "text-yellow-400"
                          : idx === 1
                            ? "text-gray-300"
                            : idx === 2
                              ? "text-amber-600"
                              : "text-white/40"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {agentIcon ? (
                          <img
                            src={agentIcon}
                            alt={p.mostPlayedAgent ?? "Agent"}
                            className="h-9 w-9 object-contain"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center text-[10px] font-bold text-white/50">
                            {name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-white truncate block">{name}</span>
                        {tag ? <span className="text-[10px] text-white/30">#{tag}</span> : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center text-white/60 font-mono text-xs">
                    {p.gamesPlayed}
                  </td>

                  <td className="px-4 py-3 text-center font-mono text-xs">
                    <span className="text-emerald-300">{p.totalKills}</span>
                    <span className="text-white/30"> / </span>
                    <span className="text-rose-300">{p.totalDeaths}</span>
                    <span className="text-white/30"> / </span>
                    <span className="text-white/60">{p.totalAssists}</span>
                  </td>

                  <td className="px-4 py-3 text-center font-mono text-xs">
                    <span className={Number(kd) >= 1.0 ? "text-emerald-300" : "text-rose-300"}>
                      {kd}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center font-mono text-xs font-bold text-emerald-300">
                    {p.avgAcs}
                  </td>

                  <td className="px-4 py-3 text-center font-mono text-xs text-white/80">
                    {p.avgAdr}
                  </td>

                  <td className="px-4 py-3 text-center font-mono text-xs text-white/80">
                    {p.avgHsPercent}%
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
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
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <span
                              key={agent}
                              className="flex h-6 w-6 items-center justify-center text-[8px] font-bold text-white/50"
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
