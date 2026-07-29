import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { listTournamentGamesAdmin } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  try {
    if (!serverEnv.databaseUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const auth = await requireAdmin();
    if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

    const { slug } = await params;
    const result = await listTournamentGamesAdmin(slug);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ games: result.games });
  } catch (err) {
    console.error("[admin/tournaments/games GET]", err);
    const message = err instanceof Error ? err.message : "Failed to load games.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
