import { getSession } from "@core/auth/session";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { getTournamentDetail, registerForTournament } from "@tournaments-leagues/index";
import { tournamentRegisterSchema } from "@auth-membership/domain/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const { slug } = await params;
    const session = await getSession();
    const tournament = await getTournamentDetail(slug, session?.user?.id);
    if (!tournament) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ tournament });
  } catch {
    return NextResponse.json({ error: "Failed to load tournament" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const { slug } = await params;

  let body: unknown = { participantRole: "PLAYER" };
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") body = raw;
  } catch {
    /* empty body defaults to player pool */
  }

  const parsed = tournamentRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid registration." },
      { status: 400 },
    );
  }

  const result = await registerForTournament(slug, auth.userId, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ registrationId: result.registrationId });
}
