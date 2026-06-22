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
  const limitParam = url.searchParams.get("limit");
  const fetchAll = !limitParam || limitParam === "all";
  const take = fetchAll ? undefined : Math.min(Math.max(Number(limitParam) || 50, 1), 5000);

  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    ...(take !== undefined ? { take } : {}),
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
