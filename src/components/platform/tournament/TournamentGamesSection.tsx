"use client";

import { useEffect, useMemo, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";
import { getAgentIconUrl } from "@/lib/valorant-agent";
import { getValorantMapSplashUrl } from "@/lib/valorant-map";
import { partitionPlayersByCupTeam } from "@/lib/tournament-games";

export type PublicGamePlayer = {
  id: string;
  riotId: string;
  userId?: string | null;
  userName?: string | null;
  side: "Red" | "Blue";
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  hsPercent: number;
  rankTier: string | null;
  teamId: string | null;
};

export type PublicGame = {
  id: string;
  mapName: string | null;
  startedAt: string | null;
  publishedAt?: string | null;
  gameLengthSec: number | null;
  teamAName: string;
  teamBName: string;
  teamARounds: number;
  teamBRounds: number;
  teamAId: string;
  teamBId: string;
  winnerSide: "Red" | "Blue" | null;
  mvpRiotId: string | null;
  mvpAcs: number | null;
  players: PublicGamePlayer[];
};

type Props = {
  slug: string;
  /** Server-provided games to avoid loading on tab click. */
  initialGames?: PublicGame[];
};

type SortField = "acs" | "kills" | "kd" | "adr" | "hsPercent";

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/** Parses player Riot ID into { name, tag } */
function parseRiotName(riotId: string): { name: string; tag: string } {
  const hashIdx = riotId.lastIndexOf("#");
  if (hashIdx > 0) {
    return {
      name: riotId.substring(0, hashIdx),
      tag: riotId.substring(hashIdx),
    };
  }
  return { name: riotId, tag: "" };
}

export default function TournamentGamesSection({ slug, initialGames }: Props) {
  const hasInitialGames = Array.isArray(initialGames);
  const [games, setGames] = useState<PublicGame[]>(initialGames ?? []);
  const [loading, setLoading] = useState(!hasInitialGames);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(10);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("acs");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (hasInitialGames) return;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/tournaments/${slug}/games`);
        const parsed = await parseApiJson(res);
        if (cancelled) return;
        if (!parsed.ok) {
          setError(parsed.message);
          setGames([]);
          return;
        }
        if (!res.ok) {
          setError(
            typeof parsed.data.error === "string"
              ? parsed.data.error
              : "Failed to load matches.",
          );
          setGames([]);
          return;
        }
        const loadedGames = (parsed.data.games as PublicGame[] | undefined) ?? [];
        setGames(loadedGames);
        setError(null);
      } catch {
        if (!cancelled) setError("Failed to load matches.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, hasInitialGames]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => {
      if (g.teamAName.toLowerCase().includes(q)) return true;
      if (g.teamBName.toLowerCase().includes(q)) return true;
      return g.players.some(
        (p) =>
          p.riotId.toLowerCase().includes(q) ||
          (p.userName && p.userName.toLowerCase().includes(q)),
      );
    });
  }, [games, searchQuery]);

  const visibleGames = useMemo(() => {
    return filteredGames.slice(0, visibleLimit);
  }, [filteredGames, visibleLimit]);

  const selected = useMemo(
    () => games.find((g) => g.id === selectedId) ?? null,
    [games, selectedId],
  );

  const selectedTeamData = useMemo(() => {
    if (!selected) return null;

    const { teamA: teamAPlayers, teamB: teamBPlayers } = partitionPlayersByCupTeam(
      selected.players,
      selected.teamAId,
      selected.teamBId,
    );

    const sortFn = (a: PublicGamePlayer, b: PublicGamePlayer) => {
      let valA = 0;
      let valB = 0;
      switch (sortField) {
        case "acs":
          valA = a.acs;
          valB = b.acs;
          break;
        case "kills":
          valA = a.kills;
          valB = b.kills;
          break;
        case "kd":
          valA = a.deaths === 0 ? a.kills : a.kills / a.deaths;
          valB = b.deaths === 0 ? b.kills : b.kills / b.deaths;
          break;
        case "adr":
          valA = a.adr;
          valB = b.adr;
          break;
        case "hsPercent":
          valA = a.hsPercent;
          valB = b.hsPercent;
          break;
      }
      return sortAsc ? valA - valB : valB - valA;
    };

    const teamASorted = [...teamAPlayers].sort(sortFn);
    const teamBSorted = [...teamBPlayers].sort(sortFn);

    return {
      teamA: {
        name: selected.teamAName,
        rounds: selected.teamARounds,
        players: teamASorted,
      },
      teamB: {
        name: selected.teamBName,
        rounds: selected.teamBRounds,
        players: teamBSorted,
      },
    };
  }, [selected, sortField, sortAsc]);

  function handleSortHeaderClick(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#090e17]/80 p-12 text-center text-white/40 shadow-xl backdrop-blur-md">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent mb-3" />
        <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
          Loading Matches…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-8 text-center text-rose-200/90 shadow-xl">
        {error}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#090e17]/80 p-12 text-center shadow-xl">
        <p className="font-display text-xl font-bold uppercase tracking-[0.16em] text-white/70">
          No matches published yet
        </p>
        <p className="mt-3 text-sm text-white/40">
          Custom games will appear here once organizers publish them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Searchbar & Match Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleLimit(10);
            }}
            placeholder="Search Player or a Team"
            className="w-full rounded-xl border border-white/10 bg-[#080d16] px-4 py-2.5 pl-10 text-xs font-medium text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none transition-all shadow-inner"
          />
          <svg
            className="absolute left-3.5 top-3 h-4 w-4 text-white/40 pointer-events-none"
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
        <span className="text-xs font-medium text-white/40">
          Showing {visibleGames.length} of {filteredGames.length} matches
        </span>
      </div>

      {/* Match Cards List Tiles */}
      {visibleGames.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visibleGames.map((g) => {
            const isSelected = selectedId === g.id;
            const mapSplash = getValorantMapSplashUrl(g.mapName);
            const winnerIsA = g.teamARounds > g.teamBRounds;
            const winnerIsB = g.teamBRounds > g.teamARounds;
            const teamANameClass = winnerIsA
              ? "text-emerald-300"
              : winnerIsB
                ? "text-rose-300"
                : "text-white/80";
            const teamBNameClass = winnerIsB
              ? "text-emerald-300"
              : winnerIsA
                ? "text-rose-300"
                : "text-white/80";
            const teamARoundsClass = winnerIsA
              ? "text-emerald-300"
              : winnerIsB
                ? "text-rose-300"
                : "text-white";
            const teamBRoundsClass = winnerIsB
              ? "text-emerald-300"
              : winnerIsA
                ? "text-rose-300"
                : "text-white";

            return (
              <div key={g.id} className="space-y-4">
                {/* Neutral Match Card Tile */}
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : g.id)}
                  className={`group relative w-full overflow-hidden rounded-2xl border transition-all duration-300 text-left cursor-pointer ${
                    isSelected
                      ? "border-emerald-400/70 shadow-[0_0_35px_-5px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/40 z-20"
                      : "border-white/[0.08] hover:border-white/25 hover:scale-[1.01] hover:shadow-2xl z-10"
                  }`}
                >
                  {/* Background Map Artwork Image */}
                  <img
                    src={mapSplash}
                    alt={g.mapName ?? "Map"}
                    className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none opacity-70 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700 ease-out"
                  />

                  {/* Dark Vignette & Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#060b13]/80 via-[#060b13]/40 to-[#060b13]/80 pointer-events-none" />
                  <div className="absolute inset-0 bg-black/15 pointer-events-none" />

                  {/* Left Edge Neutral Strip */}
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-2xl bg-emerald-400/55 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all duration-300" />

                  {/* Tile Content Layout */}
                  <div className="relative z-10 grid h-[110px] sm:h-[130px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 sm:px-10">
                    {/* Left Side: Winner/Loser (Team A) */}
                    <div className="min-w-0">
                      <h3
                        className={`font-display text-lg sm:text-2xl font-black uppercase tracking-tight drop-shadow-md truncate max-w-full ${teamANameClass}`}
                      >
                        {g.teamAName}
                      </h3>
                    </div>

                    {/* Center: Match Score & Map Meta */}
                    <div className="flex flex-col items-center justify-center text-center min-w-[180px]">
                      {/* Map Badge */}
                      <div className="mb-1.5">
                        <span className="rounded-full bg-emerald-400/15 px-3.5 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/30 shadow-md">
                          {g.mapName ?? "VALORANT MATCH"}
                        </span>
                      </div>

                      {/* Score Display */}
                      <div className="flex items-center gap-3 sm:gap-4 font-mono font-black text-2xl sm:text-4xl tracking-tight drop-shadow-lg">
                        <span className={teamARoundsClass}>{g.teamARounds}</span>
                        <span className="text-white/25 text-xl sm:text-3xl">-</span>
                        <span className={teamBRoundsClass}>{g.teamBRounds}</span>
                      </div>

                      {/* MVP Meta */}
                      {g.mvpRiotId ? (
                        <div className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/60">
                          MVP <strong className="text-white">{parseRiotName(g.mvpRiotId).name}</strong>
                        </div>
                      ) : null}
                    </div>

                    {/* Right Side: Winner/Loser (Team B) */}
                    <div className="min-w-0 text-right">
                      <h3
                        className={`font-display text-lg sm:text-2xl font-black uppercase tracking-tight drop-shadow-md truncate max-w-full ${teamBNameClass}`}
                      >
                        {g.teamBName}
                      </h3>
                    </div>
                  </div>
                </button>

                {/* Detailed Scoreboard Drawer (Expands when tile is clicked) */}
                {isSelected && selected && selectedTeamData ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d16] shadow-2xl backdrop-blur-xl transition-all duration-500 animate-in fade-in slide-in-from-top-4">
                    {/* Scoreboard Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
                          Player Stats Breakdown · {selected.mapName ?? "Map"}
                        </span>
                        <span className="ml-2 text-xs font-medium text-white/50">
                          {selected.gameLengthSec ? formatDuration(selected.gameLengthSec) : null}
                          {selected.gameLengthSec && selected.startedAt ? " · " : null}
                          {selected.startedAt
                            ? `${new Date(selected.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} · ${new Date(selected.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                            : null}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                      >
                        Close Scoreboard
                      </button>
                    </div>

                    {/* Team Tables */}
                    <div className="p-4 sm:p-6 space-y-6">
                      {[
                        {
                          teamKey: "teamA",
                          team: selectedTeamData.teamA,
                        },
                        {
                          teamKey: "teamB",
                          team: selectedTeamData.teamB,
                        },
                      ].map(({ teamKey, team }) => (
                        <div key={teamKey} className="overflow-hidden rounded-xl border border-white/15 bg-[#060b13] shadow-lg">
                          {/* Team Section Header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] text-white border-b border-white/10">
                            <span className="font-display text-base font-black uppercase tracking-wider text-white">
                              {team.name}
                            </span>
                            <span className="font-mono text-sm font-bold text-emerald-300">
                              {team.rounds} Rounds
                            </span>
                          </div>

                          {/* Table Header & Rows */}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left border-collapse">
                              <thead>
                                <tr className="border-b border-white/[0.08] bg-[#0c1421]/90 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                                  <th className="py-3 px-4 w-[280px]">Player</th>
                                  <th
                                    className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors w-[90px]"
                                    onClick={() => handleSortHeaderClick("acs")}
                                  >
                                    <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                                      ACS {sortField === "acs" ? (sortAsc ? "▲" : "▼") : ""}
                                    </span>
                                  </th>
                                  <th
                                    className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors w-[65px]"
                                    onClick={() => handleSortHeaderClick("kills")}
                                  >
                                    K {sortField === "kills" ? (sortAsc ? "▲" : "▼") : ""}
                                  </th>
                                  <th className="py-3 px-2 text-center w-[65px]">D</th>
                                  <th className="py-3 px-2 text-center w-[65px]">A</th>
                                  <th
                                    className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors w-[85px]"
                                    onClick={() => handleSortHeaderClick("kd")}
                                  >
                                    K/D {sortField === "kd" ? (sortAsc ? "▲" : "▼") : ""}
                                  </th>
                                  <th
                                    className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors w-[85px]"
                                    onClick={() => handleSortHeaderClick("adr")}
                                  >
                                    ADR {sortField === "adr" ? (sortAsc ? "▲" : "▼") : ""}
                                  </th>
                                  <th
                                    className="py-3 px-2 text-center cursor-pointer hover:text-white transition-colors w-[80px]"
                                    onClick={() => handleSortHeaderClick("hsPercent")}
                                  >
                                    HS% {sortField === "hsPercent" ? (sortAsc ? "▲" : "▼") : ""}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.04]">
                                {team.players.map((p) => {
                                  const { name, tag } = parseRiotName(p.riotId);
                                  const kdNum = p.deaths === 0 ? p.kills : p.kills / p.deaths;
                                  const isMvp = selected.mvpRiotId === p.riotId;
                                  const agentIconUrl = getAgentIconUrl(p.agent);

                                  return (
                                    <tr
                                      key={p.id}
                                      className={`group transition-colors ${
                                        isMvp
                                          ? "bg-gradient-to-r from-emerald-500/[0.06] via-transparent to-transparent hover:bg-emerald-500/[0.1]"
                                          : "hover:bg-white/[0.04]"
                                      }`}
                                    >
                                      <td className="py-2.5 px-4">
                                        <div className="flex items-center gap-3">
                                          <div className="shrink-0">
                                            {agentIconUrl ? (
                                              <img
                                                src={agentIconUrl}
                                                alt={p.agent ?? "Agent"}
                                                className="h-10 w-10 object-contain mix-blend-screen"
                                              />
                                            ) : (
                                              <div className="flex h-10 w-10 items-center justify-center text-[10px] font-bold text-white/40">
                                                {p.agent?.slice(0, 2) ?? "??"}
                                              </div>
                                            )}
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="truncate font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                                                {name}
                                              </span>
                                              {tag ? (
                                                <span className="shrink-0 text-xs font-medium text-white/40">
                                                  {tag}
                                                </span>
                                              ) : null}
                                              {isMvp ? (
                                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300 ring-1 ring-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                                                  👑 MVP
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono font-black text-base text-emerald-300">
                                        {p.acs}
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono font-bold text-sm text-white">
                                        {p.kills}
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono text-sm text-white/60">
                                        {p.deaths}
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono text-sm text-white/60">
                                        {p.assists}
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono font-bold text-sm">
                                        <span className={kdNum >= 1.2 ? "text-emerald-400" : kdNum < 0.8 ? "text-rose-400" : "text-white/80"}>
                                          {kdNum.toFixed(1)}
                                        </span>
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono text-sm text-white/80">
                                        {p.adr.toFixed(1)}
                                      </td>

                                      <td className="py-2.5 px-2 text-center align-middle font-mono text-sm text-white/80">
                                        {Math.round(p.hsPercent)}%
                                      </td>
                                    </tr>
                                  );
                                })}

                                {team.players.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-white/35">
                                      No player records mapped for this team.
                                    </td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>
    ) : (
      <div className="rounded-2xl border border-white/10 bg-[#090e17]/80 p-8 text-center text-white/40 italic">
        No matches found matching &quot;{searchQuery}&quot;.
      </div>
    )}

    {/* View More Matches Button */}
    {filteredGames.length > visibleLimit && (
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setVisibleLimit((prev) => prev + 5)}
          className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 hover:border-white/30 transition-all shadow-md cursor-pointer"
        >
          View More Matches ({filteredGames.length - visibleLimit} remaining)
        </button>
      </div>
    )}
  </div>
);
}
