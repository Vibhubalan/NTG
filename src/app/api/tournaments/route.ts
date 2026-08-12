import { serverEnv } from "@core/config/env.server";
import { listTournamentPreviews } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const tournaments = await listTournamentPreviews();
    return NextResponse.json({ tournaments });
  } catch (err) {
    console.error("[api/tournaments GET]", err);
    return NextResponse.json({ error: "Failed to load tournaments" }, { status: 500 });
  }
}
