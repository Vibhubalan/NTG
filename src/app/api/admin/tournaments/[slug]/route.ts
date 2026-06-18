import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  deleteTournament,
  getTournamentAdmin,
  updateTournamentFull,
} from "@tournaments-leagues/index";
import type { GameSlug, TournamentStatus } from "@prisma/client";
import type { PrizeSplitRow } from "@core/contracts";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const tournament = await getTournamentAdmin(slug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  return NextResponse.json({ tournament });
}

export async function PATCH(req: Request, { params }: Props) {
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

  const result = await updateTournamentFull(slug, {
    name: body.name as string | undefined,
    game: body.game as GameSlug | undefined,
    gameLabel: body.gameLabel as string | undefined,
    seasonId: body.seasonId as string | undefined,
    status: body.status as TournamentStatus | undefined,
    description: body.description as string | undefined,
    startsAt: body.startsAt as string | undefined,
    endsAt: body.endsAt as string | undefined,
    registrationOpensAt: body.registrationOpensAt as string | undefined,
    registrationClosesAt: body.registrationClosesAt as string | undefined,
    autoManageStatus: body.autoManageStatus as boolean | undefined,
    prizePool: body.prizePool as number | undefined,
    prizeNotes: body.prizeNotes as string | undefined,
    prizeSplit: body.prizeSplit as PrizeSplitRow[] | undefined,
    bracketUrl: body.bracketUrl as string | undefined,
    posterUrl: body.posterUrl as string | undefined,
    hubBannerUrl: body.hubBannerUrl as string | undefined,
    hubCarouselImages: body.hubCarouselImages as string[] | undefined,
    showOnEsportsHub: body.showOnEsportsHub as boolean | undefined,
    hideAfter: body.hideAfter as string | null | undefined,
    teams: body.teams as string[] | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const result = await deleteTournament(slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
