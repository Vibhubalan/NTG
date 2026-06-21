import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { serverEnv } from "@core/config/env.server";
import {
  deleteMemberAdmin,
  getMemberAdmin,
  linkMemberRiotAdmin,
  resetMemberPasswordAdmin,
  unlinkMemberRiotAdmin,
  unlinkMemberSteamAdmin,
  updateMemberAdmin,
  linkMemberSteamAdmin,
} from "@auth-membership/application/admin-member.service";
import { syncUserRank } from "@tournaments-leagues/application/rank-sync.service";
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { after } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { id } = await params;
  const member = await getMemberAdmin(id);
  if (!member) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ member });
}

export async function PATCH(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "resetPassword") {
    const result = await resetMemberPasswordAdmin(id, String(body.newPassword ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(auth.userId, "member.resetPassword", id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "linkRiot") {
    const result = await linkMemberRiotAdmin(id, String(body.riotId ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    after(() => {
      syncUserRank(id, {
        tryAllRegions: true,
        context: { source: "admin_member", adminId: auth.userId },
      }).catch(console.error);
    });
    await logAdminAction(auth.userId, "member.linkRiot", id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unlinkRiot") {
    const result = await unlinkMemberRiotAdmin(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(auth.userId, "member.unlinkRiot", id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unlinkSteam") {
    const result = await unlinkMemberSteamAdmin(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(auth.userId, "member.unlinkSteam", id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "linkSteam") {
    const result = await linkMemberSteamAdmin(id, String(body.steamUrl ?? ""));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(auth.userId, "member.linkSteam", id);
    return NextResponse.json({ ok: true });
  }

  if (body.role !== undefined) {
    const targetMember = await getMemberAdmin(id);
    const isSuperadmin = auth.session.user.email === (process.env.SUPERADMIN_EMAIL ?? "vibhubalan123@gmail.com");
    if (!isSuperadmin) {
      if (body.role === "ADMIN" && targetMember?.role !== "ADMIN") {
        return NextResponse.json({ error: "Only the superadmin can grant ADMIN role." }, { status: 403 });
      }
      if (targetMember?.role === "ADMIN" && body.role !== "ADMIN") {
        return NextResponse.json({ error: "Only the superadmin can revoke ADMIN role." }, { status: 403 });
      }
    }
  }

  const result = await updateMemberAdmin(id, {
    name: body.name as string | undefined,
    phone: body.phone as string | undefined,
    role: body.role as UserRole | undefined,
    displayName: body.displayName as string | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "member.update", id, {
    fields: Object.keys(body),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { id } = await params;
  
  const targetMember = await getMemberAdmin(id);
  const isSuperadmin = auth.session.user.email === (process.env.SUPERADMIN_EMAIL ?? "vibhubalan123@gmail.com");
  if (targetMember?.role === "ADMIN" && !isSuperadmin) {
    return NextResponse.json({ error: "Only the superadmin can delete an admin." }, { status: 403 });
  }

  const result = await deleteMemberAdmin(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAction(auth.userId, "member.delete", id);

  return NextResponse.json({ ok: true });
}
