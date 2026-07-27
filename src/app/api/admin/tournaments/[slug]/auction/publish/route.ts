import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { publishAuctionRostersToTournament } from "@/modules/auction/application/roster-publish.service";

type Props = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const { slug } = await params;
  const result = await publishAuctionRostersToTournament(slug);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
