import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { syncPlayerPool } from "@/modules/auction/application/auction.service";

type Props = { params: Promise<{ sessionId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const { sessionId } = await params;
  const result = await syncPlayerPool(sessionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
