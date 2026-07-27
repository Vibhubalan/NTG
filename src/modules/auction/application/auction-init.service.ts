import { prisma } from "@core/database/client";
import { getAuctionRules } from "./auction-config.service";
import { normalizeRankConfig } from "../domain/rank-pricing";
import { computeTeamCoreDeduction } from "../domain/team-economy";

type ActionResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AuctionInitOptions = {
  startingBudget?: number;
  rosterSize?: number;
  timerSeconds?: number;
  minBidIncrement?: number;
  rankTable?: unknown;
};

function findCoCaptain(
  captainReg: { id: string; userId: string; teamName: string | null },
  tournamentTeams: Array<{ captainUserId: string | null; coCaptainUserId: string | null }>,
  registrations: Array<{
    id: string;
    userId: string;
    participantRole: string;
    teamName: string | null;
    snapshotRankTier: string | null;
    snapshotCs2PeakPremier: string | null;
    snapshotCs2FaceitRank: string | null;
    snapshotCs2Hours: number | null;
  }>,
) {
  const team = tournamentTeams.find((t) => t.captainUserId === captainReg.userId);
  if (team?.coCaptainUserId) {
    const linked = registrations.find(
      (r) => r.userId === team.coCaptainUserId && r.participantRole === "CO_CAPTAIN",
    );
    if (linked) return linked;
  }

  const captainTeamName = captainReg.teamName?.trim().toLowerCase();
  if (!captainTeamName) return null;
  return (
    registrations.find(
      (r) =>
        r.participantRole === "CO_CAPTAIN" &&
        r.teamName?.trim().toLowerCase() === captainTeamName,
    ) ?? null
  );
}

async function createSessionForTournamentId(
  tournamentId: string,
  options?: AuctionInitOptions,
): Promise<ActionResult<{ sessionId: string }>> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        where: { status: "APPROVED", participantRole: { in: ["CAPTAIN", "CO_CAPTAIN"] } },
      },
      tournamentTeams: true,
      auctionSession: true,
    },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };
  if (tournament.auctionSession) {
    return { ok: true, data: { sessionId: tournament.auctionSession.id } };
  }

  const captains = tournament.registrations.filter((r) => r.participantRole === "CAPTAIN");
  if (captains.length === 0) {
    return { ok: false, error: "No approved captain registrations found." };
  }

  const rules = await getAuctionRules();
  const startingBudget = options?.startingBudget ?? rules.economy.startingBudget;
  const rosterSize = options?.rosterSize ?? rules.economy.rosterSize;
  const timerSeconds = options?.timerSeconds ?? rules.economy.timerSeconds;
  const minBidIncrement = options?.minBidIncrement ?? rules.economy.minBidIncrement;
  const globalRankConfig = tournament.game === "CS2" ? rules.cs2 : rules.valorant;

  const created = await prisma.$transaction(async (tx) => {
    const session = await tx.auctionSession.create({
      data: {
        tournamentId: tournament.id,
        status: "IDLE",
        startingBudget,
        rosterSize,
        timerSeconds,
        minBidIncrement,
        rankTable: (options?.rankTable ?? null) as never,
        bidHistory: [],
      },
    });

    for (const captainReg of captains) {
      const coCaptainReg = findCoCaptain(captainReg, tournament.tournamentTeams, tournament.registrations);
      const rankConfig = normalizeRankConfig(options?.rankTable ?? globalRankConfig, tournament.game);
      const { coreDeduction } = computeTeamCoreDeduction(
        tournament.game,
        {
          id: captainReg.id,
          userId: captainReg.userId,
          snapshotRankTier: captainReg.snapshotRankTier,
          snapshotCs2PeakPremier: captainReg.snapshotCs2PeakPremier,
          snapshotCs2FaceitRank: captainReg.snapshotCs2FaceitRank,
          snapshotCs2Hours: captainReg.snapshotCs2Hours,
        },
        coCaptainReg
          ? {
              snapshotRankTier: coCaptainReg.snapshotRankTier,
              snapshotCs2PeakPremier: coCaptainReg.snapshotCs2PeakPremier,
              snapshotCs2FaceitRank: coCaptainReg.snapshotCs2FaceitRank,
              snapshotCs2Hours: coCaptainReg.snapshotCs2Hours,
            }
          : null,
        rankConfig,
      );

      await tx.auctionTeam.create({
        data: {
          sessionId: session.id,
          name: captainReg.teamName?.trim() || "Team",
          captainUserId: captainReg.userId,
          captainRegistrationId: captainReg.id,
          startingBudget,
          currentBudget: Math.max(startingBudget - coreDeduction, 0),
          coreDeduction,
          slotsFilled: 0,
        },
      });
    }

    const playerRegs = await tx.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id, status: "APPROVED", participantRole: "PLAYER" },
      select: { id: true, snapshotAuctionFloor: true },
    });

    if (playerRegs.length > 0) {
      await tx.auctionPlayer.createMany({
        data: playerRegs.map((reg) => ({
          sessionId: session.id,
          registrationId: reg.id,
          floorPrice: Math.max(reg.snapshotAuctionFloor ?? 2, 2),
          status: "POOL" as const,
        })),
      });
    }

    return session;
  });

  return { ok: true, data: { sessionId: created.id } };
}

export async function createAuctionSessionForTournament(
  tournamentSlug: string,
  options?: AuctionInitOptions,
): Promise<ActionResult<{ sessionId: string }>> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: { id: true },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };
  return createSessionForTournamentId(tournament.id, options);
}

/** Wipes the live auction session and rebuilds teams + player pool. Does not touch published cup rosters. */
export async function resetAuctionSessionForTournament(
  tournamentSlug: string,
  options?: AuctionInitOptions,
): Promise<ActionResult<{ sessionId: string }>> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: { id: true },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  await prisma.auctionSession.deleteMany({ where: { tournamentId: tournament.id } });
  return createSessionForTournamentId(tournament.id, options);
}

export async function getAuctionSessionFinalized(tournamentId: string): Promise<boolean> {
  const session = await prisma.auctionSession.findUnique({
    where: { tournamentId },
    select: { status: true },
  });
  return session?.status === "COMPLETE";
}
