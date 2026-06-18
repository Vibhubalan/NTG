import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  deleteFeaturedImageAdmin,
  updateFeaturedImageAdmin,
} from "@socials-gallery/application/moments-admin.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const image = await updateFeaturedImageAdmin(id, {
    url: body.url as string | undefined,
    alt: body.alt as string | undefined,
    caption: body.caption as string | undefined,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
  });

  return NextResponse.json({ ok: true, image });
}

export async function DELETE(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { id } = await params;
  await deleteFeaturedImageAdmin(id);
  return NextResponse.json({ ok: true });
}
