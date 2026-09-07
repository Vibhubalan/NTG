import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { listPlayerStandardCustomGames } from "@tournaments-leagues/index";
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

    const teamPlayerId = typeof body.teamPlayerId === "string" ? body.teamPlayerId : "";
    if (!teamPlayerId) {
      return NextResponse.json({ error: "teamPlayerId is required." }, { status: 400 });
    }

    const result = await listPlayerStandardCustomGames({
      slug,
      teamPlayerId,
      teamAId: typeof body.teamAId === "string" ? body.teamAId : undefined,
      teamBId: typeof body.teamBId === "string" ? body.teamBId : undefined,
      limit:
        typeof body.limit === "number"
          ? body.limit
          : Number(body.limit) || undefined,
      minPlayersPerTeam:
        typeof body.minPlayersPerTeam === "number"
          ? body.minPlayersPerTeam
          : Number(body.minPlayersPerTeam) || undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(auth.userId, "tournament.games.player-history", slug, {
      teamPlayerId,
      teamAId: body.teamAId,
      teamBId: body.teamBId,
      count: result.games.length,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/tournaments/games/player-history]", err);
    const message = err instanceof Error ? err.message : "Failed to load player history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
