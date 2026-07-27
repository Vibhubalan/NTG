"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useAuctionChannel } from "@/hooks/useAuctionChannel";
import type { PresentedAuctionSession } from "@/modules/auction/application/auction-presenter";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function BigTimer({ timerEndsAt }: { timerEndsAt: string | null }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!timerEndsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((new Date(timerEndsAt).getTime() - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  if (!timerEndsAt) return null;
  return (
    <div
      className={`rounded-3xl border px-8 py-4 text-center ${
        remaining <= 5
          ? "border-red-500/40 bg-red-500/10"
          : "border-cyan-500/30 bg-cyan-500/10"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Timer</p>
      <p
        className={`font-display text-6xl font-bold tabular-nums ${
          remaining <= 5 ? "text-red-300" : "text-white"
        }`}
      >
        {remaining}
      </p>
    </div>
  );
}

function RankChips({
  player,
  game,
}: {
  player: NonNullable<PresentedAuctionSession["currentPlayer"]>;
  game: string;
}) {
  const chips: string[] = [];
  if (game !== "VALORANT") {
    if (player.premier) chips.push(`Premier ${player.premier}`);
    if (player.hours != null && player.hours > 0) chips.push(`${Math.round(player.hours)} hrs`);
    if (player.faceit) chips.push(`FACEIT ${player.faceit}`);
  }
  if (player.valorantRank) chips.push(`Valorant ${player.valorantRank}`);
  if (chips.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-sm text-white/75"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a1020]/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function AuctionDisplayClient({
  slug,
  title,
  game,
}: {
  slug: string;
  title: string;
  game: string;
}) {
  const { state, loading } = useAuctionChannel(slug);
  const session = state as PresentedAuctionSession | null;

  if (loading && !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050810] text-white/40">
        Loading auction…
      </main>
    );
  }

  const player = session?.currentPlayer ?? null;
  const lastSale = session?.sold?.[0] ?? null;
  const upcoming = session?.pool ?? [];

  return (
    <main className="min-h-screen bg-[#050810] px-6 py-8 text-white">
      {/* Header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400/80">
            Live Auction · {game.replace(/_/g, " ")}
          </p>
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        </div>
        {session ? (
          <div className="flex items-center gap-3 text-sm text-white/50">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                session.status === "live"
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : "border-white/15 bg-white/[0.04] text-white/60"
              }`}
            >
              {session.status === "live" ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              ) : null}
              {session.status}
            </span>
          </div>
        ) : null}
      </div>

      {!session ? (
        <p className="mx-auto mt-24 max-w-xl text-center text-xl text-white/40">
          The auction hasn&apos;t started yet. Stay tuned!
        </p>
      ) : (
        <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1fr_2fr_1fr]">
          {/* Left panel: teams */}
          <div className="space-y-4">
            <SidePanel title={`Teams (${session.teams.length})`}>
              <ul className="space-y-2">
                {session.teams.map((t) => (
                  <li key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{t.name}</span>
                      <span className="shrink-0 font-bold text-amber-300">{t.currentBudget}</span>
                    </div>
                    <p className="text-[11px] text-white/40">
                      {t.slotsFilled}/{t.rosterSize} players
                    </p>
                  </li>
                ))}
              </ul>
            </SidePanel>
            <SidePanel title="Recent sales">
              <ul className="space-y-1.5 text-sm">
                {session.sold.slice(0, 8).map((p) => (
                  <li key={p.registrationId} className="flex justify-between gap-2 text-white/70">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-xs">
                      <span className="text-white/40">{p.teamName}</span>{" "}
                      <span className="font-semibold text-emerald-300">{p.soldPrice}</span>
                    </span>
                  </li>
                ))}
                {session.sold.length === 0 ? <li className="text-white/35">No sales yet.</li> : null}
              </ul>
            </SidePanel>
          </div>

          {/* Center stage */}
          <div className="flex flex-col items-center rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.06] to-transparent p-8 text-center">
            {player ? (
              <>
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt={player.name ?? "Player"}
                    className="h-40 w-40 rounded-3xl border border-white/10 object-cover shadow-[0_0_60px_rgba(34,211,238,0.15)]"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.05] font-display text-5xl font-bold text-white/60">
                    {initials(player.name)}
                  </div>
                )}
                <h2 className="mt-6 font-display text-5xl font-extrabold">{player.name ?? "—"}</h2>
                {player.riotId ? <p className="mt-1 text-sm text-white/40">{player.riotId}</p> : null}
                <RankChips player={player} game={game} />
                <p className="mt-6 text-sm uppercase tracking-[0.3em] text-white/40">
                  Base {player.floor ?? "—"} pts · Current bid
                </p>
                <p className="font-display text-8xl font-extrabold text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.35)]">
                  {session.currentPrice}
                </p>
                <p className="mt-2 h-7 text-lg text-white/70">
                  {session.highestBidderName ? (
                    <>
                      Leading: <span className="font-bold text-cyan-300">{session.highestBidderName}</span>
                    </>
                  ) : (
                    "Waiting for bids…"
                  )}
                </p>
                <div className="mt-6">
                  <BigTimer timerEndsAt={session.timerEndsAt} />
                </div>
              </>
            ) : lastSale && session.status !== "complete" ? (
              <>
                <p className="mt-10 text-sm uppercase tracking-[0.3em] text-white/40">Last sale</p>
                <h2 className="mt-4 font-display text-5xl font-extrabold">{lastSale.name}</h2>
                <p className="mt-4 text-2xl text-white/70">
                  sold to <span className="font-bold text-emerald-300">{lastSale.teamName}</span>
                </p>
                <p className="font-display mt-2 text-7xl font-extrabold text-emerald-300">
                  {lastSale.soldPrice} pts
                </p>
                <p className="mt-8 text-white/40">Next player coming up…</p>
              </>
            ) : session.status === "complete" ? (
              <>
                <h2 className="mt-10 font-display text-5xl font-extrabold text-emerald-300">
                  Auction Complete
                </h2>
                <p className="mt-4 text-white/50">
                  {session.soldCount} players sold · {session.unsoldCount} unsold
                </p>
              </>
            ) : (
              <p className="mt-24 text-2xl text-white/40">Waiting for the next nomination…</p>
            )}
          </div>

          {/* Right panel: queue */}
          <div className="space-y-4">
            <SidePanel title="Up next">
              {upcoming[0] ? (
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] px-4 py-3">
                  <p className="text-lg font-bold">{upcoming[0].name}</p>
                  <p className="text-xs text-white/50">{upcoming[0].floor} pts base</p>
                </div>
              ) : (
                <p className="text-sm text-white/35">Pool is empty.</p>
              )}
            </SidePanel>
            <SidePanel title={`Upcoming queue (${Math.max(upcoming.length - 1, 0)})`}>
              <ul className="space-y-1.5 text-sm">
                {upcoming.slice(1, 11).map((p, idx) => (
                  <li key={p.registrationId} className="flex justify-between gap-2 text-white/70">
                    <span className="truncate">
                      <span className="text-white/30">{idx + 2}.</span> {p.name}
                    </span>
                    <span className="shrink-0 text-xs text-amber-300/70">{p.floor}</span>
                  </li>
                ))}
                {upcoming.length <= 1 ? <li className="text-white/35">No players waiting.</li> : null}
              </ul>
            </SidePanel>
            <SidePanel title="Tally">
              <div className="grid grid-cols-2 gap-2 text-center">
                {(
                  [
                    ["Remaining", session.poolCount],
                    ["Sold", session.soldCount],
                    ["Unsold", session.unsoldCount],
                    ["Total", session.totalCount],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3">
                    <p className="font-display text-2xl font-bold">{count}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
                  </div>
                ))}
              </div>
            </SidePanel>
            {session.unsold.length > 0 ? (
              <SidePanel title={`Unsold (${session.unsold.length})`}>
                <ul className="space-y-1 text-sm text-white/60">
                  {session.unsold.slice(0, 8).map((p) => (
                    <li key={p.registrationId} className="truncate">
                      {p.name}
                    </li>
                  ))}
                </ul>
              </SidePanel>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
