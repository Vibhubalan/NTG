import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import {
  createAuctionSessionForTournament,
  getAuctionSessionFinalized,
  resetAuctionSessionForTournament,
} from "@/modules/auction/application/auction-init.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  if (!serverEnv.auctionUrl) {
    return NextResponse.json({ error: "Auction app is not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const bypassSavedLock = (body as { bypass?: boolean }).bypass === true;

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      registrationFormat: true,
      startingBudget: true,
      rosterSize: true,
      minBidIncrement: true,
      coCaptainSlots: true,
      auctionStartsAt: true,
      auctionEndsAt: true,
      rankPoints: true,
      game: true,
      auctionSession: { select: { id: true, status: true } },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.registrationFormat !== "AUCTION") {
    return NextResponse.json({ error: "This cup is not an auction draft." }, { status: 400 });
  }

  const finalized = await getAuctionSessionFinalized(tournament.id);
  if (finalized && !bypassSavedLock) {
    return NextResponse.json(
      {
        error:
          "This auction has already been saved. Enable the bypass option if you really need to reset it.",
      },
      { status: 409 },
    );
  }

  const initOptions = {
    startingBudget: tournament.startingBudget,
    rosterSize: tournament.rosterSize,
    minBidIncrement: tournament.minBidIncrement,
    rankTable:
      tournament.game === "VALORANT" && Array.isArray(tournament.rankPoints)
        ? tournament.rankPoints
        : undefined,
  };

  const result = tournament.auctionSession
    ? await resetAuctionSessionForTournament(slug, initOptions)
    : await createAuctionSessionForTournament(slug, initOptions);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    sessionId: result.data.sessionId,
    tournamentId: tournament.id,
    auctionStartsAt: tournament.auctionStartsAt?.toISOString() ?? null,
    auctionEndsAt: tournament.auctionEndsAt?.toISOString() ?? null,
  });
}
