import { handleRegister } from "@auth-membership/api/register.handlers";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { serverEnv } from "@core/config/env.server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.register);
  if (limited) return limited;

  if (!serverEnv.databaseUrl) {
    return NextResponse.json(
      { error: "Registration unavailable. Database not configured." },
      { status: 503 },
    );
  }
  return handleRegister(req);
}
