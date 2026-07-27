import { notFound } from "next/navigation";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { AuctionDisplayClient } from "@/components/auction/AuctionDisplayClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Auction Display · ${slug}` };
}

export default async function AuctionDisplayPage({ params }: Props) {
  if (!serverEnv.databaseUrl) notFound();
  const { slug } = await params;
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true, game: true, registrationFormat: true },
  });
  if (!t || t.registrationFormat !== "AUCTION") notFound();

  return <AuctionDisplayClient slug={slug} title={t.name} game={t.game} />;
}
