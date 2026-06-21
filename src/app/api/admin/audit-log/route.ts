import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 50);

  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      admin: {
        select: { name: true, email: true },
      },
    },
  });

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      action: r.action,
      target: r.target ?? null,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
      adminName: r.admin.name ?? r.admin.email ?? "Admin",
    })),
  });
}
