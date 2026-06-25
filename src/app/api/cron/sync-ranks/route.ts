import { isCronAuthorized } from "@/lib/cron-auth";
import { serverEnv } from "@core/config/env.server";
import { runDailyLeaderboardRefresh } from "@tournaments-leagues/application/leaderboard-hourly-refresh.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** ~5–6 players per segment (3 Henrik calls each, 26/min). GHA calls mode=continue until complete. */
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const modeParam = searchParams.get("mode");
  const mode = modeParam === "continue" ? "continue" : "start";

  try {
    const result = await runDailyLeaderboardRefresh(mode);
    const status = result.status === "error" ? 500 : 200;

    return NextResponse.json({ ok: result.status !== "error", ...result }, { status });
  } catch (err) {
    console.error("[cron/sync-ranks]", err);
    return NextResponse.json({ error: "Daily rank sync failed." }, { status: 500 });
  }
}
