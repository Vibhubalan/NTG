"use client";

import { useState, useEffect, useRef } from "react";
import type {
  BracketMatchView,
  BracketRoundView,
  GroupStandingView,
  GroupView,
  TournamentBracketView,
} from "@core/contracts/tournament-bracket";
import { generateRoundRobinBracketFromParticipants } from "@/lib/challonge-bracket-gen";

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_W = 220; // match card width  (px)
const CARD_H = 76; // match card height (px)
const COL_GAP = 64; // horizontal gap between rounds  (px)
const ROW_GAP = 18; // min vertical gap between sibling cards (px)
const BASE_SLOT = CARD_H + ROW_GAP;

// ─── Tree Bracket Helpers ────────────────────────────────────────────────────

function computeMatchY(rounds: BracketRoundView[]): Record<string, number> {
  const computedY: Record<string, number> = {};
  if (rounds.length === 0) return computedY;

  let maxMatches = 1;
  rounds.forEach((round) => {
    if (round.matches.length > maxMatches) {
      maxMatches = round.matches.length;
    }
  });

  const totalH = maxMatches * BASE_SLOT;
  const lastCol = rounds.length - 1;

  const lastRound = rounds[lastCol];
  const lastH = totalH / Math.max(lastRound.matches.length, 1);
  lastRound.matches.forEach((match, mi) => {
    computedY[match.id] = mi * lastH + lastH / 2;
  });

  for (let col = lastCol - 1; col >= 0; col--) {
    const round = rounds[col];
    const rCount = Math.max(round.matches.length, 1);
    const defaultH = totalH / rCount;

    round.matches.forEach((match, mi) => {
      let destMatch: BracketMatchView | null = null;

      for (let dc = col + 1; dc < rounds.length; dc++) {
        const dMatch = rounds[dc].matches.find(
          (m) => m.player1PrereqMatchId === match.id || m.player2PrereqMatchId === match.id,
        );
        if (dMatch) {
          destMatch = dMatch;
          break;
        }
      }

      if (destMatch && computedY[destMatch.id] !== undefined) {
        const destY = computedY[destMatch.id];
        const p1 = destMatch.player1PrereqMatchId;
        const p2 = destMatch.player2PrereqMatchId;

        const hasBoth =
          p1 &&
          p2 &&
          round.matches.some((m) => m.id === p1) &&
          round.matches.some((m) => m.id === p2);

        if (hasBoth) {
          if (destMatch.player1PrereqMatchId === match.id) {
            computedY[match.id] = destY - defaultH / 2;
          } else {
            computedY[match.id] = destY + defaultH / 2;
          }
        } else {
          computedY[match.id] = destY;
        }
      } else {
        computedY[match.id] = mi * defaultH + defaultH / 2;
      }
    });
  }

  return computedY;
}

function findMatchCoords(rounds: BracketRoundView[], matchId: string) {
  for (let ci = 0; ci < rounds.length; ci++) {
    const round = rounds[ci];
    const mi = round.matches.findIndex((m) => m.id === matchId);
    if (mi !== -1) {
      return { col: ci, row: mi };
    }
  }
  return null;
}

function getBracketSectionHeight(rounds: BracketRoundView[], computedY: Record<string, number>) {
  let maxBottom = 0;
  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      const cy = computedY[match.id] ?? 0;
      const bottom = cy + CARD_H / 2 + ROW_GAP;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });
  });
  return Math.max(maxBottom, BASE_SLOT);
}

// ─── Match Card ──────────────────────────────────────────────────────────────

