import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { auctionToken } from "@/lib/auction-link";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  if (!serverEnv.auctionUrl || !serverEnv.auctionJwtSecret) {
    return NextResponse.json({ error: "Auction app is not configured." }, { status: 503 });
  }

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, registrationFormat: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.registrationFormat !== "AUCTION") {
    return NextResponse.json({ error: "This cup is not an auction draft." }, { status: 400 });
  }

  // ponytail: default auction settings hardcoded; surface them in the editor if they ever need tuning.
  const res = await fetch(`${serverEnv.auctionUrl}/api/init`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${auctionToken(auth.userId)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tournamentId: tournament.id,
      settings: { startingBudget: 150, rosterSize: 3, timerSeconds: 15 },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Failed to create auction." },
      { status: res.status },
    );
  }
  return NextResponse.json(data);
}
