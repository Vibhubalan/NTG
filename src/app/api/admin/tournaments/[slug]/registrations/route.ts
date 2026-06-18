import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { adminAddTournamentRegistration } from "@tournaments-leagues/index";
import type { RegistrationParticipantRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;

  let body: {
    userId?: string;
    username?: string;
    email?: string;
    participantRole?: RegistrationParticipantRole;
    teamName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId && !body.username?.trim() && !body.email?.trim()) {
    return NextResponse.json(
      { error: "Provide a member userId, username, or email." },
      { status: 400 },
    );
  }

  const result = await adminAddTournamentRegistration(slug, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, registrationId: result.registrationId });
}
