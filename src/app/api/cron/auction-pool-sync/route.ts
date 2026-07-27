import { NextResponse } from "next/server";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { syncAllAuctionPools, tickAuctions } from "@/modules/auction/application/auction.service";
import { refreshAuctionSnapshots } from "@/modules/auction/application/snapshot-refresh.service";

export const dynamic = "force-dynamic";

/** Refresh snapshots for pre-LIVE sessions whose registration window has closed. */
async function refreshPendingSnapshots() {
  const sessions = await prisma.auctionSession.findMany({
    where: {
      status: { in: ["IDLE", "SHOWCASE"] },
      tournament: { registrationClosesAt: { lte: new Date() } },
    },
    select: { tournament: { select: { slug: true } } },
  });
  let refreshed = 0;
  for (const s of sessions) {
    const res = await refreshAuctionSnapshots(s.tournament.slug);
    if (res.ok) refreshed += res.data.refreshed;
  }
  return { sessions: sessions.length, refreshed };
}

export async function POST(req: Request) {
  const token = req.headers.get("x-cron-secret");
  if (!serverEnv.cronSecret || token !== serverEnv.cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tick, snapshots, pool] = await Promise.all([
    tickAuctions(),
    refreshPendingSnapshots(),
    syncAllAuctionPools(),
  ]);
  return NextResponse.json({ ok: true, tick, snapshots, pool });
}
