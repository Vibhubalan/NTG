import { NextResponse } from "next/server";
import { serverEnv } from "@core/config/env.server";
import { isCronAuthorized } from "@/lib/cron-auth";
import {
  getClashSyncStatus,
  importClashPlayerStats,
  listLinkedClashPlayers,
  type ClashPlayerImportRow,
} from "@tournaments-leagues/application/clash-royale-sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function disabled() {
  return !serverEnv.clashRoyaleLeaderboardEnabled || !serverEnv.databaseUrl;
}

export async function GET(req: Request) {
  if (disabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode") ?? "export";

  if (mode === "status") {
    const status = await getClashSyncStatus();
    return NextResponse.json({ ok: true, ...status });
  }

  if (mode === "export") {
    const players = await listLinkedClashPlayers();
    return NextResponse.json({ ok: true, players });
  }

  return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
}

export async function POST(req: Request) {
  if (disabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const mode = new URL(req.url).searchParams.get("mode");
  if (mode !== "import") {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  let body: { players?: ClashPlayerImportRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rows = Array.isArray(body.players) ? body.players : [];
  const result = await importClashPlayerStats(rows);

  return NextResponse.json({ ok: true, ...result });
}
