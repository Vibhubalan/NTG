import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import {
  getAuctionRules,
  resetAuctionRules,
  saveAuctionRules,
} from "@/modules/auction/application/auction-config.service";

export async function GET() {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const rules = await getAuctionRules();
  return NextResponse.json({ rules });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const rules = await saveAuctionRules(
    (body as { rules?: unknown })?.rules ?? body,
    auth.userId,
  );
  return NextResponse.json({ rules });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;
  const rules = await resetAuctionRules(auth.userId);
  return NextResponse.json({ rules });
}
