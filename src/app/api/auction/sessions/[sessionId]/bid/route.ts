import { NextResponse } from "next/server";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { placeBid } from "@/modules/auction/application/auction.service";

type Props = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Props) {
  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const { sessionId } = await params;
  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amount = Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Valid bid amount is required." }, { status: 400 });
  }

  const result = await placeBid(sessionId, auth.userId, amount);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
