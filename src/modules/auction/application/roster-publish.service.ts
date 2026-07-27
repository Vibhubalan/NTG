import { prisma } from "@core/database/client";
import { broadcastAuctionEvent } from "../infrastructure/auction-broadcast";

export async function publishAuctionRostersToTournament(
  tournamentSlug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    include: {
      auctionSession: {
        include: {
          teams: {
            include: {
              captainRegistration: true,
              players: {
                where: { status: "SOLD" },
                include: { registration: true },
              },
            },
          },
        },
      },
    },
  });

  if (!tournament?.auctionSession) {
    return { ok: false, error: "No auction session for this cup." };
  }

  const session = tournament.auctionSession;

  await prisma.$transaction(async (tx) => {
    await tx.tournamentTeamPlayer.deleteMany({
      where: { team: { tournamentId: tournament.id } },
    });
    await tx.tournamentTeam.deleteMany({ where: { tournamentId: tournament.id } });

    let sortOrder = 0;
    for (const auctionTeam of session.teams) {
      const team = await tx.tournamentTeam.create({
        data: {
          tournamentId: tournament.id,
          name: auctionTeam.name,
          captainUserId: auctionTeam.captainUserId,
          sourceRegistrationId: auctionTeam.captainRegistrationId,
          sortOrder: sortOrder++,
        },
      });

      const captainReg = auctionTeam.captainRegistration;
      const members: Array<{
        userId: string;
        registrationId: string;
        displayName: string | null;
        riotId: string | null;
        valorantRoles: unknown;
        peakPremier: string | null;
      }> = [
        {
          userId: captainReg.userId,
          registrationId: captainReg.id,
          displayName: captainReg.snapshotDisplayName,
          riotId: captainReg.snapshotRiotId,
          valorantRoles: captainReg.snapshotValorantRoles,
          peakPremier: captainReg.snapshotCs2PeakPremier ?? captainReg.snapshotRankTier,
        },
        ...auctionTeam.players.map((p) => ({
          userId: p.registration.userId,
          registrationId: p.registration.id,
          displayName: p.registration.snapshotDisplayName,
          riotId: p.registration.snapshotRiotId,
          valorantRoles: p.registration.snapshotValorantRoles,
          peakPremier: p.registration.snapshotCs2PeakPremier ?? p.registration.snapshotRankTier,
        })),
      ];

      let playerOrder = 0;
      for (const m of members) {
        const [riotGameName, riotTagLine] = (m.riotId ?? "").split("#");
        await tx.tournamentTeamPlayer.create({
          data: {
            teamId: team.id,
            userId: m.userId,
            registrationId: m.registrationId,
            displayName: m.displayName ?? "Player",
            riotGameName: riotGameName || null,
            riotTagLine: riotTagLine || null,
            valorantRoles: m.valorantRoles as never,
            peakPremierRank: m.peakPremier,
            sortOrder: playerOrder++,
          },
        });
      }
    }
  });

  await broadcastAuctionEvent(tournament.slug, {
    sessionId: session.id,
    version: session.version,
  });

  return { ok: true };
}

export async function exportAuctionCsv(tournamentSlug: string): Promise<string | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    include: {
      auctionSession: {
        include: {
          teams: {
            include: {
              players: {
                include: { registration: true },
              },
            },
          },
          players: {
            include: { registration: true, team: true },
          },
        },
      },
    },
  });
  if (!tournament?.auctionSession) return null;

  const rows = [["Team", "Player", "Riot ID", "Status", "Floor", "Sold Price"]];
  for (const p of tournament.auctionSession.players) {
    rows.push([
      p.team?.name ?? "",
      p.registration.snapshotDisplayName ?? "",
      p.registration.snapshotRiotId ?? "",
      p.status,
      String(p.floorPrice),
      p.soldPrice != null ? String(p.soldPrice) : "",
    ]);
  }

  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
