import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  awardPlayerBadge,
  awardCustomBadge,
  removePlayerBadge,
  listAllPlayerBadges,
  type PlayerBadgeType,
} from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const badges = await listAllPlayerBadges();
  return NextResponse.json({ badges });
}

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: {
    userId?: string;
    tournamentId?: string;
    type?: PlayerBadgeType;
    kind?: "PLACEMENT" | "CUSTOM";
    iconKey?: string;
    label?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (body.kind === "CUSTOM" || body.iconKey) {
    if (!body.iconKey) {
      return NextResponse.json({ error: "iconKey required for custom badges" }, { status: 400 });
    }
    const result = await awardCustomBadge({
      userId: body.userId,
      iconKey: body.iconKey,
      label: body.label,
      awardedBy: auth.userId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, label: result.label });
  }

  if (!body.tournamentId || (body.type !== "WINNER" && body.type !== "RUNNER_UP")) {
    return NextResponse.json({ error: "userId, tournamentId and type required" }, { status: 400 });
  }

  const result = await awardPlayerBadge(body.userId, body.tournamentId, body.type, auth.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const result = await removePlayerBadge(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
