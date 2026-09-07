import { guardResponse, isAuthedSession, requireAdmin, requireSession } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { tryVetoLink } from "@/lib/veto-link";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const startVetoSchema = z.object({
  challongeMatchId: z.string().min(1),
  teamAName: z.string().min(1),
  teamBName: z.string().min(1),
  format: z.enum(["BO1", "BO3", "BO5"]).default("BO1"),
  /** Bracket state as the client saw it. Advisory — the authoritative value
   *  lives in Challonge, and re-fetching it here would burn the API quota. */
  matchState: z.enum(["pending", "open", "complete"]).optional(),
});

/** Bracket slot names come from Challonge, team names from our DB — compare loosely. */
function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const parsed = startVetoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { challongeMatchId, teamAName, teamBName, format, matchState } = parsed.data;

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      tournamentTeams: {
        select: {
          id: true,
          name: true,
          captainUserId: true,
          coCaptainUserId: true,
          players: { select: { userId: true } },
        },
      },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const byName = new Map(
    tournament.tournamentTeams.map((t) => [normalizeTeamName(t.name), t]),
  );
  const teamA = byName.get(normalizeTeamName(teamAName));
  const teamB = byName.get(normalizeTeamName(teamBName));
  if (!teamA || !teamB) {
    const missing = [!teamA ? teamAName : null, !teamB ? teamBName : null].filter(Boolean);
    return NextResponse.json(
      {
        error: `Could not match ${missing.join(" and ")} to a registered team. An admin needs to align the Challonge name with the cup team name.`,
      },
      { status: 409 },
    );
  }

  const isMember = (team: typeof teamA) =>
    team.captainUserId === auth.userId ||
    team.coCaptainUserId === auth.userId ||
    team.players.some((p) => p.userId === auth.userId);

  // Admins can enter any veto (to run or spectate it); everyone else must play in it.
  const admin = await requireAdmin();
  if (!admin.ok && !isMember(teamA) && !isMember(teamB)) {
    return NextResponse.json(
      { error: "Only players in this match can start the veto." },
      { status: 403 },
    );
  }

  // Re-running a veto on a played match is an admin call.
  if (!admin.ok && matchState === "complete") {
    return NextResponse.json(
      { error: "This match has already been played — ask an admin to re-run the veto." },
      { status: 409 },
    );
  }

  // Created on first start; later clicks by either side rejoin the same veto.
  // teamA is the bracket's top slot, and the veto engine gives it the first turn —
  // so slot order here is load-bearing, not cosmetic.
  const match = await prisma.tournamentMatch.upsert({
    where: {
      tournamentId_challongeMatchId: { tournamentId: tournament.id, challongeMatchId },
    },
    create: {
      tournamentId: tournament.id,
      challongeMatchId,
      teamAId: teamA.id,
      teamBId: teamB.id,
      format,
    },
    update: {},
    select: { id: true },
  });

  const url = tryVetoLink(match.id, auth.userId);
  if (!url) {
    return NextResponse.json({ error: "Veto app is not configured." }, { status: 503 });
  }

  return NextResponse.json({ url });
}

/**
 * Admin-only reset: drops the live veto session and the fixture row so the
 * match can be vetoed again from scratch.
 */
export async function DELETE(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const admin = await requireAdmin();
  if (!admin.ok) return guardResponse(admin)!;

  const body = await req.json().catch(() => ({}));
  const challongeMatchId = (body as { challongeMatchId?: string }).challongeMatchId;
  if (!challongeMatchId) {
    return NextResponse.json({ error: "challongeMatchId required." }, { status: 400 });
  }

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const match = await prisma.tournamentMatch.findUnique({
    where: {
      tournamentId_challongeMatchId: { tournamentId: tournament.id, challongeMatchId },
    },
    select: { id: true },
  });
  if (!match) return NextResponse.json({ ok: true, reset: false });

  // veto_sessions is owned by the services app and has no Prisma model here.
  await prisma
    .$executeRawUnsafe(`DELETE FROM veto_sessions WHERE match_id = $1`, match.id)
    .catch(() => 0);
  await prisma.tournamentMatch.delete({ where: { id: match.id } });

  return NextResponse.json({ ok: true, reset: true });
}
