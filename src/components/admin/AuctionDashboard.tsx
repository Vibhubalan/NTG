"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuctionChannel } from "@/hooks/useAuctionChannel";
import { useAuctionAutopilot } from "@/hooks/useAuctionAutopilot";
import { AuctionTimerRing } from "@/components/auction/AuctionTimerRing";
import type { PresentedAuctionSession } from "@/modules/auction/application/auction-presenter";

type ActivityEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

const btn =
  "rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/[0.04] disabled:opacity-40";
const btnAccent =
  "rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40";
const btnDanger =
  "rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40";
const card = "rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-5";

const EVENT_LABELS: Record<string, string> = {
  status_change: "Status changed",
  nominate: "Player nominated",
  bid: "Bid placed",
  sold: "Player sold",
  unsold: "Player unsold (no bids)",
  mark_unsold: "Marked unsold",
  skip: "Player skipped",
  undo_sale: "Sale undone",
  manual_sell: "Manual sale",
  timer_adjust: "Timer adjusted",
  auction_end: "Auction ended",
  pool_sync: "Pool synced",
  queue_reorder: "Queue reordered",
  re_auction: "Player re-auctioned",
  snapshot_refresh: "Player data refreshed",
};

function describeEvent(e: ActivityEvent): string {
  const p = e.payload ?? {};
  const parts: string[] = [EVENT_LABELS[e.type] ?? e.type];
  if (typeof p.teamName === "string") parts.push(String(p.teamName));
  if (typeof p.amount === "number") parts.push(`${p.amount} pts`);
  if (typeof p.price === "number") parts.push(`${p.price} pts`);
  if (typeof p.seconds === "number") parts.push(`${p.seconds}s`);
  if (typeof p.added === "number") parts.push(`+${p.added} players`);
  if (typeof p.to === "string") parts.push(`→ ${p.to}`);
  return parts.join(" · ");
}

