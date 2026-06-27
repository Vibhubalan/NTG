import { NextResponse } from "next/server";
import { serverEnv } from "@core/config/env.server";
import { getClashRankings } from "@tournaments-leagues/application/clash-royale-sync.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.clashRoyaleLeaderboardEnabled || !serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const modeParam = searchParams.get("mode");
  const mode = modeParam === "peak" ? "peak" : "current";
  const limit = Math.min(Number(searchParams.get("limit") ?? 250), 250);
  const q = searchParams.get("q") ?? undefined;

  const leaderboard = await getClashRankings(mode, limit, q);
  return NextResponse.json({ leaderboard });
}
