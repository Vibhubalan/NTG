import { isCronAuthorized } from "@/lib/cron-auth";
import { dispatchHourlyLeaderboardWorkflow } from "@/lib/github-actions-dispatch";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight trigger — dispatches the GHA hourly workflow; sync runs on GitHub runners. */
export const maxDuration = 30;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    console.warn("[cron/trigger-hourly-leaderboard] Unauthorized — check CRON_SECRET on Vercel.");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!serverEnv.cronSecret) {
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }

  const result = await dispatchHourlyLeaderboardWorkflow();
  if (!result.ok) {
    console.error("[cron/trigger-hourly-leaderboard]", result.reason);
    return NextResponse.json({ ok: false, error: result.reason }, { status: 503 });
  }

  if (result.skipped) {
    console.info("[cron/trigger-hourly-leaderboard] Skipped:", result.reason);
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
    workflow: "hourly-leaderboard-refresh.yml",
  });
}
