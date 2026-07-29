import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import {
  deleteTournamentGame,
  setTournamentGameStatus,
} from "@tournaments-leagues/index";
import { TournamentGameStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; gameId: string }> };

const STATUSES = new Set<string>(Object.values(TournamentGameStatus));

export async function PATCH(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, gameId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const result = await setTournamentGameStatus({
    slug,
    gameId,
    status: status as TournamentGameStatus,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "tournament.games.status", slug, {
    gameId,
    status,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, gameId } = await params;
  const result = await deleteTournamentGame({ slug, gameId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "tournament.games.delete", slug, { gameId });
  return NextResponse.json({ ok: true });
}
