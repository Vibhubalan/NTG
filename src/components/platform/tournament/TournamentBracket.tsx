"use client";

import { useState, useEffect, useRef } from "react";
import type {
  BracketMatchView,
  BracketRoundView,
  TournamentBracketView,
} from "@core/contracts/tournament-bracket";

// ─── Layout constants ────────────────────────────────────────────────────────
const CARD_W = 220;   // match card width  (px)
const CARD_H = 76;    // match card height (px)
const COL_GAP = 72;   // horizontal gap between rounds  (px)
const ROW_GAP = 20;   // min vertical gap between sibling cards (px)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** base slot = card + gap so adjacent cards in R0 don't touch */
const BASE_SLOT = CARD_H + ROW_GAP;

/** slot height for column[i]: doubles every round */
function computeMatchY(rounds: BracketRoundView[]): Record<string, number> {
  const computedY: Record<string, number> = {};
  if (rounds.length === 0) return computedY;

  // Find max matches in any round to define total height
  let maxMatches = 1;
  rounds.forEach((round) => {
    if (round.matches.length > maxMatches) {
      maxMatches = round.matches.length;
    }
  });

  const totalH = maxMatches * BASE_SLOT;
  const lastCol = rounds.length - 1;

  // Position last column matches evenly
  const lastRound = rounds[lastCol];
  const lastH = totalH / Math.max(lastRound.matches.length, 1);
  lastRound.matches.forEach((match, mi) => {
    computedY[match.id] = mi * lastH + lastH / 2;
  });

  // Walk backwards from lastCol - 1 down to 0
  for (let col = lastCol - 1; col >= 0; col--) {
    const round = rounds[col];
    const rCount = Math.max(round.matches.length, 1);
    const defaultH = totalH / rCount;

    round.matches.forEach((match, mi) => {
      // Find if this match is a prerequisite for any match in subsequent columns
      let destMatch: BracketMatchView | null = null;

      for (let dc = col + 1; dc < rounds.length; dc++) {
        const dMatch = rounds[dc].matches.find(
          (m) => m.player1PrereqMatchId === match.id || m.player2PrereqMatchId === match.id
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

        const hasBoth = p1 && p2 && 
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
        // Fallback to default even spacing
        computedY[match.id] = mi * defaultH + defaultH / 2;
      }
    });
  }

  return computedY;
}

/** find coordinates of a match in the rounds array */
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

/** calculate the exact required section height based on last match bottom Y */
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
  accent,
  dim,
}: {
  match: BracketMatchView;
  accent: string;
  dim?: boolean;
}) {
  const pending = match.state === "pending";
  const open    = match.state === "open";

  return (
    <div
      className="relative select-none overflow-hidden transition-opacity duration-300"
      style={{
        width:  CARD_W,
        height: CARD_H,
        opacity: dim ? 0.45 : 1,
      }}
    >
      {/* card shell */}
      <div
        className="absolute inset-0 rounded-xl border"
        style={{
          background: "linear-gradient(160deg,#151825 0%,#0f1119 100%)",
          borderColor: open
            ? `${accent}60`
            : "rgba(255,255,255,0.07)",
          boxShadow: open
            ? `0 0 18px -4px ${accent}40, inset 0 1px 0 rgba(255,255,255,0.06)`
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      />

      {/* left accent bar */}
      <span
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{
          background: pending
            ? "rgba(255,255,255,0.08)"
            : open
              ? `linear-gradient(180deg,${accent},${accent}88)`
              : `${accent}55`,
        }}
      />

      {/* divider */}
      <div
        className="absolute left-3 right-0"
        style={{
          top: CARD_H / 2,
          height: 1,
          background: "rgba(255,255,255,0.055)",
        }}
      />

      {/* slots */}
      <div className="absolute inset-0 flex flex-col pl-[14px]">
        {match.slots.map((slot, idx) => {
          const winner = !pending && slot.isWinner;
          return (
            <div
              key={idx}
              className="flex flex-1 items-center gap-2 pr-[3px]"
            >
              {/* seed pill */}
              <span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[9px] font-bold tabular-nums"
                style={{
                  background: winner ? `${accent}28` : "rgba(255,255,255,0.05)",
                  color: winner ? accent : "rgba(255,255,255,0.28)",
                }}
              >
                {slot.seed ?? "·"}
              </span>

              {/* team name */}
              <span
                className="min-w-0 flex-1 truncate text-[12px] font-semibold uppercase tracking-wide"
                style={{
                  color: pending
                    ? "rgba(255,255,255,0.22)"
                    : winner
                      ? "#ffffff"
                      : "rgba(255,255,255,0.52)",
                  fontStyle: pending ? "italic" : "normal",
                }}
              >
                {slot.name || "TBD"}
              </span>

              {/* score box */}
              <div
                className="flex h-full w-9 shrink-0 items-center justify-center rounded-r-xl text-[13px] font-black tabular-nums"
                style={{
                  background: winner
                    ? `${accent}22`
                    : "rgba(255,255,255,0.03)",
                  color: winner
                    ? accent
                    : "rgba(255,255,255,0.22)",
                  borderLeft: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {pending ? "" : slot.score}
              </div>
            </div>
          );
        })}
      </div>

      {/* match-number badge */}
      {match.matchNumber != null && (
        <span
          className="absolute right-10 top-0 rounded-b px-1.5 py-px text-[8px] font-bold uppercase tracking-wide"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.18)",
          }}
        >
          M{match.matchNumber}
        </span>
      )}
    </div>
  );
}

