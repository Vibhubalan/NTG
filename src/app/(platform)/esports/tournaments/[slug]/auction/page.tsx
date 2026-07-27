import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuctionPublicState } from "@/modules/auction/application/auction.service";
import { isAuctionLiveWindow } from "@tournaments-leagues/domain/tournament-schedule";

type Props = { params: Promise<{ slug: string }> };

export default async function TournamentAuctionHubPage({ params }: Props) {
  const { slug } = await params;
  const data = await getAuctionPublicState(slug);
  if (!data || data.registrationFormat !== "AUCTION") notFound();

  const auctionLive = isAuctionLiveWindow({
    status: data.status,
    autoManageStatus: data.autoManageStatus,
    registrationOpensAt: data.registrationOpensAt,
    registrationClosesAt: data.registrationClosesAt,
    auctionStartsAt: data.auctionStartsAt,
    auctionEndsAt: data.auctionEndsAt,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    registrationFormat: data.registrationFormat,
  });

  const session = data.auctionSession;
  const links = [
    { href: `/esports/tournaments/${slug}/auction/captain`, label: "Captain" },
    { href: `/esports/tournaments/${slug}/auction/spectator`, label: "Spectator" },
    { href: `/esports/tournaments/${slug}/auction/player`, label: "Player" },
    { href: `/esports/tournaments/${slug}/auction/auctioneer`, label: "Auctioneer" },
    { href: `/esports/tournaments/${slug}/auction/display`, label: "Main Display" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400/80">Auction</p>
      <h1 className="mt-2 font-display text-3xl font-bold">{data.name}</h1>
      <p className="mt-2 text-sm text-white/55">
        Integrated auction inside NTG — no external port or redirect.
      </p>

      {session ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-white/70">
            Status: <span className="font-semibold text-white">{session.status}</span>
          </p>
          {session.currentRegistration ? (
            <p className="mt-2 text-sm text-white/60">
              On block: {session.currentRegistration.snapshotDisplayName} · floor{" "}
              {session.currentRegistration.snapshotAuctionFloor}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-white/60">
            Teams: {session.teams.length} · Pool:{" "}
            {session.players.filter((p) => p.status === "POOL").length}
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/85">
          Auction session not created yet. An admin can initialize it from the tournament admin panel.
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-white/10 bg-[#0a1020]/50 px-4 py-4 text-sm font-semibold text-white/80 transition hover:border-cyan-500/30 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {!auctionLive && session?.status !== "LIVE" ? (
        <p className="mt-6 text-xs text-white/40">
          Auction views are available; live bidding opens during the scheduled auction window.
        </p>
      ) : null}
    </main>
  );
}
