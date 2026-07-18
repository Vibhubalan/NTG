import { getSession } from "@core/auth/session";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const badges = await prisma.playerBadge.findMany({
    where: { userId: session.user.id },
    orderBy: { awardedAt: "desc" },
    select: { id: true, label: true, awardedAt: true },
  });

  return NextResponse.json({ badges });
}
