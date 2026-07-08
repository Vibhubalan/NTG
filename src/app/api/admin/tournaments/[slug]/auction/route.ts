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
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }
  if (tournament.registrationFormat !== "AUCTION") {
    return NextResponse.json({ error: "This cup is not an auction draft." }, { status: 400 });
  }

  const res = await fetch(`${serverEnv.auctionUrl}/api/init`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${auctionToken(auth.userId)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tournamentId: tournament.id,
      settings: {
        startingBudget: tournament.startingBudget,
        rosterSize: tournament.rosterSize,
        minBidIncrement: tournament.minBidIncrement,
        coCaptainSlots: tournament.coCaptainSlots,
        auctionStartsAt: tournament.auctionStartsAt?.toISOString() ?? null,
        auctionEndsAt: tournament.auctionEndsAt?.toISOString() ?? null,
      },
      // Valorant rank points from the main site; auction app falls back to its defaults if absent.
      rankTable:
        tournament.game === "VALORANT" && Array.isArray(tournament.rankPoints)
          ? tournament.rankPoints
          : undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { error?: string }).error ?? "Failed to create auction." },
      { status: res.status },
    );
  }

  // Reset / reconstruct registration teams on the main site's DB
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch existing teams to preserve logoUrl if they exist
      const existingTeams = await tx.tournamentTeam.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true, sourceRegistrationId: true, logoUrl: true },
      });
      const logoMap = new Map<string, string>();
      const teamIdToCaptainRegId = new Map<string, string>();
      for (const et of existingTeams) {
        if (et.sourceRegistrationId) {
          teamIdToCaptainRegId.set(et.id, et.sourceRegistrationId);
          if (et.logoUrl) {
            logoMap.set(et.sourceRegistrationId, et.logoUrl);
          }
        }
      }

      // 2. Delete all existing teams for this tournament (cascades to TournamentTeamPlayer)
      await tx.tournamentTeam.deleteMany({
        where: { tournamentId: tournament.id },
      });

      // 3. Find all APPROVED registrations for this tournament
      const registrations = await tx.tournamentRegistration.findMany({
        where: {
          tournamentId: tournament.id,
          status: "APPROVED",
        },
      });

      // 4. Get all captains
      const captains = registrations.filter((r) => r.participantRole === "CAPTAIN");

      // 5. Recreate teams for each captain and link the captain and co-captains
      for (let i = 0; i < captains.length; i++) {
        const captain = captains[i];
        const teamName = captain.teamName?.trim() || `${captain.snapshotDisplayName || "Team"}`;
        const logoUrl = logoMap.get(captain.id) || null;

        // Create the team
        const newTeam = await tx.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            name: teamName,
            captainUserId: captain.userId,
            logoUrl: logoUrl,
            sortOrder: i,
            sourceRegistrationId: captain.id,
          },
        });

        // Link the captain registration to the team
        await tx.tournamentRegistration.update({
          where: { id: captain.id },
          data: { teamId: newTeam.id },
        });

        // Link the co-captains registration to the team
        const coCaptains = registrations.filter((r) => {
          if (r.participantRole !== "CO_CAPTAIN") return false;
          
          // Match by original team link if it existed
          const originalCaptainRegId = r.teamId ? teamIdToCaptainRegId.get(r.teamId) : undefined;
          if (originalCaptainRegId === captain.id) return true;

          // Or match by team name
          return r.teamName?.trim().toLowerCase() === teamName.toLowerCase();
        });

        for (const cc of coCaptains) {
          await tx.tournamentRegistration.update({
            where: { id: cc.id },
            data: { teamId: newTeam.id },
          });
        }
      }
    });
  } catch (dbErr) {
    console.error("[auction init db reset error]", dbErr);
  }

  return NextResponse.json(data);
}
