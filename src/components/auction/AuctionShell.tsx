"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { AuctionTimerRing } from "./AuctionTimerRing";

export type AuctionPlayerCard = {
  id: string;
  name: string | null;
  riotId: string | null;
  floor: number | null;
  avatarUrl?: string | null;
  premier?: string | null;
  faceit?: string | null;
  hours?: number | null;
  valorantRank?: string | null;
};

export type AuctionTeamView = {
  id: string;
  name: string;
  captainUserId: string;
  startingBudget: number;
  currentBudget: number;
  coreDeduction: number;
  slotsFilled: number;
  openSlots: number;
  rosterSize: number;
  safeMax: number;
  isMe?: boolean;
  players: { displayName: string | null; riotId: string | null; soldPrice: number | null }[];
};

export type AuctionSessionView = {
  id: string;
  status: string;
  version?: number;
  currentPrice: number;
  highestBidder?: string | null;
  highestBidderName: string | null;
  timerEndsAt: string | null;
  currentPlayer: AuctionPlayerCard | null;
  teams: AuctionTeamView[];
  pool: Array<{ registrationId: string; name: string | null; floor: number; avatarUrl?: string | null }>;
  sold: Array<{ registrationId: string; name: string | null; soldPrice: number | null; teamName?: string | null }>;
  unsold?: Array<{ registrationId: string; name: string | null; floor: number }>;
  poolCount: number;
  soldCount?: number;
  unsoldCount: number;
  totalCount?: number;
  settings: { minBidIncrement: number; timerSeconds: number; rosterSize: number; startingBudget: number };
  myTeamId?: string;
};

export function playerInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_META: Record<string, { label: string; cls: string; dot: boolean }> = {
  live: { label: "Live", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300", dot: true },
  paused: { label: "Paused", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300", dot: false },
  showcase: { label: "Showcase", cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300", dot: false },
  idle: { label: "Standing by", cls: "border-white/15 bg-white/[0.05] text-white/60", dot: false },
  complete: { label: "Complete", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", dot: false },
};

export function AuctionAvatar({
  name,
  avatarUrl,
  size = 128,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "Player"}
        width={size}
        height={size}
        className="rounded-2xl border border-white/10 object-cover shadow-[0_0_40px_rgba(34,211,238,0.18)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-indigo-500/10 font-display font-bold text-white/70"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {playerInitials(name)}
    </div>
  );
}

function RankChips({ player }: { player: AuctionPlayerCard }) {
  const chips: string[] = [];
  if (player.premier) chips.push(`Premier ${player.premier}`);
  if (player.hours != null && player.hours > 0) chips.push(`${Math.round(player.hours)} hrs`);
  if (player.faceit) chips.push(`FACEIT ${player.faceit}`);
  if (player.valorantRank) chips.push(player.valorantRank);
  if (chips.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/70"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/** Shared premium chrome + hero "stage" for every auction role view. */
export function AuctionShell({
  slug,
  title,
  session,
  children,
}: {
  slug: string;
  title: string;
  session: AuctionSessionView | null;
  children?: React.ReactNode;
}) {
  const status = session?.status ?? "idle";
  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const player = session?.currentPlayer ?? null;

  return (
    <main className="relative min-h-screen text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${meta.cls}`}
            >
              {meta.dot ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
              {meta.label}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-400/70">
                Live Auction
              </p>
              <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
            </div>
          </div>
          <Link
            href={`/esports/tournaments/${slug}`}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60 transition hover:border-white/25 hover:text-white"
          >
            ← Cup
          </Link>
        </div>

        {!session ? (
          <div className="grid place-items-center rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
            <p className="font-display text-2xl font-bold text-white/70">Auction hasn&apos;t started</p>
            <p className="mt-2 text-sm text-white/40">Hang tight — this page updates live the moment it begins.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Hero stage */}
            <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c1526]/90 via-[#0a1120]/80 to-[#0a0f1c]/90 p-6 sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"
              />
              {player ? (
                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  {/* Player */}
                  <div className="flex items-center gap-5">
                    <AuctionAvatar name={player.name} avatarUrl={player.avatarUrl} size={128} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                        On the block
                      </p>
                      <h2 className="mt-1 truncate font-display text-3xl font-extrabold sm:text-4xl">
                        {player.name ?? "—"}
                      </h2>
                      {player.riotId ? (
                        <p className="mt-0.5 truncate text-sm text-white/40">{player.riotId}</p>
                      ) : null}
                      <RankChips player={player} />
                    </div>
                  </div>

                  {/* Bid + timer */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                        {player.floor != null ? `Base ${player.floor} · ` : ""}Current bid
                      </p>
                      <p className="font-display text-6xl font-extrabold tabular-nums text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,0.3)] sm:text-7xl">
                        {session.currentPrice}
                      </p>
                      <p className="mt-1 h-5 text-sm text-white/60">
                        {session.highestBidderName ? (
                          <>
                            <span className="text-white/40">leading</span>{" "}
                            <span className="font-semibold text-cyan-300">{session.highestBidderName}</span>
                          </>
                        ) : (
                          <span className="text-white/40">no bids yet</span>
                        )}
                      </p>
                    </div>
                    <AuctionTimerRing
                      timerEndsAt={session.timerEndsAt}
                      totalSeconds={session.settings.timerSeconds}
                    />
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center py-10 text-center">
                  <p className="font-display text-2xl font-bold text-white/70">
                    {status === "complete" ? "Auction complete" : "Waiting for the next player…"}
                  </p>
                  <p className="mt-2 text-sm text-white/40">
                    {session.poolCount} still in the pool · {session.soldCount ?? 0} sold ·{" "}
                    {session.unsoldCount} unsold
                  </p>
                </div>
              )}
            </section>

            {children}
          </div>
        )}
      </div>
    </main>
  );
}
