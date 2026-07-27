"use client";

import { AuctionShell, type AuctionSessionView } from "@/components/auction/AuctionShell";
import { CaptainView } from "@/components/auction/CaptainView";
import { SpectatorView } from "@/components/auction/SpectatorView";
import { PlayerView } from "@/components/auction/PlayerView";
import { AuctioneerView } from "@/components/auction/AuctioneerView";
import { useAuctionChannel } from "@/hooks/useAuctionChannel";
import type { PresentedAuctionSession } from "@/modules/auction/application/auction-presenter";

export function AuctionRoleClient({
  slug,
  title,
  role,
  playerName,
  playerRegistrationId,
  game,
}: {
  slug: string;
  title: string;
  role: "captain" | "spectator" | "player" | "auctioneer";
  playerName?: string | null;
  playerRegistrationId?: string | null;
  game?: string | null;
}) {
  const { state, loading, error, refresh } = useAuctionChannel(slug);
  const session = state as AuctionSessionView | null;

  if (loading) {
    return <p className="px-4 py-10 text-center text-white/50">Loading auction…</p>;
  }
  if (error) {
    return <p className="px-4 py-10 text-center text-rose-300">{error}</p>;
  }

  return (
    <AuctionShell slug={slug} title={title} session={session}>
      {session && role === "captain" ? (
        <CaptainView
          session={session}
          onBid={async (amount) => {
            const res = await fetch(`/api/auction/sessions/${session.id}/bid`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!res.ok) return { error: data.error };
            await refresh();
            return {};
          }}
        />
      ) : null}
      {session && role === "spectator" ? <SpectatorView session={session} /> : null}
      {session && role === "player" ? (
        <PlayerView
          session={session as unknown as PresentedAuctionSession}
          playerName={playerName}
          playerRegistrationId={playerRegistrationId}
          game={game}
        />
      ) : null}
      {session && role === "auctioneer" ? (
        <AuctioneerView session={session} onRefresh={refresh} />
      ) : null}
    </AuctionShell>
  );
}
