import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/database/client";
import { AuctionDashboard } from "@/components/admin/AuctionDashboard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Auction · ${slug}` };
}

export default async function AdminAuctionCupPage({ params }: Props) {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      game: true,
      registrationFormat: true,
      auctionStartsAt: true,
      auctionEndsAt: true,
      auctionSession: { select: { id: true } },
    },
  });
  if (!tournament) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/auction" className="text-xs text-white/40 hover:text-white/70">
            ← All auction cups
          </Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">
            {tournament.name}
          </h1>
          <p className="text-xs text-white/40">
            {tournament.game.replace(/_/g, " ")} · Auction dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/tournaments/${tournament.slug}`}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
          >
            Cup settings
          </Link>
          <Link
            href={`/esports/tournaments/${tournament.slug}/auction`}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
          >
            Public auction hub
          </Link>
        </div>
      </div>

      <AuctionDashboard slug={tournament.slug} initialSessionId={tournament.auctionSession?.id ?? null} />
    </div>
  );
}
