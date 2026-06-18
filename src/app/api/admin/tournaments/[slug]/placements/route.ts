import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { setTournamentPlacements } from "@tournaments-leagues/index";
import type { PlacementRole } from "@prisma/client";
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
  let body: {
    placements?: { role: PlacementRole; teamLabel?: string; userId?: string }[];
    clearRoles?: PlacementRole[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const placements = body.placements ?? [];
  const clearRoles = body.clearRoles ?? [];

  if (placements.length === 0 && clearRoles.length === 0) {
    return NextResponse.json({ error: "placements or clearRoles required" }, { status: 400 });
  }

  const result = await setTournamentPlacements(slug, placements, { clearRoles });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