// ─── SVG Connectors ──────────────────────────────────────────────────────────

function Connectors({
  rounds,
  accent,
  totalH,
  computedY,
}: {
  rounds: BracketRoundView[];
  accent: string;
  totalH: number;
  computedY: Record<string, number>;
}) {
  const svgW = rounds.length * (CARD_W + COL_GAP) - COL_GAP;
  const lines: React.ReactNode[] = [];

  rounds.forEach((round, ci) => {
    round.matches.forEach((match) => {
      const destCY = computedY[match.id] ?? 0;
      const destX = ci * (CARD_W + COL_GAP);

      const checkPrereq = (prereqId: string | null | undefined, isSlot1: boolean) => {
        if (!prereqId) return;
        const src = findMatchCoords(rounds, prereqId);
        if (!src) return;

        const srcX = src.col * (CARD_W + COL_GAP) + CARD_W;
        const srcCY = computedY[prereqId] ?? 0;
        const midX = srcX + (destX - srcX) / 2;

        const stroke = accent;
        const sw = 2;
        const keySuffix = `${match.id}-${prereqId}-${isSlot1 ? "s1" : "s2"}`;

        lines.push(
          // Glow background lines
          <line
            key={`h1-glow-${keySuffix}`}
            x1={srcX}
            y1={srcCY}
            x2={midX}
            y2={srcCY}
            stroke={stroke}
            strokeWidth={sw * 2.5}
            opacity={0.15}
          />,
          <line
            key={`v-glow-${keySuffix}`}
            x1={midX}
            y1={srcCY}
            x2={midX}
            y2={destCY}
            stroke={stroke}
            strokeWidth={sw * 2.5}
            opacity={0.15}
          />,
          <line
            key={`h2-glow-${keySuffix}`}
            x1={midX}
            y1={destCY}
            x2={destX}
            y2={destCY}
            stroke={stroke}
            strokeWidth={sw * 2.5}
            opacity={0.15}
          />,

          // Main solid lines
          <line
            key={`h1-${keySuffix}`}
            x1={srcX}
            y1={srcCY}
            x2={midX}
            y2={srcCY}
            stroke={stroke}
            strokeWidth={sw}
            opacity={0.75}
          />,
          <line
            key={`v-${keySuffix}`}
            x1={midX}
            y1={srcCY}
            x2={midX}
            y2={destCY}
            stroke={stroke}
            strokeWidth={sw}
            opacity={0.75}
          />,
          <line
            key={`h2-${keySuffix}`}
            x1={midX}
            y1={destCY}
            x2={destX}
            y2={destCY}
            stroke={stroke}
            strokeWidth={sw}
            opacity={0.75}
          />,

          // Glowing exit dots
          <circle
            key={`dot-glow-${keySuffix}`}
            cx={srcX}
            cy={srcCY}
            r={4.5}
            fill={stroke}
            opacity={0.35}
          />,
          <circle
            key={`dot-${keySuffix}`}
            cx={srcX}
            cy={srcCY}
            r={2}
            fill="#ffffff"
            opacity={0.9}
          />
        );
      };

      checkPrereq(match.player1PrereqMatchId, true);
      checkPrereq(match.player2PrereqMatchId, false);
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

// ─── One bracket section (winners / losers) ───────────────────────────────

function BracketSection({
  rounds,
  accent,
}: {
  rounds: BracketRoundView[];
  accent: string;
}) {
  if (rounds.length === 0) return null;

  const computedY = computeMatchY(rounds);
  const totalH  = getBracketSectionHeight(rounds, computedY);
  const totalW  = rounds.length * (CARD_W + COL_GAP) - COL_GAP;

  return (
    <div style={{ position: "relative", height: totalH, width: totalW, minWidth: totalW }}>
      <Connectors rounds={rounds} accent={accent} totalH={totalH} computedY={computedY} />

      {rounds.map((round, ci) =>
        round.matches.map((match) => {
          const cy   = computedY[match.id] ?? 0;
          const topY = cy - CARD_H / 2;
          const leftX = ci * (CARD_W + COL_GAP);
          return (
            <div
              key={`${round.id}--${match.id}`}
              className="absolute"
              style={{ top: topY, left: leftX }}
            >
              <MatchCard match={match} accent={accent} />
            </div>
          );
        }),
      )}
    </div>
  );
}

// ─── Round header row ─────────────────────────────────────────────────────

function RoundHeaders({ rounds }: { rounds: BracketRoundView[] }) {
  return (
    <div className="mb-3 flex" style={{ gap: COL_GAP }}>
      {rounds.map((r) => (
        <div
          key={r.id}
          className="flex shrink-0 items-center justify-center rounded-lg py-1.5"
          style={{
            width: CARD_W,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────

function SectionLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="h-px w-5 rounded-full"
        style={{ background: accent }}
      />
      <span
        className="text-[10px] font-black uppercase tracking-[0.35em]"
        style={{ color: `${accent}99` }}
      >
        {label}
      </span>
      <span
        className="h-px flex-1"
        style={{ background: `linear-gradient(90deg,${accent}40,transparent)` }}
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────

type Props = {
  bracket: TournamentBracketView;
  accentHex?: string;
};

export default function TournamentBracket({
  bracket,
  accentHex = "#f97316",
}: Props) {
  const [tab, setTab] = useState<"winners" | "losers">("winners");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const winners = bracket.rounds.filter(
    (r) => r.side === "winners" || r.side === "final",
  );
  const losers = bracket.rounds.filter((r) => r.side === "losers");
  const hasLosers = losers.length > 0;

  const accent = accentHex;

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

  const activeRounds = (!hasLosers || tab === "winners") ? winners : losers;
  const computedY = computeMatchY(activeRounds);
  const totalW = activeRounds.length * (CARD_W + COL_GAP) - COL_GAP;
  const bracketH = getBracketSectionHeight(activeRounds, computedY);
  const totalH = bracketH + 54;

  const scale = containerWidth && containerWidth < totalW ? containerWidth / totalW : 1;

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        background: "#090c14",
        borderColor: "rgba(255,255,255,0.07)",
        boxShadow: `0 0 60px -20px ${accent}25, 0 40px 80px -30px rgba(0,0,0,0.7)`,
      }}
    >
      {/* ── header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.35em]"
            style={{ color: `${accent}99` }}
          >
            Bracket
          </p>
          <p className="mt-1 font-display text-xl font-bold text-white">
            {bracket.tournamentName}
          </p>
          <p
            className="mt-0.5 text-[11px] capitalize"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {bracket.tournamentType.replace(/_/g, " ")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* tabs — only show when there are losers rounds */}
          {hasLosers && (
            <div
              className="flex rounded-xl p-1"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {(["winners", "losers"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="rounded-lg px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] transition-all"
                  style={{
                    background: tab === t ? accent : "transparent",
                    color: tab === t ? "#000" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {bracket.sourceUrl && (
            <a
              href={bracket.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all hover:border-white/20 hover:bg-white/[0.06]"
              style={{
                borderColor: "rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Challonge
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M7 17L17 7" /><path d="M8 7h9v9" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* ── bracket body ── */}
      <div ref={containerRef} className="w-full p-6 pb-8 overflow-hidden">
        {/* Winners bracket (always shown, or when tab=winners) */}
        {(!hasLosers || tab === "winners") && winners.length > 0 && (
          <div>
            {hasLosers && (
              <SectionLabel label="Winners Bracket" accent={accent} />
            )}
            <div
              style={{
                height: totalH * scale,
                width: "100%",
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
                <RoundHeaders rounds={winners} />
                <BracketSection rounds={winners} accent={accent} />
              </div>
            </div>
          </div>
        )}

        {/* Losers bracket */}
        {hasLosers && tab === "losers" && losers.length > 0 && (
          <div>
            <SectionLabel label="Losers Bracket" accent={accent} />
            <div
              style={{
                height: totalH * scale,
                width: "100%",
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
                <RoundHeaders rounds={losers} />
                <BracketSection rounds={losers} accent={accent} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