function MatchCard({
  match,
  dim,
  fluid,
}: {
  match: BracketMatchView;
  dim?: boolean;
  fluid?: boolean;
}) {
  const pending = match.state === "pending";

  return (
    <div
      className={`relative select-none overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c101b] shadow-xl transition-all duration-300 hover:border-white/20 ${
        fluid ? "w-full" : ""
      }`}
      style={{
        width: fluid ? undefined : CARD_W,
        height: CARD_H,
        opacity: dim ? 0.45 : 1,
      }}
    >
      {/* Horizontal divider between slots */}
      <div className="absolute left-2 right-8 top-[38px] h-px bg-white/[0.06]" />

      {/* Slots wrapper */}
      <div className="flex h-full flex-col">
        {match.slots.map((slot, idx) => {
          const winner = !pending && slot.isWinner;
          return (
            <div key={idx} className="relative flex h-[38px] items-center pl-2.5 pr-0">
              {/* Seed pill */}
              <span className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded bg-white/[0.06] text-[8px] font-bold text-white/40 tabular-nums mr-1.5">
                {slot.seed ?? "·"}
              </span>

              {/* Team name */}
              <span
                className={`min-w-0 flex-1 text-[10px] sm:text-[11px] leading-snug uppercase tracking-wide pr-1.5 line-clamp-2 ${
                  winner
                    ? "font-extrabold text-white"
                    : pending
                      ? "font-normal text-white/20 italic"
                      : "font-semibold text-white/40"
                }`}
                title={slot.name || "TBD"}
              >
                {slot.name || "TBD"}
              </span>

              {/* Score Box */}
              <div
                className={`flex h-full w-8 shrink-0 items-center justify-center text-xs sm:text-sm font-black tabular-nums ${
                  idx === 0 ? "rounded-tr-xl" : "rounded-br-xl"
                } ${
                  winner ? "bg-[#22c55e] text-[#070a12]" : "bg-white/[0.04] text-white/30"
                }`}
              >
                {pending ? "" : slot.score}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SVG Connectors ──────────────────────────────────────────────────────────

function Connectors({
  rounds,
  totalH,
  computedY,
}: {
  rounds: BracketRoundView[];
  totalH: number;
  computedY: Record<string, number>;
}) {
  const svgW = rounds.length * (CARD_W + COL_GAP) - COL_GAP;
  const lines: React.ReactNode[] = [];

  rounds.forEach((round, ci) => {
    round.matches.forEach((match, mi) => {
      const destCY = computedY[match.id] ?? 0;
      const destX = ci * (CARD_W + COL_GAP);

      const checkPrereq = (
        prereqId: string | null | undefined,
        isSlot1: boolean,
        fallbackMatchId?: string,
      ) => {
        let targetId = prereqId || fallbackMatchId;
        let src = targetId ? findMatchCoords(rounds, targetId) : null;

        if (!src && fallbackMatchId) {
          targetId = fallbackMatchId;
          src = findMatchCoords(rounds, targetId);
        }

        if (!src || !targetId) return;

        const srcX = src.col * (CARD_W + COL_GAP) + CARD_W;
        const srcCY = computedY[targetId] ?? 0;
        const midX = srcX + (destX - srcX) / 2;

        const keySuffix = `${match.id}-${targetId}-${isSlot1 ? "s1" : "s2"}`;

        lines.push(
          <path
            key={`glow-${keySuffix}`}
            d={`M ${srcX} ${srcCY} H ${midX} V ${destCY} H ${destX}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth={4}
            opacity={0.15}
          />,
          <path
            key={`line-${keySuffix}`}
            d={`M ${srcX} ${srcCY} H ${midX} V ${destCY} H ${destX}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            opacity={0.85}
          />,
        );
      };

      const prevRound = ci > 0 ? rounds[ci - 1] : null;
      const fallbackP1Id =
        prevRound && round.side !== "losers"
          ? prevRound.matches[2 * mi]?.id
          : undefined;
      const fallbackP2Id =
        prevRound && round.side !== "losers"
          ? prevRound.matches[2 * mi + 1]?.id
          : undefined;

      checkPrereq(match.player1PrereqMatchId, true, fallbackP1Id);
      checkPrereq(match.player2PrereqMatchId, false, fallbackP2Id);
    });
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={svgW}
      height={totalH}
      style={{ overflow: "visible" }}
    >
      {lines}
    </svg>
  );
}

// ─── One Bracket Section ─────────────────────────────────────────────────────

function BracketSection({ rounds }: { rounds: BracketRoundView[] }) {
  if (rounds.length === 0) return null;

  const computedY = computeMatchY(rounds);
  const totalH = getBracketSectionHeight(rounds, computedY);
  const totalW = rounds.length * (CARD_W + COL_GAP) - COL_GAP;

  return (
    <div style={{ position: "relative", height: totalH, width: totalW, minWidth: totalW }}>
      <Connectors rounds={rounds} totalH={totalH} computedY={computedY} />

      {rounds.map((round, ci) =>
        round.matches.map((match) => {
          const cy = computedY[match.id] ?? 0;
          const topY = cy - CARD_H / 2;
          const leftX = ci * (CARD_W + COL_GAP);
          return (
            <div
              key={`${round.id}--${match.id}`}
              className="absolute"
              style={{ top: topY, left: leftX }}
            >
              <MatchCard match={match} />
            </div>
          );
        }),
      )}
    </div>
  );
}

// ─── Round Header Row ────────────────────────────────────────────────────────

function RoundHeaders({ rounds }: { rounds: BracketRoundView[] }) {
  return (
    <div className="mb-6 flex" style={{ gap: COL_GAP }}>
      {rounds.map((r) => (
        <div
          key={r.id}
          className="flex shrink-0 items-center justify-center rounded-xl py-2.5 px-4"
          style={{
            width: CARD_W,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function computeGroupHistoryAndStats(group: GroupView): GroupStandingView[] {
  const standings = group.standings.map((s) => {
    const history: ("W" | "L" | "T")[] = [];
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let ptsDiff = 0;
    let totalScore = 0;

    group.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        if (match.state !== "complete") return;
        const p1 = match.slots[0];
        const p2 = match.slots[1];
        if (!p1 || !p2) return;

        const isP1 = p1.name.trim().toLowerCase() === s.name.trim().toLowerCase();
        const isP2 = p2.name.trim().toLowerCase() === s.name.trim().toLowerCase();

        if (!isP1 && !isP2) return;

        const s1 = Number(p1.score) || 0;
        const s2 = Number(p2.score) || 0;

        if (isP1) {
          ptsDiff += s1 - s2;
          totalScore += s1;
          if (p1.isWinner) {
            history.push("W");
            wins++;
          } else if (p2.isWinner) {
            history.push("L");
            losses++;
          } else if (s1 === s2 && s1 > 0) {
            history.push("T");
            ties++;
          }
        } else if (isP2) {
          ptsDiff += s2 - s1;
          totalScore += s2;
          if (p2.isWinner) {
            history.push("W");
            wins++;
          } else if (p1.isWinner) {
            history.push("L");
            losses++;
          } else if (s1 === s2 && s1 > 0) {
            history.push("T");
            ties++;
          }
        }
      });
    });

    const calculatedPts = s.pts > 0 ? s.pts : totalScore > 0 ? totalScore : wins * 3 + ties * 1;
    const matchRecord =
      wins > 0 || losses > 0 || ties > 0
        ? `${wins} - ${losses} - ${ties}`
        : s.matchRecord || "0 - 0 - 0";

    return {
      ...s,
      matchRecord,
      ptsDiff: s.ptsDiff !== 0 ? s.ptsDiff : ptsDiff,
      pts: calculatedPts,
      setWins: s.setWins || wins,
      setTies: s.setTies || ties,
      matchHistory: s.matchHistory && s.matchHistory.length > 0 ? s.matchHistory : history,
    };
  });

  standings.sort((a, b) => {
    if (a.rank > 0 && b.rank > 0 && a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    if (a.rank > 0 && (!b.rank || b.rank === 0)) return -1;
    if (b.rank > 0 && (!a.rank || a.rank === 0)) return 1;
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.ptsDiff !== a.ptsDiff) return b.ptsDiff - a.ptsDiff;
    if (b.setWins !== a.setWins) return b.setWins - a.setWins;
    return 0;
  });

  return standings.map((s, idx) => ({ ...s, rank: s.rank > 0 ? s.rank : idx + 1 }));
}

function extractParticipantsFromBracket(
  bracket: TournamentBracketView,
  fallbackTeams?: string[],
): string[] {
  if (bracket.participants && bracket.participants.length > 0) {
    return bracket.participants;
  }
  if (bracket.finalStandings && bracket.finalStandings.length > 0) {
    return bracket.finalStandings.map((s) => s.name);
  }

  const names = new Set<string>();
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      for (const slot of match.slots) {
        if (slot.name && slot.name !== "TBD" && slot.name !== "BYE") {
          names.add(slot.name);
        }
      }
    }
  }
  if (names.size > 0) {
    return Array.from(names);
  }

  return fallbackTeams && fallbackTeams.length > 0 ? fallbackTeams : [];
}

function RoundRobinBracketView({
  bracket,
  tournamentName,
  stageName,
  format,
  fallbackTeams,
}: {
  bracket: TournamentBracketView;
  tournamentName?: string;
  stageName?: string | null;
  format?: string;
  fallbackTeams?: string[];
}) {
  const fallbackList = extractParticipantsFromBracket(bracket, fallbackTeams);

  let groups: GroupView[] = [];
  if (
    bracket.groups &&
    bracket.groups.length > 0 &&
    bracket.groups.some((g) => g.standings.length > 0)
  ) {
    groups = bracket.groups;
  } else if (bracket.rounds && bracket.rounds.length > 0) {
    groups = [
      {
        id: "group-a",
        name: "Group A",
        standings: fallbackList.map((name) => ({
          rank: 0,
          name,
          matchRecord: "0 - 0 - 0",
          ptsDiff: 0,
          pts: 0,
          tb: 0,
          setWins: 0,
          setTies: 0,
          matchHistory: [],
        })),
        rounds: bracket.rounds,
      },
    ];
  } else if (fallbackList.length >= 6) {
    const generated = generateRoundRobinBracketFromParticipants(
      fallbackList.map((name, idx) => ({ seed: idx + 1, name })),
      tournamentName || bracket.tournamentName || "Round Robin",
    );
    groups = generated.groups && generated.groups.length > 0 ? generated.groups : [];
  } else if (fallbackList.length > 0) {
    groups = [
      {
        id: "group-a",
        name: "Group A",
        standings: fallbackList.map((name, idx) => ({
          rank: idx + 1,
          name,
          matchRecord: "0 - 0 - 0",
          ptsDiff: 0,
          pts: 0,
          tb: 0,
          setWins: 0,
          setTies: 0,
          matchHistory: [],
        })),
        rounds: bracket.rounds,
      },
    ];
  } else {
    groups = [
      {
        id: "group-a",
        name: "Group A",
        standings: [],
        rounds: bracket.rounds,
      },
    ];
  }

  const [mainTab, setMainTab] = useState<"standings" | "matches">("standings");

  return (
    <div className="space-y-8">
      {/* Stage Shell */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070a12] p-6 sm:p-8 shadow-2xl">
        {/* Header & Main View Switcher: Standings | Matches */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#22c55e]">
              {stageName || "GROUP STAGE"}
            </span>
            <h3 className="mt-1 font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white">
              {tournamentName || bracket.tournamentName || "TOURNAMENT QUALIFIERS"}
            </h3>
            <p className="mt-1 text-xs font-medium text-white/40">
              {format || "Round Robin"}
            </p>
          </div>

          {/* STANDINGS | MATCHES Main Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06] w-fit">
            <button
              type="button"
              onClick={() => setMainTab("standings")}
              className={`rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
                mainTab === "standings"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Standings
            </button>
            <button
              type="button"
              onClick={() => setMainTab("matches")}
              className={`rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
                mainTab === "matches"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Score
            </button>
          </div>
        </div>

        {/* Group Cards Container */}
        <div className="mt-8 space-y-10">
          {groups.map((group) => {
            const computedStandings = computeGroupHistoryAndStats(group);

            return (
              <div
                key={group.id}
                className="rounded-xl border border-white/[0.08] bg-[#0c101b]/70 p-6 shadow-xl"
              >
                {/* Group Title */}
                <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                    <h4 className="font-display text-lg font-black uppercase tracking-wide text-white">
                      {group.name}
                    </h4>
                  </div>
                </div>

                {/* Sub-View Content: Standings or Matches */}
                {mainTab === "standings" ? (
                  /* Standings Table */
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070a12]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-white/40">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Participant</th>
                          <th className="py-3 px-4 text-center">Match W-L-T</th>
                          <th className="py-3 px-4 text-center">Pts Diff</th>
                          <th className="py-3 px-4 text-center">Pts</th>
                          <th className="py-3 px-4 text-center">TB</th>
                          <th className="py-3 px-4 text-center">Set Wins</th>
                          <th className="py-3 px-4 text-center">Set Ties</th>
                          <th className="py-3 px-4 text-center">Match History</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {computedStandings.length > 0 ? (
                          computedStandings.map((row, idx) => (
                            <tr
                              key={idx}
                              className="transition-colors hover:bg-white/[0.02]"
                            >
                              <td className="py-3.5 px-4 font-bold text-white/80 tabular-nums">
                                {row.rank}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold uppercase tracking-wide text-white">
                                {row.name}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold text-white/70 tabular-nums">
                                {row.matchRecord}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold text-white/60 tabular-nums">
                                {row.ptsDiff > 0 ? `+${row.ptsDiff}` : row.ptsDiff}
                              </td>
                              <td className="py-3.5 px-4 text-center font-black text-[#22c55e] tabular-nums text-sm">
                                {row.pts}
                              </td>
                              <td className="py-3.5 px-4 text-center text-white/40 tabular-nums">
                                {row.tb}
                              </td>
                              <td className="py-3.5 px-4 text-center text-white/50 tabular-nums">
                                {row.setWins}
                              </td>
                              <td className="py-3.5 px-4 text-center text-white/50 tabular-nums">
                                {row.setTies}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {row.matchHistory && row.matchHistory.length > 0 ? (
                                    row.matchHistory.map((res, hIdx) => (
                                      <span
                                        key={hIdx}
                                        className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-black uppercase shadow-sm ${
                                          res === "W"
                                            ? "bg-[#22c55e] text-[#070a12]"
                                            : res === "L"
                                              ? "bg-rose-500/80 text-white"
                                              : "bg-amber-500/80 text-white"
                                        }`}
                                      >
                                        {res}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-white/20">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-white/40 italic">
                              No team standings available yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Matches Grid: Round 1 to 5 grid (Displays full names clearly) */
                  <div className="overflow-x-auto pb-2">
                    <div className="grid min-w-[900px] grid-cols-5 gap-3 sm:gap-4">
                      {group.rounds.map((round) => (
                        <div key={round.id} className="min-w-0 space-y-3">
                          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] py-2 px-2 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                              {round.label}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {round.matches.map((match) => (
                              <MatchCard key={match.id} match={match} fluid />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

type Props = {
  bracket: TournamentBracketView;
  accentHex?: string;
  tournamentName?: string;
  stageName?: string | null;
  format?: string;
  fallbackTeams?: string[];
};

type MatchPosition = {
  col: number;
  topY: number;
  cy: number;
};

function computeUnifiedBracketLayout(rounds: BracketRoundView[]) {
  const winnersRounds = rounds.filter((r) => r.side === "winners");
  const losersRounds = rounds.filter((r) => r.side === "losers");
  const finalRounds = rounds.filter((r) => r.side === "final");

  const posMap: Record<string, MatchPosition> = {};
  const HEADER_OFFSET = 64;

  // 1. Position Winners rounds
  const winnersY = computeMatchY(winnersRounds);
  const maxWinnersH =
    winnersRounds.length > 0 ? getBracketSectionHeight(winnersRounds, winnersY) : 0;

  winnersRounds.forEach((round, ci) => {
    round.matches.forEach((match) => {
      const cy = (winnersY[match.id] ?? 0) + HEADER_OFFSET;
      posMap[match.id] = {
        col: ci,
        topY: cy - CARD_H / 2,
        cy,
      };
    });
  });

  // 2. Position Losers rounds (stacked below Winners)
  const losersY = computeMatchY(losersRounds);
  const losersYOffset = losersRounds.length > 0 ? maxWinnersH + 110 : 0;
  const maxLosersH =
    losersRounds.length > 0 ? getBracketSectionHeight(losersRounds, losersY) : 0;

  losersRounds.forEach((round, ci) => {
    round.matches.forEach((match) => {
      const cy = (losersY[match.id] ?? 0) + losersYOffset + HEADER_OFFSET;
      posMap[match.id] = {
        col: ci,
        topY: cy - CARD_H / 2,
        cy,
      };
    });
  });

  // 3. Position Finals rounds (placed in rightmost column)
  const maxPrevCol = Math.max(winnersRounds.length, losersRounds.length, 1);
  const finalCol = maxPrevCol;
  const totalTreeHeight = maxWinnersH + (losersRounds.length > 0 ? 110 + maxLosersH : 0);
  const defaultFinalCy = (totalTreeHeight > 0 ? totalTreeHeight / 2 : 100) + HEADER_OFFSET;

  finalRounds.forEach((round) => {
    round.matches.forEach((match, mi) => {
      const cy = defaultFinalCy + mi * (CARD_H + 32);
      posMap[match.id] = {
        col: finalCol,
        topY: cy - CARD_H / 2,
        cy,
      };
    });
  });

  const totalCols = finalRounds.length > 0 ? finalCol + 1 : maxPrevCol;
  const totalW = totalCols * (CARD_W + COL_GAP) - COL_GAP;
  const totalH = Math.max(totalTreeHeight + HEADER_OFFSET + 40, 200);

  return {
    posMap,
    totalCols,
    totalW,
    totalH,
    winnersRounds,
    losersRounds,
    finalRounds,
    maxWinnersH,
    losersYOffset: losersYOffset + HEADER_OFFSET,
  };
}

function UnifiedConnectors({
  rounds,
  posMap,
  totalW,
  totalH,
}: {
  rounds: BracketRoundView[];
  posMap: Record<string, MatchPosition>;
  totalW: number;
  totalH: number;
}) {
  const winnersRounds = rounds.filter((r) => r.side === "winners");
  const losersRounds = rounds.filter((r) => r.side === "losers");
  const lines: React.ReactNode[] = [];

  rounds.forEach((round) => {
    round.matches.forEach((match, mi) => {
      const destPos = posMap[match.id];
      if (!destPos) return;
      const destCY = destPos.cy;
      const destX = destPos.col * (CARD_W + COL_GAP);

      const checkPrereq = (
        prereqId: string | null | undefined,
        isSlot1: boolean,
        fallbackMatchId?: string,
      ) => {
        let targetId = prereqId || fallbackMatchId;
        let srcPos = targetId ? posMap[targetId] : null;

        if (!srcPos && fallbackMatchId) {
          targetId = fallbackMatchId;
          srcPos = targetId ? posMap[targetId] : null;
        }

        if (!srcPos || !targetId) return;

        const srcX = srcPos.col * (CARD_W + COL_GAP) + CARD_W;
        const srcCY = srcPos.cy;
        const midX = srcX + (destX - srcX) / 2;

        const keySuffix = `${match.id}-${targetId}-${isSlot1 ? "s1" : "s2"}`;

        lines.push(
          <path
            key={`glow-${keySuffix}`}
            d={`M ${srcX} ${srcCY} H ${midX} V ${destCY} H ${destX}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth={4}
            opacity={0.15}
          />,
          <path
            key={`line-${keySuffix}`}
            d={`M ${srcX} ${srcCY} H ${midX} V ${destCY} H ${destX}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            opacity={0.85}
          />,
        );
      };

      if (round.side === "final") {
        const fallbackP1Id = winnersRounds[winnersRounds.length - 1]?.matches[0]?.id;
        const fallbackP2Id = losersRounds[losersRounds.length - 1]?.matches[0]?.id;
        checkPrereq(match.player1PrereqMatchId, true, fallbackP1Id);
        checkPrereq(match.player2PrereqMatchId, false, fallbackP2Id);
      } else {
        const prevRoundSameSide =
          round.side === "winners"
            ? winnersRounds[winnersRounds.indexOf(round) - 1]
            : losersRounds[losersRounds.indexOf(round) - 1];

        const fallbackP1Id = prevRoundSameSide?.matches[2 * mi]?.id;
        const fallbackP2Id = prevRoundSameSide?.matches[2 * mi + 1]?.id;

        checkPrereq(match.player1PrereqMatchId, true, fallbackP1Id);
        checkPrereq(match.player2PrereqMatchId, false, fallbackP2Id);
      }
    });
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={totalW}
      height={totalH}
      style={{ overflow: "visible" }}
    >
      {lines}
    </svg>
  );
}

function EliminationBracketView({
  bracket,
  accentHex = "#22c55e",
  tournamentName,
  stageName,
  format,
}: {
  bracket: TournamentBracketView;
  accentHex?: string;
  tournamentName?: string;
  stageName?: string | null;
  format?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const {
    posMap,
    totalW,
    totalH,
    winnersRounds,
    losersRounds,
    finalRounds,
    losersYOffset,
  } = computeUnifiedBracketLayout(bracket.rounds);

  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth && containerWidth < totalW ? containerWidth / totalW : 1;
  const headerCols = [...winnersRounds, ...finalRounds];

  return (
    <div>
      {/* Bracket Shell */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070a12] p-6 sm:p-8 shadow-2xl">
        {/* Inner Card Header */}
        <div className="mb-8 border-b border-white/[0.06] pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#22c55e]">
              {stageName || "BRACKET"}
            </span>
            <h3 className="mt-1 font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white">
              {tournamentName || "TOURNAMENT BRACKET"}
            </h3>
            <p className="mt-1 text-xs font-medium text-white/40">
              {format ||
                (bracket.tournamentType
                  ? bracket.tournamentType.replace(/_/g, " ")
                  : "Single Elimination")}
            </p>
          </div>
        </div>

        {/* Bracket Content Area (Unified Single Canvas View) */}
        <div ref={containerRef} className="w-full overflow-x-auto pb-4">
          <div
            style={{
              height: totalH * scale,
              width: "100%",
              minWidth: totalW * scale,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: totalW,
                height: totalH,
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {/* Round Headers Row (Winners + Finals) */}
              <div className="mb-6 flex" style={{ gap: COL_GAP }}>
                {headerCols.map((r) => (
                  <div
                    key={r.id}
                    className="flex shrink-0 items-center justify-center rounded-xl py-2.5 px-4"
                    style={{
                      width: CARD_W,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Losers Headers Row (if losers rounds exist) */}
              {losersRounds.length > 0 && (
                <div
                  className="absolute flex"
                  style={{ top: losersYOffset - 40, gap: COL_GAP }}
                >
                  {losersRounds.map((r) => (
                    <div
                      key={r.id}
                      className="flex shrink-0 items-center justify-center rounded-xl py-2 px-4"
                      style={{
                        width: CARD_W,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                        {r.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Connecting Lines Canvas */}
              <UnifiedConnectors
                rounds={bracket.rounds}
                posMap={posMap}
                totalW={totalW}
                totalH={totalH}
              />

              {/* Match Cards Placement */}
              {bracket.rounds.map((round) =>
                round.matches.map((match) => {
                  const pos = posMap[match.id];
                  if (!pos) return null;
                  const leftX = pos.col * (CARD_W + COL_GAP);

                  return (
                    <div
                      key={`${round.id}--${match.id}`}
                      className="absolute"
                      style={{ top: pos.topY, left: leftX }}
                    >
                      <MatchCard match={match} />
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function TournamentBracket({
  bracket,
  accentHex = "#22c55e",
  tournamentName,
  stageName,
  format,
  fallbackTeams,
}: Props) {
  const isRoundRobinFormat = Boolean(
    (format && format.toLowerCase().includes("round")) ||
      (bracket.tournamentType && bracket.tournamentType.toLowerCase().includes("round")) ||
      (stageName && stageName.toLowerCase().includes("round")),
  );

  const hasGroups = Boolean(bracket.groups && bracket.groups.length > 0);
  const isRoundRobin = isRoundRobinFormat || hasGroups;

  const hasPlayoffRounds =
    !isRoundRobinFormat &&
    Boolean(bracket.rounds && bracket.rounds.length > 0) &&
    bracket.rounds.some((r) =>
      r.matches.some(
        (m) =>
          m.state === "complete" ||
          m.state === "open" ||
          m.slots.some(
            (s) =>
              s.name &&
              s.name.trim() !== "" &&
              s.name.trim().toUpperCase() !== "TBD",
          ),
      ),
    );

  const [activeStage, setActiveStage] = useState<"groups" | "playoffs">(() => {
    if (hasGroups && hasPlayoffRounds && bracket.rounds.some((r) => r.matches.some((m) => m.state === "complete"))) {
      return "playoffs";
    }
    return isRoundRobin ? "groups" : "playoffs";
  });

  if (isRoundRobin && !hasPlayoffRounds) {
    return (
      <RoundRobinBracketView
        bracket={bracket}
        tournamentName={tournamentName}
        stageName={stageName}
        format={format}
        fallbackTeams={fallbackTeams}
      />
    );
  }

  if (hasGroups && hasPlayoffRounds) {
    return (
      <div className="space-y-6">
        {/* Stage Navigator Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#070a12] p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#22c55e]">
                Tournament Stages
              </span>
              <p className="text-xs font-bold text-white">
                {activeStage === "groups" ? "Stage 1: Group Stage" : "Stage 2: Playoff Bracket"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveStage("groups")}
              className={`rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeStage === "groups"
                  ? "bg-[#22c55e] text-[#070a12] shadow-md shadow-emerald-500/20"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Group Stage
            </button>
            <button
              type="button"
              onClick={() => setActiveStage("playoffs")}
              className={`rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                activeStage === "playoffs"
                  ? "bg-[#22c55e] text-[#070a12] shadow-md shadow-emerald-500/20"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Playoff Bracket
            </button>
          </div>
        </div>

        {activeStage === "groups" ? (
          <RoundRobinBracketView
            bracket={bracket}
            tournamentName={tournamentName}
            stageName={stageName || "STAGE 1 — GROUP STAGE"}
            format={format || "Round Robin"}
            fallbackTeams={fallbackTeams}
          />
        ) : (
          <EliminationBracketView
            bracket={bracket}
            accentHex={accentHex}
            tournamentName={tournamentName}
            stageName={stageName || "STAGE 2 — PLAYOFF BRACKET"}
            format={format || bracket.tournamentType}
          />
        )}
      </div>
    );
  }

  return (
    <EliminationBracketView
      bracket={bracket}
      accentHex={accentHex}
      tournamentName={tournamentName}
      stageName={stageName}
      format={format}
    />
  );
}
