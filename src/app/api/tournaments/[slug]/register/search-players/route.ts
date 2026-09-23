import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { AUTH_RATE_LIMITS, enforceMemoryRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@core/config/env.server";
import { searchDynamicTeamCandidates } from "@tournaments-leagues/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * Typeahead for DYNAMIC / STANDARD 5v5 captains to add teammates by NTG
 * username or Riot ID. Authenticated only — never exposes email/phone
 * (unlike admin member search). `exclude` lets the client hide teammates
 * already picked for the roster-in-progress before they're submitted.
 */
export async function GET(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const limited = enforceMemoryRateLimit(req, AUTH_RATE_LIMITS.dynamicTeamSearch);
  if (limited) return limited;

  const { slug } = await params;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const excludeUserIds = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates = await searchDynamicTeamCandidates(slug, auth.userId, q, excludeUserIds);

  return NextResponse.json({ candidates });
}
