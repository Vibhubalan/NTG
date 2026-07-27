import { NextResponse } from "next/server";
import { serverEnv } from "@core/config/env.server";
import { tickAuctions } from "@/modules/auction/application/auction.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("x-cron-secret");
  if (!serverEnv.cronSecret || token !== serverEnv.cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await tickAuctions();
  return NextResponse.json({ ok: true, ...result });
}
