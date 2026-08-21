import { isCronAuthorized } from "@/lib/cron-auth";
import { isLeaderboardQuietWindowIst } from "@/lib/leaderboard-quiet-window";
import { serverEnv } from "@core/config/env.server";
import { runHourlyLeaderboardRefresh } from "@tournaments-leagues/application/leaderboard-hourly-refresh.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** Process players in segments (3 Henrik calls each). GHA calls mode=continue until complete. */
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!serverEnv.leaderboardHourlyRefreshEnabled) {
    return NextResponse.json(
      { error: "Hourly leaderboard refresh is not enabled on this deployment." },
      { status: 503 },
    );
  }

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

  // Quiet window 4–6 AM IST: do not start a new full board; allow continue to finish.
  if (mode === "start" && isLeaderboardQuietWindowIst()) {
    return NextResponse.json({
      ok: true,
      status: "skipped",
      reason: "quiet_window_ist",
      complete: false,
      totalPlayers: 0,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      pending: 0,
      henrikRequestCount: 0,
    });
  }

  try {
    const result = await runHourlyLeaderboardRefresh(mode);
    const status = result.status === "error" ? 500 : 200;

    return NextResponse.json({ ok: result.status !== "error", ...result }, { status });
  } catch (err) {
    console.error("[cron/leaderboard-hourly]", err);
    return NextResponse.json({ error: "Hourly refresh failed." }, { status: 500 });
  }
}
