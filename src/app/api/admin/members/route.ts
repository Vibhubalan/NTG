import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import {
  createMemberAdmin,
  deleteMemberAdmin,
  getMemberAdmin,
  linkMemberRiotAdmin,
  listMembersAdmin,
  resetMemberPasswordAdmin,
  unlinkMemberRiotAdmin,
  updateMemberAdmin,
} from "@auth-membership/application/admin-member.service";
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const result = await listMembersAdmin({ search, limit, offset });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
    displayName?: string;
    role?: UserRole;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await createMemberAdmin(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: result.userId });
}
