import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { refreshAuctionSnapshots } from "@/modules/auction/application/snapshot-refresh.service";

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const { slug } = await params;
  const force = new URL(req.url).searchParams.get("force") === "1";
  const result = await refreshAuctionSnapshots(slug, { force });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
