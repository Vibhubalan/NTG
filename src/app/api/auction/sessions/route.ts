import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { createAuctionSessionForTournament } from "@/modules/auction/application/auction.service";
import { refreshAuctionSnapshots } from "@/modules/auction/application/snapshot-refresh.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: {
    tournamentSlug?: string;
    startingBudget?: number;
    rosterSize?: number;
    timerSeconds?: number;
    minBidIncrement?: number;
    rankTable?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.tournamentSlug) {
    return NextResponse.json({ error: "tournamentSlug is required." }, { status: 400 });
  }

  // Pull the freshest ranks/hours into snapshots so seeded floor prices are current.
  await refreshAuctionSnapshots(body.tournamentSlug).catch(() => {});

  const result = await createAuctionSessionForTournament(body.tournamentSlug, {
    startingBudget: body.startingBudget,
    rosterSize: body.rosterSize,
    timerSeconds: body.timerSeconds,
    minBidIncrement: body.minBidIncrement,
    rankTable: body.rankTable,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
