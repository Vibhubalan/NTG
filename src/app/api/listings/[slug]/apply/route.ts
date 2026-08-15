import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@core/config/env.server";
import { applyToListing } from "@roster-listings/index";
import { listingApplySchema } from "@roster-listings/domain/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.listingApply);
  if (limited) return limited;

  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = listingApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid application." },
      { status: 400 },
    );
  }

  const result = await applyToListing(slug, auth.userId, {
    message: parsed.data.message,
    responses: parsed.data.responses,
    pastExperience: parsed.data.pastExperience || undefined,
    resumeUrl: parsed.data.resumeUrl || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ applicationId: result.applicationId });
}
