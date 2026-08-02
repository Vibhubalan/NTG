import {
  listPublishedTournamentGames,
  listTournamentStatsEligibility,
} from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const [result, statsEligibility] = await Promise.all([
    listPublishedTournamentGames(slug),
    listTournamentStatsEligibility(slug),
  ]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(
    {
      yourGamesEnabled: result.yourGamesEnabled,
      games: result.games,
      statsEligibility,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    },
  );
}
