import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { listAuctionEvents } from "@/modules/auction/application/auction.service";

type Props = { params: Promise<{ sessionId: string }> };

export async function GET(req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const { sessionId } = await params;
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 200);
  const events = await listAuctionEvents(sessionId, limit);
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
