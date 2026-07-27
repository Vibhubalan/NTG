import { notFound } from "next/navigation";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { AuctionRoleClient } from "@/components/auction/AuctionRoleClient";

type Props = { params: Promise<{ slug: string }> };

export default async function SpectatorAuctionPage({ params }: Props) {
  if (!serverEnv.databaseUrl) notFound();
  const { slug } = await params;
  const t = await prisma.tournament.findUnique({ where: { slug }, select: { name: true, registrationFormat: true } });
  if (!t || t.registrationFormat !== "AUCTION") notFound();
  return <AuctionRoleClient slug={slug} title={`${t.name} · Spectator`} role="spectator" />;
}
