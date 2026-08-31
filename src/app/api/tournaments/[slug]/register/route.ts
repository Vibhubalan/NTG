import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import {
  registerForTournament,
  registerStandardTeam,
  registerFifaTeam,
  registerDuoCup,
  registerSoloCup,
  getValorantRegistrationProfileCard,
} from "@tournaments-leagues/index";
import {
  tournamentRegisterSchema,
  standardTournamentRegisterSchema,
  duoRegisterSchema,
  soloRegisterSchema,
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

  const format = tournament.registrationFormat ?? (tournament.game === "EA_FC26" ? "DUO" : null);

  if (format === "SOLO") {
    const parsed = soloRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration." },
        { status: 400 },
      );
    }
    const result = await registerSoloCup(slug, auth.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return registrationResponse(slug, auth.userId, result.registrationId, tournament.game);
  }

  if (format === "DUO") {
    const parsed = duoRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration." },
        { status: 400 },
      );
    }
    if (tournament.game === "EA_FC26") {
      const result = await registerFifaTeam(slug, auth.userId, parsed.data);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return registrationResponse(slug, auth.userId, result.registrationId, tournament.game);
    }
    if (tournament.game === "VALORANT") {
      const result = await registerDuoCup(slug, auth.userId, parsed.data, "VALORANT");
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return registrationResponse(slug, auth.userId, result.registrationId, tournament.game);
    }
    return NextResponse.json({ error: "2v2 registration is not supported for this game." }, { status: 400 });
  }

  if (tournament.game === "EA_FC26") {
    return NextResponse.json(
      { error: "This FIFA cup does not have a supported registration format." },
      { status: 400 },
    );
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
