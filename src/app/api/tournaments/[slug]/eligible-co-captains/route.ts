import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Props) {
  console.log("[API eligible-co-captains] GET request received");
  if (!serverEnv.databaseUrl) {
    console.error("[API eligible-co-captains] Database URL not configured");
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { slug } = await params;
    console.log(`[API eligible-co-captains] Resolved slug: ${slug}`);
    
    // Find the tournament first
    const tournament = await prisma.tournament.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (!tournament) {
      console.warn(`[API eligible-co-captains] Tournament not found for slug: ${slug}`);
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    console.log(`[API eligible-co-captains] Found tournament ID: ${tournament.id}`);

    // Find all approved registrations that are players and not on a team yet
    const registrations = await prisma.tournamentRegistration.findMany({
      where: {
        tournamentId: tournament.id,
        status: "APPROVED",
        participantRole: "PLAYER",
        teamId: null,
      },
      select: {
        snapshotDisplayName: true,
      }
    });

    console.log(`[API eligible-co-captains] Query returned ${registrations.length} eligible registrations`);

    // Extract the display names
    const usernames = registrations
      .map(r => r.snapshotDisplayName)
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0);

    console.log(`[API eligible-co-captains] Usernames:`, usernames);

    return NextResponse.json({ usernames });
  } catch (err) {
    console.error("[API eligible-co-captains error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
