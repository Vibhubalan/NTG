import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { scanTournamentGamesChunk } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  try {
    if (!serverEnv.databaseUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    if (!serverEnv.henrikdevApiKey && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Henrik API key not configured." }, { status: 503 });
    }

    const auth = await requireAdmin();
    if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

    const { slug } = await params;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const teamAId = typeof body.teamAId === "string" ? body.teamAId : "";
    const teamBId = typeof body.teamBId === "string" ? body.teamBId : "";
    if (!teamAId || !teamBId) {
      return NextResponse.json({ error: "teamAId and teamBId are required." }, { status: 400 });
    }

    const result = await scanTournamentGamesChunk({
      slug,
      teamAId,
      teamBId,
      cursor: typeof body.cursor === "number" ? body.cursor : Number(body.cursor) || 0,
      minPlayersPerTeam:
        typeof body.minPlayersPerTeam === "number"
          ? body.minPlayersPerTeam
          : Number(body.minPlayersPerTeam) || undefined,
      historySize:
        typeof body.historySize === "number"
          ? body.historySize
          : Number(body.historySize) || undefined,
      scannerPlayerId:
        typeof body.scannerPlayerId === "string" && body.scannerPlayerId
          ? body.scannerPlayerId
          : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(auth.userId, "tournament.games.scan", slug, {
      teamAId,
      teamBId,
      cursor: result.result.cursor,
      done: result.result.done,
      found: result.result.found.length,
    });

    return NextResponse.json(result.result);
  } catch (err) {
    console.error("[admin/tournaments/games/scan]", err);
    const message = err instanceof Error ? err.message : "Scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
