import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import { publishTournamentGames } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
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

  const gameIds = Array.isArray(body.gameIds)
    ? body.gameIds.filter((id): id is string => typeof id === "string")
    : [];

  const result = await publishTournamentGames({ slug, gameIds });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "tournament.games.publish", slug, {
    count: result.count,
    gameIds,
  });

  return NextResponse.json({ ok: true, count: result.count });
}
