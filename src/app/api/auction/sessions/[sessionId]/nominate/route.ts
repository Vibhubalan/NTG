import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { nominatePlayer } from "@/modules/auction/application/auction.service";

type Props = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { sessionId } = await params;
  let body: { registrationId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const result = await nominatePlayer(sessionId, body.registrationId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
