import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import {
  registerForTournament,
  registerStandardTeam,
  registerFifaTeam,
  getValorantRegistrationProfileCard,
} from "@tournaments-leagues/index";
import {
  tournamentRegisterSchema,
  standardTournamentRegisterSchema,
  fifaRegisterSchema,
} from "@auth-membership/domain/schemas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function registrationResponse(
  slug: string,
  userId: string,
  registrationId: string,
  game: string,
) {
  const profileCard =
    game === "VALORANT"
      ? await getValorantRegistrationProfileCard(slug, userId)
      : null;
  return NextResponse.json({ registrationId, profileCard });
}

export async function POST(req: Request, { params }: Props) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.tournamentRegister);
  if (limited) return limited;

  const { slug } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { game: true, registrationFormat: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (tournament.game === "EA_FC26") {
    const parsed = fifaRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration." },
        { status: 400 },
      );
    }
    const result = await registerFifaTeam(slug, auth.userId, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return registrationResponse(slug, auth.userId, result.registrationId, tournament.game);
  }

  if (tournament.registrationFormat === "STANDARD") {
    const parsed = standardTournamentRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration." },
        { status: 400 },
      );
    }
    const result = await registerStandardTeam(slug, auth.userId, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return registrationResponse(slug, auth.userId, result.registrationId, tournament.game);
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

  return registrationResponse(slug, auth.userId, result.registrationId, tournament.game);
}
