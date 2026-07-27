"use client";

import { useState } from "react";
import type { AuctionSessionView } from "./AuctionShell";

const quickSteps = [1, 2, 5, 10];

export function CaptainView({
  session,
  onBid,
}: {
  session: AuctionSessionView;
  onBid: (amount: number) => Promise<{ error?: string }>;
}) {
  const team = session.teams.find((t) => t.id === session.myTeamId);
  const increment = session.settings?.minBidIncrement ?? 1;
  const nextBid = session.currentPrice + increment;
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!team) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5 text-sm text-amber-100/90">
        You&apos;re viewing as a spectator — only registered captains can place bids.
      </div>
    );
  }

  const live = session.status === "live";
  const isTop = session.highestBidderName === team.name;
  const noSlots = team.openSlots <= 0;

  const submit = async (value: number) => {
    if (pending) return;
    setPending(true);
    setMsg(null);
    const res = await onBid(value);
    if (res.error) setMsg(res.error);
    setPending(false);
  };

  const disabledReason = !live
    ? "Waiting for the auctioneer…"
    : noSlots
      ? "Your roster is full."
      : isTop
        ? "You're the highest bidder."
        : value(team, nextBid);

  const canBid = live && !isTop && !noSlots && !pending && nextBid <= team.currentBudget;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Bidding panel */}
      <div
        className={`rounded-2xl border p-5 transition-colors ${
          isTop
            ? "border-emerald-500/40 bg-emerald-500/[0.06]"
            : "border-cyan-500/25 bg-cyan-500/[0.04]"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{team.name}</p>
          {isTop ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              You&apos;re winning
            </span>
          ) : null}
        </div>

        {/* Team stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Budget" value={team.currentBudget} accent="text-white" />
          <Stat label="Safe max" value={team.safeMax} accent="text-cyan-300" hint="most you can spend now" />
          <Stat label="Open slots" value={team.openSlots} accent="text-white" />
        </div>

        {/* Quick bid buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickSteps.map((step) => {
            const target = session.currentPrice + step;
            const ok = live && !isTop && !noSlots && !pending && target <= team.currentBudget;
            return (
              <button
                key={step}
                type="button"
                disabled={!ok}
                onClick={() => submit(target)}
                className="rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/85 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                +{step}
                <span className="ml-1 text-xs text-white/40">→ {target}</span>
              </button>
            );
          })}
        </div>

        {/* Big bid button */}
        <button
          type="button"
          disabled={!canBid}
          onClick={() => submit(nextBid)}
          className="mt-3 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-4 font-display text-lg font-bold text-white shadow-[0_8px_30px_-8px_rgba(34,211,238,0.5)] transition hover:from-cyan-400 hover:to-cyan-500 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 disabled:shadow-none"
        >
          {pending ? "Placing bid…" : `Bid ${nextBid}`}
        </button>

        {msg ? (
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {msg}
          </p>
        ) : !canBid ? (
          <p className="mt-3 text-center text-xs text-white/40">{disabledReason}</p>
        ) : null}
      </div>

      {/* Your roster */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Your roster ({team.slotsFilled}/{team.rosterSize})
        </p>
        <ul className="mt-3 space-y-1.5">
          {team.players.length === 0 ? (
            <li className="text-sm text-white/35">No players won yet.</li>
          ) : (
            team.players.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="truncate text-white/80">{p.displayName}</span>
                <span className="shrink-0 font-semibold text-amber-300">{p.soldPrice} pts</span>
              </li>
            ))
          )}
          {team.coreDeduction > 0 ? (
            <li className="pt-1 text-[11px] text-white/35">Core cost reserved: −{team.coreDeduction} pts</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 py-3">
      <p className={`font-display text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/40">{label}</p>
      {hint ? <p className="text-[9px] text-white/25">{hint}</p> : null}
    </div>
  );
}

function value(team: AuctionSessionView["teams"][number], nextBid: number): string {
  return nextBid > team.currentBudget ? "Not enough budget for the next bid." : "";
}
