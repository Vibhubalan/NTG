import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { getLeaderboardLastCompletedRefresh } from "@/lib/leaderboard-last-refresh";
import { serverEnv } from "@core/config/env.server";
import { listLeaderboardRefreshRuns } from "@tournaments-leagues/application/leaderboard-hourly-refresh.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  const [runs, lastCompletedRefreshAt] = await Promise.all([
    listLeaderboardRefreshRuns(limit),
    getLeaderboardLastCompletedRefresh(),
  ]);

  return NextResponse.json({ runs, lastCompletedRefreshAt });
}
