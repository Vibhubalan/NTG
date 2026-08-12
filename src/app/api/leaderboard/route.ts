import { serverEnv } from "@core/config/env.server";
import { getValorantRankings } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 250), 250);
    const leaderboard = await getValorantRankings(limit, q);
    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error("[api/leaderboard GET]", err);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
