import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  addFeaturedImageAdmin,
  deleteFeaturedDeckAdmin,
  listFeaturedDecksAdmin,
  upsertFeaturedDeckAdmin,
} from "@socials-gallery/application/moments-admin.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const decks = await listFeaturedDecksAdmin();
  return NextResponse.json({ decks });
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

  if (body.action === "addImage") {
    const image = await addFeaturedImageAdmin({
      deckId: String(body.deckId),
      url: String(body.url),
      alt: String(body.alt ?? ""),
      caption: body.caption ? String(body.caption) : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    });
    if (!image) {
      return NextResponse.json({ error: "Deck not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, image });
  }

  const deck = await upsertFeaturedDeckAdmin({
    id: body.id ? String(body.id) : undefined,
    slug: String(body.slug ?? ""),
    eyebrow: String(body.eyebrow ?? "Featured"),
    title: String(body.title ?? ""),
    subtitle: String(body.subtitle ?? ""),
    displayMode: body.displayMode as "BLEND" | "CAROUSEL" | undefined,
    active: body.active as boolean | undefined,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
  });

  return NextResponse.json({ ok: true, deck });
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

  await deleteFeaturedDeckAdmin(id);
  return NextResponse.json({ ok: true });
}