export function AuctionDashboard({
  slug,
  initialSessionId,
}: {
  slug: string;
  initialSessionId: string | null;
}) {
  const { state, loading, refresh } = useAuctionChannel(slug);
  const session = state as PresentedAuctionSession | null;
  const sessionId = session?.id ?? initialSessionId;

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timerInput, setTimerInput] = useState<string>("");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [autoPilot, setAutoPilot] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/auction/sessions/${sessionId}/events?limit=40`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      // best effort
    }
  }, [sessionId]);

  useEffect(() => {
    void loadEvents();
    const id = setInterval(() => void loadEvents(), 5000);
    return () => clearInterval(id);
  }, [loadEvents]);

  const { lastAction } = useAuctionAutopilot({
    enabled: autoPilot,
    session,
    onActed: () => {
      void refresh();
      void loadEvents();
    },
  });

  async function call(path: string, init?: RequestInit) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(path, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      await refresh();
      await loadEvents();
      return data;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const post = (path: string, body?: unknown) =>
    call(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

  const setStatus = (status: string) =>
    call(`/api/auction/sessions/${sessionId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

  async function reorder(registrationId: string, dir: -1 | 1) {
    if (!session) return;
    const ids = session.pool.map((p) => p.registrationId);
    const idx = ids.indexOf(registrationId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await call(`/api/auction/sessions/${sessionId}/queue`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedRegistrationIds: ids }),
    });
  }

  if (loading && !session) {
    return <p className="py-10 text-center text-sm text-white/40">Loading auction dashboard…</p>;
  }

  if (!session) {
    return (
      <div className={card}>
        <p className="text-sm text-white/60">No auction session exists for this cup yet.</p>
        <button
          type="button"
          className={`${btnAccent} mt-4`}
          disabled={busy}
          onClick={() => post("/api/auction/sessions", { tournamentSlug: slug })}
        >
          Create auction session
        </button>
        {msg ? <p className="mt-3 text-sm text-rose-300">{msg}</p> : null}
      </div>
    );
  }

  const status = session.status.toUpperCase();
  const isLive = status === "LIVE";
  const isPaused = status === "PAUSED";
  const isComplete = status === "COMPLETE";
  const onBlock = session.currentPlayer;

  const statusColors: Record<string, string> = {
    LIVE: "border-red-500/40 bg-red-500/10 text-red-300",
    PAUSED: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    IDLE: "border-white/15 bg-white/[0.04] text-white/60",
    SHOWCASE: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    COMPLETE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };

  return (
    <div className="space-y-6">
      {/* Auto-pilot hero */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
          autoPilot
            ? "border-cyan-400/40 bg-gradient-to-r from-cyan-500/[0.12] to-indigo-500/[0.06]"
            : "border-white/[0.08] bg-white/[0.02]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                Runs the whole auction for you — nominates each player, hammers the sale when the
                timer ends, and finishes up. Captains just bid.
              </p>
              {autoPilot && lastAction ? (
                <p className="mt-1 text-xs text-cyan-300">{lastAction}…</p>
              ) : null}
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
      </div>

      {/* Status banner + counts */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${statusColors[status] ?? statusColors.IDLE}`}
        >
          {isLive ? <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> : null}
          {status}
        </span>
        {(
          [
            ["Total", session.totalCount],
            ["In pool", session.poolCount],
            ["Sold", session.soldCount],
            ["Unsold", session.unsoldCount],
          ] as const
        ).map(([label, count]) => (
          <span
            key={label}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60"
          >
            {label}: <span className="font-semibold text-white">{count}</span>
          </span>
        ))}
      </div>

      {msg ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Current player */}
          <div className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">On the block</p>
                <p className="mt-2 text-2xl font-bold text-white">{onBlock?.name ?? "—"}</p>
                {onBlock ? (
                  <div className="mt-2 space-y-1 text-xs text-white/50">
                    <p>
                      Base price: <span className="text-white/80">{onBlock.floor ?? "—"}</span>
                      {onBlock.riotId ? ` · ${onBlock.riotId}` : ""}
                    </p>
                    <p>
                      {onBlock.premier ? `Premier ${onBlock.premier} · ` : ""}
                      {onBlock.faceit ? `FACEIT ${onBlock.faceit} · ` : ""}
                      {onBlock.hours ? `${Math.round(onBlock.hours)} hrs · ` : ""}
                      {onBlock.valorantRank ? `Valorant ${onBlock.valorantRank}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-white/35">Nominate the next player to continue.</p>
                )}
                <p className="mt-3 text-lg text-white/80">
                  Current bid: <span className="font-bold text-amber-300">{session.currentPrice}</span>
                  {session.highestBidderName ? (
                    <span className="text-sm text-white/50"> · {session.highestBidderName}</span>
                  ) : null}
                </p>
              </div>
              <AuctionTimerRing
                timerEndsAt={session.timerEndsAt}
                totalSeconds={session.settings.timerSeconds}
                size={104}
              />
            </div>

            {/* Controls */}
            {autoPilot ? (
              <p className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] px-4 py-3 text-center text-xs text-cyan-200/80">
                Auto-pilot is running the auction. Turn it off to take manual control.
              </p>
            ) : null}
            <details className="mt-4 border-t border-white/[0.06] pt-4" open={!autoPilot}>
              <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70">
                Manual controls
              </summary>
              <div className="mt-4 flex flex-wrap gap-2">
              {!isLive && !isComplete ? (
                <button type="button" className={btnAccent} disabled={busy} onClick={() => setStatus("LIVE")}>
                  {isPaused ? "Resume" : "Start auction"}
                </button>
              ) : null}
              {isLive ? (
                <button type="button" className={btn} disabled={busy} onClick={() => setStatus("PAUSED")}>
                  Pause
                </button>
              ) : null}
              <button
                type="button"
                className={btn}
                disabled={busy || !!onBlock || session.poolCount === 0 || isComplete}
                onClick={() => post(`/api/auction/sessions/${sessionId}/nominate`)}
              >
                Nominate next
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy || !onBlock}
                onClick={() => post(`/api/auction/sessions/${sessionId}/sell`)}
              >
                Hammer / Sell
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy || !onBlock}
                onClick={() => post(`/api/auction/sessions/${sessionId}/force-sell`)}
              >
                Force sell
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy || !onBlock}
                onClick={() => post(`/api/auction/sessions/${sessionId}/skip`)}
              >
                Skip (back to pool)
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy || !onBlock}
                onClick={() => post(`/api/auction/sessions/${sessionId}/mark-unsold`, {})}
              >
                Mark unsold
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => post(`/api/auction/sessions/${sessionId}/undo`)}
              >
                Undo last sale
              </button>
              {!isComplete ? (
                <button type="button" className={btnDanger} disabled={busy} onClick={() => setStatus("COMPLETE")}>
                  End auction
                </button>
              ) : null}
            </div>

            {/* Timer + utilities */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/80 focus:border-amber-400/50 focus:outline-none"
                placeholder={`${session.settings.timerSeconds}s timer`}
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
              />
              <button
                type="button"
                className={btn}
                disabled={busy || !timerInput}
                onClick={async () => {
                  await post(`/api/auction/sessions/${sessionId}/timer`, {
                    seconds: Number(timerInput),
                  });
                  setTimerInput("");
                }}
              >
                Set timer
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => post(`/api/auction/sessions/${sessionId}/pool-sync`)}
              >
                Sync pool
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => post(`/api/admin/tournaments/${slug}/auction/refresh-snapshots`)}
              >
                Refresh player data
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={() => post(`/api/admin/tournaments/${slug}/auction/publish`)}
              >
                Publish rosters
              </button>
              <a href={`/api/admin/tournaments/${slug}/auction/export`} className={btn}>
                Export CSV
              </a>
              <a
                href={`/esports/tournaments/${slug}/auction/display`}
                target="_blank"
                rel="noopener noreferrer"
                className={btn}
              >
                Open display
              </a>
            </div>
            </details>
          </div>

          {/* Queue */}
          <div className={card}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Nomination queue ({session.pool.length})
            </p>
            {session.pool.length === 0 ? (
              <p className="mt-3 text-sm text-white/40">Pool is empty.</p>
            ) : (
              <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
                {session.pool.map((p, idx) => (
                  <li
                    key={p.registrationId}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                      idx === 0
                        ? "border-cyan-500/30 bg-cyan-500/[0.06] text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-white/70"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-6 shrink-0 text-xs text-white/30">{idx + 1}.</span>
                      <span className="truncate">{p.name ?? p.registrationId}</span>
                      <span className="shrink-0 text-xs text-amber-300/80">{p.floor} pts</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="px-1 text-white/40 hover:text-white disabled:opacity-20"
                        disabled={busy || idx === 0}
                        onClick={() => reorder(p.registrationId, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="px-1 text-white/40 hover:text-white disabled:opacity-20"
                        disabled={busy || idx === session.pool.length - 1}
                        onClick={() => reorder(p.registrationId, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="ml-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/[0.05] disabled:opacity-30"
                        disabled={busy || !!onBlock || isComplete}
                        onClick={() =>
                          post(`/api/auction/sessions/${sessionId}/nominate`, {
                            registrationId: p.registrationId,
                          })
                        }
                      >
                        Nominate
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sold + unsold */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className={card}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Sold ({session.sold.length})
              </p>
              <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1 text-sm">
                {session.sold.map((p) => (
                  <li key={p.registrationId} className="flex justify-between gap-2 text-white/70">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-white/45">
                      {p.teamName ?? "—"} · <span className="text-emerald-300">{p.soldPrice} pts</span>
                    </span>
                  </li>
                ))}
                {session.sold.length === 0 ? <li className="text-white/35">No sales yet.</li> : null}
              </ul>
            </div>
            <div className={card}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Unsold ({session.unsold.length})
              </p>
              <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1 text-sm">
                {session.unsold.map((p) => (
                  <li key={p.registrationId} className="flex items-center justify-between gap-2 text-white/70">
                    <span className="truncate">
                      {p.name} <span className="text-xs text-white/40">({p.floor} pts)</span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/[0.05] disabled:opacity-30"
                      disabled={busy || isComplete}
                      onClick={() =>
                        post(`/api/auction/sessions/${sessionId}/re-auction`, {
                          registrationId: p.registrationId,
                        })
                      }
                    >
                      Re-auction
                    </button>
                  </li>
                ))}
                {session.unsold.length === 0 ? <li className="text-white/35">No unsold players.</li> : null}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Teams */}
          <div className={card}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Teams ({session.teams.length})
            </p>
            <ul className="mt-3 space-y-3">
              {session.teams.map((team) => (
                <li key={team.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{team.name}</p>
                    <p className="shrink-0 text-xs text-white/50">
                      <span className="font-bold text-amber-300">{team.currentBudget}</span> /{" "}
                      {team.startingBudget} pts
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {team.slotsFilled}/{team.rosterSize} slots · safe max {team.safeMax}
                    {team.coreDeduction > 0 ? ` · core −${team.coreDeduction}` : ""}
                  </p>
                  {team.players.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-white/60">
                      {team.players.map((p, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate">{p.displayName}</span>
                          <span className="shrink-0 text-white/40">{p.soldPrice} pts</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {/* Activity log */}
          <div className={card}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Activity log</p>
            <ul className="mt-3 max-h-[28rem] space-y-1.5 overflow-y-auto pr-1 text-xs">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 text-white/60">
                  <span className="truncate">{describeEvent(e)}</span>
                  <span className="shrink-0 tabular-nums text-white/30">
                    {new Date(e.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </li>
              ))}
              {events.length === 0 ? <li className="text-white/35">No activity yet.</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
