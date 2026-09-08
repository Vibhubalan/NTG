"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BracketMatchView } from "@core/contracts/tournament-bracket";

export type VetoContextValue = {
  slug: string;
  /** Names of the cup teams the viewer plays for (normalized on compare). */
  myTeamNames: string[];
  /** Admins can open any match's veto, not just their own team's. */
  isAdmin?: boolean;
};

export const VetoContext = createContext<VetoContextValue | null>(null);

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const PANEL_W = 240;

/**
 * Click-to-open veto launcher for a bracket card.
 *
 * The panel is portalled to <body> with fixed positioning: brackets live inside
 * horizontally scrolling, overflow-clipped containers, so anything absolutely
 * positioned within a card gets cut off at the container edge.
 */
export default function MatchVetoLauncher({ match }: { match: BracketMatchView }) {
  const ctx = useContext(VetoContext);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const teamAName = match.slots[0]?.name?.trim() ?? "";
  const teamBName = match.slots[1]?.name?.trim() ?? "";

  const mine = new Set((ctx?.myTeamNames ?? []).map(normalizeTeamName));
  const isMyMatch =
    mine.has(normalizeTeamName(teamAName)) || mine.has(normalizeTeamName(teamBName));
  // "pending" cards have no opponent yet, so there is nothing to veto. Played
  // matches still show the button — admins can re-run one, players just see it.
  const hasOpponents = !!teamAName && !!teamBName;
  const eligible =
    !!ctx && match.state !== "pending" && hasOpponents && (isMyMatch || !!ctx.isAdmin);
  const canStart = !!ctx?.isAdmin || match.state === "open";

  /** Anchor below the card, nudged inward so it never leaves the viewport. */
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - PANEL_W / 2),
      window.innerWidth - PANEL_W - 8,
    );
    setPos({ top: rect.bottom + 8, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
        setConfirmReset(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Scrolling the bracket moves the card, so follow it (or just close).
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  if (!eligible) return null;

  /** Two-step so a stray click can't wipe a finished veto. */
  async function resetVeto() {
    if (!confirmReset) {
      setConfirmReset(true);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${ctx!.slug}/veto`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challongeMatchId: match.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not reset the veto.");
        return;
      }
      setConfirmReset(false);
      setOpen(false);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function startVeto() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${ctx!.slug}/veto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challongeMatchId: match.id,
          teamAName,
          teamBName,
          matchState: match.state,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(typeof data.error === "string" ? data.error : "Could not start the veto.");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Transparent hit layer over the card — opens the panel without covering it. */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Match options"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`absolute inset-0 z-10 cursor-pointer rounded-xl transition ${
          open ? "ring-2 ring-fuchsia-400/70" : "hover:ring-2 hover:ring-fuchsia-400/40"
        }`}
      />

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left, width: PANEL_W }}
              className="fixed z-[100] rounded-xl border border-white/10 bg-[#0c101b] p-3 shadow-2xl"
            >
              <p className="mb-2 text-center text-[10px] leading-snug uppercase tracking-[0.12em] text-white/45">
                {teamAName} <span className="text-white/25">vs</span> {teamBName}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startVeto}
                  disabled={loading || !canStart}
                  title={canStart ? undefined : "This match is already played"}
                  className="flex-1 rounded-full bg-[var(--color-magenta,#d946ef)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
                >
                  {loading ? "Starting…" : "Start Veto"}
                </button>

                {ctx.isAdmin ? (
                  <button
                    type="button"
                    onClick={resetVeto}
                    disabled={loading}
                    title="Reset veto — clears it so it can be run again"
                    aria-label="Reset veto"
                    className="shrink-0 rounded-full border border-white/15 p-2 text-white/50 transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 2v6h6" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L3 8" />
                    </svg>
                  </button>
                ) : null}
              </div>

              {!canStart ? (
                <p className="mt-2 text-center text-[9px] uppercase tracking-[0.12em] text-white/30">
                  Match already played
                </p>
              ) : null}

              {confirmReset ? (
                <p className="mt-2 text-[10px] leading-snug text-amber-300">
                  Click again to confirm — this clears the veto and its result.
                </p>
              ) : null}
              {error ? (
                <p className="mt-2 text-[10px] leading-snug text-red-300">{error}</p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
