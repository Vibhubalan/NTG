import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  return NextResponse.json({ ok: true, userId: auth.userId });
}
