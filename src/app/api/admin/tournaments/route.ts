import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { createTournament, listTournamentsAdmin } from "@tournaments-leagues/index";
import type { GameSlug } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const tournaments = await listTournamentsAdmin();
  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      game: t.game,
      status: t.status,
      startsAt: t.startsAt?.toISOString() ?? null,
      registrationCount: t._count.registrations,
      teamCount: t._count.tournamentTeams,
      seasonLabel: t.season?.label ?? null,
    })),
  });
}

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: {
    slug?: string;
    name: string;
    game: GameSlug;
    gameLabel?: string;
    seasonId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const result = await createTournament({
    slug: body.slug ?? body.name,
    name: body.name,
    game: body.game ?? "VALORANT",
    gameLabel: body.gameLabel,
    seasonId: body.seasonId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, slug: result.slug });
}
