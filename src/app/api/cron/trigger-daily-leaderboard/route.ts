import { isCronAuthorized } from "@/lib/cron-auth";
import { dispatchDailyLeaderboardWorkflow } from "@/lib/github-actions-dispatch";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight trigger — dispatches the GHA workflow; sync runs on GitHub runners. */
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    console.warn("[cron/trigger-daily-leaderboard] Unauthorized — check CRON_SECRET on Vercel.");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const backup = searchParams.get("backup") === "1";

  const result = await dispatchDailyLeaderboardWorkflow({ backup });
  if (!result.ok) {
    console.error("[cron/trigger-daily-leaderboard]", result.reason);
    return NextResponse.json({ ok: false, error: result.reason }, { status: 503 });
  }

  if (result.skipped) {
    console.info("[cron/trigger-daily-leaderboard] Skipped:", result.reason);
    return NextResponse.json({
      ok: true,
      dispatched: false,
      skipped: true,
      reason: result.reason,
    });
  }

  return NextResponse.json({
    ok: true,
    dispatched: true,
    workflow: "daily-leaderboard-refresh.yml",
    backup,
  });
}
