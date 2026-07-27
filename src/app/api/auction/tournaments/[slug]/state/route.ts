import { NextResponse } from "next/server";
import { getSession } from "@core/auth/session";
import { serverEnv } from "@core/config/env.server";
import { getPresentedAuctionState } from "@/modules/auction/application/auction.service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const session = await getSession();
  const viewerId = session?.user?.id;
  const { slug } = await params;
  const data = await getPresentedAuctionState(slug, viewerId);
  if (!data.tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  return NextResponse.json({
    tournament: {
      slug: data.tournament.slug,
      name: data.tournament.name,
      game: data.tournament.game,
      registrationFormat: data.tournament.registrationFormat,
    },
    session: data.session,
  });
}
