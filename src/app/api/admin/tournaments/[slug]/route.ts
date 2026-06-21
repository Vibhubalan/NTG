import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeOptionalDateTime, normalizeOptionalString } from "@/lib/admin-fields";
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
    gameLabel: normalizeOptionalString(body.gameLabel),
    seasonId: normalizeOptionalString(body.seasonId),
    status: body.status as TournamentStatus | undefined,
    description: normalizeOptionalString(body.description),
    startsAt: normalizeOptionalDateTime(body.startsAt),
    endsAt: normalizeOptionalDateTime(body.endsAt),
    registrationOpensAt: normalizeOptionalDateTime(body.registrationOpensAt),
    registrationClosesAt: normalizeOptionalDateTime(body.registrationClosesAt),
    autoManageStatus: body.autoManageStatus as boolean | undefined,
    prizePool:
      body.prizePool === null || body.prizePool === ""
        ? null
        : (body.prizePool as number | undefined),
    prizeNotes: normalizeOptionalString(body.prizeNotes),
    prizeSplit: body.prizeSplit as PrizeSplitRow[] | null | undefined,
    bracketUrl: normalizeOptionalString(body.bracketUrl),
    posterUrl: normalizeOptionalString(body.posterUrl),
    rulebookUrl: normalizeOptionalString(body.rulebookUrl),
    hubBannerUrl: normalizeOptionalString(body.hubBannerUrl),
    hubCarouselImages: body.hubCarouselImages as string[] | undefined,
    showOnEsportsHub: body.showOnEsportsHub as boolean | undefined,
    hideAfter: body.hideAfter as string | null | undefined,
    teams: body.teams as string[] | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "tournament.update", slug, {
    fields: Object.keys(body),
  });

  return NextResponse.json({ ok: true, tournament: result.tournament });
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

  await logAdminAction(auth.userId, "tournament.delete", slug);

  return NextResponse.json({ ok: true });
}
