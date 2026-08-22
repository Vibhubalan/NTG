import { serverEnv } from "@core/config/env.server";
import { getTournamentPrizeLive } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const live = await getTournamentPrizeLive(slug);
  if (!live) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(live, {
    headers: { "Cache-Control": "no-store" },
  });
}
