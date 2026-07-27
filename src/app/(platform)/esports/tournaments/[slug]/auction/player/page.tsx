import { notFound } from "next/navigation";
import { getSession } from "@core/auth/session";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { AuctionRoleClient } from "@/components/auction/AuctionRoleClient";

type Props = { params: Promise<{ slug: string }> };

export default async function PlayerAuctionPage({ params }: Props) {
  if (!serverEnv.databaseUrl) notFound();
  const { slug } = await params;
  const session = await getSession();
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true, game: true, registrationFormat: true },
  });
  if (!t || t.registrationFormat !== "AUCTION") notFound();

  let playerName: string | null = null;
  let playerRegistrationId: string | null = null;
  if (session?.user?.id) {
    const reg = await prisma.tournamentRegistration.findFirst({
      where: { tournament: { slug }, userId: session.user.id },
      select: { id: true, snapshotDisplayName: true },
    });
    playerName = reg?.snapshotDisplayName ?? session.user.name ?? null;
    playerRegistrationId = reg?.id ?? null;
  }

  return (
    <AuctionRoleClient
      slug={slug}
      title={`${t.name} · Player`}
      role="player"
      playerName={playerName}
      playerRegistrationId={playerRegistrationId}
      game={t.game}
    />
  );
}
