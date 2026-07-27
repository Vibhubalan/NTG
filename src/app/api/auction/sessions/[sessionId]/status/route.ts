import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { setAuctionStatus } from "@/modules/auction/application/auction.service";
import type { AuctionSessionStatus } from "@prisma/client";

const ALLOWED = new Set<AuctionSessionStatus>(["IDLE", "SHOWCASE", "LIVE", "PAUSED", "COMPLETE"]);

type Props = { params: Promise<{ sessionId: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { sessionId } = await params;
  let body: { status?: AuctionSessionStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const result = await setAuctionStatus(sessionId, body.status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result.data);
}
