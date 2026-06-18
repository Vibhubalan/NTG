import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  deleteReelAdmin,
  listReelsAdmin,
  upsertReelAdmin,
} from "@socials-gallery/application/moments-admin.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const reels = await listReelsAdmin();
  return NextResponse.json({ reels });
}

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reel = await upsertReelAdmin({
    id: body.id ? String(body.id) : undefined,
    reelUrl: String(body.reelUrl ?? ""),
    coverUrl: body.coverUrl ? String(body.coverUrl) : undefined,
    caption: body.caption ? String(body.caption) : undefined,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    active: body.active as boolean | undefined,
  });

  return NextResponse.json({ ok: true, reel });
}

export async function DELETE(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  await deleteReelAdmin(id);
  return NextResponse.json({ ok: true });
}
