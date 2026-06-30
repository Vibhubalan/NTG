import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  buildRegistrationsCsv,
  listTournamentRegistrationsAdmin,
} from "@tournaments-leagues/index";
import { prisma } from "@core/database/client";
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
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const rows = await listTournamentRegistrationsAdmin(slug);
  if (!rows) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const csv = buildRegistrationsCsv(tournament.game, rows);
  const filename = `${slug}-registrations.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
