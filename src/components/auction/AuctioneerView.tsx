"use client";

import { useState } from "react";
import type { AuctionSessionView } from "./AuctionShell";
import { useAuctionAutopilot } from "@/hooks/useAuctionAutopilot";

async function post(sessionId: string, path: string, body?: unknown) {
  const res = await fetch(`/api/auction/sessions/${sessionId}/${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Action failed");
  return data;
}

export function AuctioneerView({
  session,
  onRefresh,
}: {
  session: AuctionSessionView;
  onRefresh: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);

  const { lastAction } = useAuctionAutopilot({
    enabled: autoPilot,
    session,
    onActed: onRefresh,
  });

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      onRefresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const isComplete = session.status === "complete";
  const btn =
    "rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/[0.05] disabled:opacity-40";

  return (
    <div className="space-y-4">
      {/* Auto-pilot */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 transition-colors ${
          autoPilot
            ? "border-cyan-400/40 bg-gradient-to-r from-cyan-500/[0.12] to-indigo-500/[0.05]"
            : "border-white/[0.08] bg-white/[0.02]"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 grid h-10 w-10 place-items-center rounded-xl text-lg ${
              autoPilot ? "bg-cyan-500/20 text-cyan-300" : "bg-white/[0.05] text-white/50"
            }`}
            aria-hidden
          >
            ⚡
          </span>
          <div>
            <p className="font-display text-lg font-bold text-white">Auto-pilot</p>
            <p className="mt-0.5 max-w-md text-xs text-white/50">
              Nominates each player, hammers the sale when the timer ends, and finishes the auction —
              no clicks needed.
            </p>
            {autoPilot && lastAction ? <p className="mt-1 text-xs text-cyan-300">{lastAction}…</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAutoPilot((v) => !v)}
          disabled={isComplete}
          className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border transition-colors disabled:opacity-40 ${
            autoPilot ? "border-cyan-400/50 bg-cyan-500/30" : "border-white/15 bg-white/[0.06]"
          }`}
          aria-pressed={autoPilot}
          aria-label="Toggle auto-pilot"
        >
          <span
            className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${
              autoPilot ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Manual controls */}
      <details className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5" open={!autoPilot}>
        <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70">
          Manual controls
        </summary>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy} onClick={() => run(() => post(session.id, "nominate"))}>
            Nominate
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => run(() => post(session.id, "sell"))}>
            Hammer / Sell
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => run(() => post(session.id, "skip"))}>
            Skip
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => run(() => post(session.id, "undo"))}>
            Undo sale
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => run(() => post(session.id, "pool-sync"))}>
            Sync pool
          </button>
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() =>
              run(async () => {
                await fetch(`/api/auction/sessions/${session.id}/status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: session.status === "paused" ? "LIVE" : "PAUSED" }),
                });
              })
            }
          >
            Pause / Resume
          </button>
        </div>
        {msg ? <p className="mt-3 text-sm text-rose-300">{msg}</p> : null}
      </details>
    </div>
  );
}
