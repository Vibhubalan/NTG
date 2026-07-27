import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { requireAdmin } from "@/lib/auth-guard";
import { AuctionRoleClient } from "@/components/auction/AuctionRoleClient";

type Props = { params: Promise<{ slug: string }> };

export default async function AuctioneerPage({ params }: Props) {
  if (!serverEnv.databaseUrl) notFound();
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  const { slug } = await params;
  const t = await prisma.tournament.findUnique({ where: { slug }, select: { name: true, registrationFormat: true } });
  if (!t || t.registrationFormat !== "AUCTION") notFound();

  return <AuctionRoleClient slug={slug} title={`${t.name} · Auctioneer`} role="auctioneer" />;
}
