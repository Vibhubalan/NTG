import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { manualSellPlayer } from "@/modules/auction/application/auction.service";

type Props = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const { sessionId } = await params;
  let body: { registrationId?: string; teamId?: string; price?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.teamId) return NextResponse.json({ error: "teamId is required." }, { status: 400 });
  const result = await manualSellPlayer(sessionId, {
    registrationId: body.registrationId,
    teamId: body.teamId,
    price: Number(body.price ?? 0),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
