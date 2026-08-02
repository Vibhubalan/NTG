import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { createTeamPlayer } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; teamId: string }> };

/** Add a pool player or poach onto a team. */
export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { teamId } = await params;
  let body: {
    displayName?: string;
    riotGameName?: string;
    riotTagLine?: string;
    registrationId?: string;
    userId?: string;
    membershipKind?: "PRIMARY" | "POACH";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isPoach = body.membershipKind === "POACH";
  if (!body.registrationId && !body.userId && !body.displayName?.trim()) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }
  if (isPoach && !body.registrationId && !body.userId) {
    return NextResponse.json({ error: "Poach requires a registration or user." }, { status: 400 });
  }

  const result = await createTeamPlayer(teamId, {
    displayName: body.displayName?.trim() ?? "Player",
    riotGameName: body.riotGameName,
    riotTagLine: body.riotTagLine,
    registrationId: body.registrationId,
    userId: body.userId,
    membershipKind: body.membershipKind,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id, player: result.player ?? null });
}
