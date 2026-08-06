import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  aggregatePlayerStats,
  buildPlayerStatsCsv,
} from "@/lib/tournament-stats";
import {
  listPublishedTournamentGames,
  listTournamentStatsEligibility,
} from "@tournaments-leagues/index";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const [gamesResult, eligibility] = await Promise.all([
    listPublishedTournamentGames(slug),
    listTournamentStatsEligibility(slug),
  ]);

  if (!gamesResult.ok) {
    return NextResponse.json({ error: gamesResult.error }, { status: 404 });
  }

  const players = aggregatePlayerStats(gamesResult.games, { eligibility });
  const csv = buildPlayerStatsCsv(players);
  const filename = `${slug}-player-stats.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
