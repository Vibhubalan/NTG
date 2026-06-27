import { NextResponse } from "next/server";
import { getSession } from "@core/auth/session";
import { serverEnv } from "@core/config/env.server";
import { linkClashRoyaleAccount } from "@auth-membership/application/clash-royale-link.service";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!serverEnv.clashRoyaleLeaderboardEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.steamLink);
  if (limited) return limited;

  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { tag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const result = await linkClashRoyaleAccount(session.user.id, String(body.tag ?? ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tag: result.tag });
}
