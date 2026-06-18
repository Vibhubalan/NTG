import { getSession } from "@core/auth/session";
import { serverEnv } from "@core/config/env.server";
import { getTournamentDetail } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { slug } = await params;
    const session = await getSession();
    const tournament = await getTournamentDetail(slug, session?.user?.id);
    if (!tournament) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ tournament });
  } catch {
    return NextResponse.json({ error: "Failed to load tournament" }, { status: 500 });
  }
}
