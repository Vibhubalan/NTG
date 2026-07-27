"use client";

import type { AuctionSessionView } from "./AuctionShell";

export function SpectatorView({ session }: { session: AuctionSessionView }) {
  const sortedTeams = [...session.teams].sort((a, b) => b.currentBudget - a.currentBudget);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Teams */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Teams ({session.teams.length})
        </p>
        <ul className="mt-3 space-y-2">
          {sortedTeams.map((team) => {
            const spent = team.startingBudget - team.currentBudget;
            const pct = team.startingBudget > 0 ? (spent / team.startingBudget) * 100 : 0;
            return (
              <li key={team.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-semibold text-white/90">{team.name}</span>
                  <span className="shrink-0 text-white/50">
                    <span className="font-bold text-amber-300">{team.currentBudget}</span> pts ·{" "}
                    {team.slotsFilled}/{team.rosterSize}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-amber-400"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Recent sales */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Sold ({session.sold.length})
        </p>
        <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
          {session.sold.length === 0 ? (
            <li className="text-sm text-white/35">No sales yet.</li>
          ) : (
            session.sold.map((p) => (
              <li
                key={p.registrationId}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-white/80">
                  {p.name}
                  {p.teamName ? <span className="text-white/40"> → {p.teamName}</span> : null}
                </span>
                <span className="shrink-0 font-semibold text-emerald-300">{p.soldPrice} pts</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
