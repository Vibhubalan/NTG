"use client";

import type { PresentedAuctionSession } from "@/modules/auction/application/auction-presenter";

type PoolEntry = PresentedAuctionSession["pool"][number];

function RankLine({
  premier,
  faceit,
  hours,
  valorantRank,
  game,
}: {
  premier: string | null;
  faceit: string | null;
  hours: number | null;
  valorantRank: string | null;
  game?: string | null;
}) {
  const items: { label: string; value: string }[] = [];
  if (game !== "VALORANT") {
    if (premier) items.push({ label: "Premier", value: premier });
    if (hours != null && hours > 0) items.push({ label: "Hours", value: `${Math.round(hours)}` });
    if (faceit) items.push({ label: "FACEIT", value: faceit });
  }
  if (valorantRank) items.push({ label: "Valorant", value: valorantRank });
  if (items.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60"
        >
          {item.label}: <span className="font-semibold text-white/90">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

export function PlayerView({
  session,
  playerName,
  playerRegistrationId,
  game,
}: {
  session: PresentedAuctionSession;
  playerName?: string | null;
  playerRegistrationId?: string | null;
  game?: string | null;
}) {
  const byId = (id?: string | null, name?: string | null) => (p: { registrationId: string; name: string | null }) =>
    (id && p.registrationId === id) || (!id && !!name && p.name === name);

  const match = byId(playerRegistrationId, playerName);
  const inPool = session.pool.find(match);
  const soldEntry = session.sold.find(match);
  const unsoldEntry = session.unsold.find(match);
  const onBlock =
    session.currentPlayer &&
    ((playerRegistrationId && session.currentPlayer.id === playerRegistrationId) ||
      (!playerRegistrationId && playerName && session.currentPlayer.name === playerName))
      ? session.currentPlayer
      : null;

  const profile: (PoolEntry | typeof session.currentPlayer) | null = onBlock ?? inPool ?? null;
  const floor = onBlock?.floor ?? inPool?.floor ?? unsoldEntry?.floor ?? null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
      {playerName ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{playerName}</p>
      ) : null}

      {onBlock ? (
        <>
          <p className="mt-3 text-sm text-cyan-300">You are on the block right now!</p>
          <p className="mt-2 text-3xl font-bold text-white">{session.currentPrice} pts</p>
          <p className="mt-1 text-sm text-white/50">
            {session.highestBidderName ? `Highest bid: ${session.highestBidderName}` : "Waiting for the first bid…"}
          </p>
        </>
      ) : soldEntry ? (
        <>
          <p className="mt-3 text-sm text-white/50">You were sold to</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{soldEntry.teamName ?? "a team"}</p>
          <p className="mt-1 text-white/60">for {soldEntry.soldPrice} points</p>
        </>
      ) : unsoldEntry ? (
        <>
          <p className="mt-3 text-lg font-semibold text-amber-300">Currently unsold</p>
          <p className="mt-1 text-sm text-white/50">
            You may be re-auctioned in a later round — keep an eye on the room.
          </p>
        </>
      ) : inPool ? (
        <>
          <p className="mt-3 text-lg font-semibold text-white">You&apos;re in the player pool</p>
          <p className="mt-1 text-sm text-white/50">
            {inPool.nominationOrder
              ? `Queue position ${session.pool.findIndex((p) => p.registrationId === inPool.registrationId) + 1} of ${session.pool.length}.`
              : "Waiting to be nominated."}
          </p>
        </>
      ) : session.status === "complete" ? (
        <p className="mt-3 text-white/60">Auction complete. You were not part of the final rosters.</p>
      ) : (
        <p className="mt-3 text-white/60">
          Auction status: <span className="text-white">{session.status}</span>
        </p>
      )}

      {floor != null ? (
        <p className="mt-4 text-sm text-white/50">
          Your auction points (base price): <span className="font-bold text-amber-300">{floor}</span>
        </p>
      ) : null}

      {profile ? (
        <RankLine
          premier={profile.premier}
          faceit={profile.faceit}
          hours={profile.hours}
          valorantRank={profile.valorantRank}
          game={game}
        />
      ) : null}
    </div>
  );
}
