import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { markPlayerUnsold } from "@/modules/auction/application/auction.service";

type Props = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const { sessionId } = await params;
  let registrationId: string | undefined;
  try {
    const body = await req.json();
    registrationId = body?.registrationId;
  } catch {
    // Body optional — defaults to the player currently on the block.
  }
  const result = await markPlayerUnsold(sessionId, registrationId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
