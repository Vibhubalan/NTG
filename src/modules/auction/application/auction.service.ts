import { prisma } from "@core/database/client";
import type { AuctionSessionStatus } from "@prisma/client";
import { cheapestAvailableFloor, validateBid } from "../domain/rules";
import { normalizeRankConfig } from "../domain/rank-pricing";
import { computeTeamCoreDeduction } from "../domain/team-economy";
import { broadcastAuctionEvent } from "../infrastructure/auction-broadcast";
import { presentAuctionSession } from "./auction-presenter";
import { getAuctionRules } from "./auction-config.service";

type ActionResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const LIVE_STATUSES: AuctionSessionStatus[] = ["LIVE"];

async function notifyAuctionUpdate(sessionId: string) {
  const row = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    select: { id: true, version: true, tournament: { select: { slug: true } } },
  });
  if (!row) return;
  await broadcastAuctionEvent(row.tournament.slug, { sessionId: row.id, version: row.version });
}

/** Persist an admin/engine action to the auction activity log. */
export async function logAuctionEvent(
  sessionId: string,
  type: string,
  payload?: Record<string, unknown>,
) {
  try {
    await prisma.auctionEvent.create({
      data: { sessionId, type, payload: (payload ?? {}) as never },
    });
  } catch {
    // Activity log is best-effort; never block the action itself.
  }
}

export async function listAuctionEvents(sessionId: string, limit = 50) {
  return prisma.auctionEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

const registrationRankSelect = {
  snapshotRankTier: true,
  snapshotCs2PeakPremier: true,
  snapshotCs2FaceitRank: true,
  snapshotCs2Hours: true,
  user: {
    select: {
      image: true,
      riotPlayerCard: true,
      steamAvatarUrl: true,
    },
  },
} as const;

function sessionInclude() {
  return {
    teams: {
      orderBy: { name: "asc" as const },
      include: {
        players: {
          include: {
            registration: {
              select: {
                snapshotDisplayName: true,
                snapshotRiotId: true,
              },
            },
          },
        },
      },
    },
    players: {
      orderBy: [{ nominationOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        registration: {
          select: {
            snapshotDisplayName: true,
            snapshotRiotId: true,
            snapshotAuctionFloor: true,
            ...registrationRankSelect,
          },
        },
      },
    },
    currentRegistration: {
      select: {
        id: true,
        snapshotDisplayName: true,
        snapshotAuctionFloor: true,
        snapshotRiotId: true,
        ...registrationRankSelect,
      },
    },
  };
}

export async function createAuctionSessionForTournament(
  tournamentSlug: string,
  options?: {
    startingBudget?: number;
    rosterSize?: number;
    timerSeconds?: number;
    minBidIncrement?: number;
    rankTable?: unknown;
  },
): Promise<ActionResult<{ sessionId: string }>> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
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
      const team = tournament.tournamentTeams.find((t) => t.captainUserId === captainReg.userId);
      const coCaptainReg = team?.coCaptainUserId
        ? tournament.registrations.find(
            (r) => r.userId === team.coCaptainUserId && r.participantRole === "CO_CAPTAIN",
          )
        : null;
      const rankConfig = normalizeRankConfig(
        options?.rankTable ?? globalRankConfig,
        tournament.game,
      );
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
          name: captainReg.teamName ?? "Team",
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
          status: "POOL",
        })),
      });
    }

    return session;
  });

  return { ok: true, data: { sessionId: created.id } };
}

export async function setAuctionStatus(
  sessionId: string,
  status: AuctionSessionStatus,
): Promise<ActionResult<{ sessionId: string; status: AuctionSessionStatus }>> {
  const session = await prisma.auctionSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Auction session not found." };

  let timerEndsAt: Date | null = session.timerEndsAt;
  let pausedRemainingMs: number | null = session.pausedRemainingMs;

  if (status === "LIVE") {
    const now = Date.now();
    const durationMs = (pausedRemainingMs ?? session.timerSeconds * 1000);
    timerEndsAt = new Date(now + durationMs);
    pausedRemainingMs = null;
  } else if (status === "PAUSED" && session.timerEndsAt) {
    pausedRemainingMs = Math.max(session.timerEndsAt.getTime() - Date.now(), 0);
    timerEndsAt = null;
  }

  const updated = await prisma.auctionSession.update({
    where: { id: sessionId },
    data: { status, timerEndsAt, pausedRemainingMs },
    select: { id: true, status: true },
  });
  await logAuctionEvent(sessionId, "status_change", { from: session.status, to: status });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId: updated.id, status: updated.status } };
}

export async function nominatePlayer(
  sessionId: string,
  registrationId?: string,
): Promise<ActionResult<{ sessionId: string; registrationId: string }>> {
  const session = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    include: {
      players: {
        where: { status: "POOL" },
        orderBy: [{ nominationOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!session) return { ok: false, error: "Auction session not found." };

  const selected = registrationId
    ? session.players.find((p) => p.registrationId === registrationId)
    : session.players[0];
  if (!selected) return { ok: false, error: "No available player in pool." };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.auctionPlayer.update({
      where: { sessionId_registrationId: { sessionId, registrationId: selected.registrationId } },
      data: { status: "ON_AUCTION" },
    });
    return tx.auctionSession.update({
      where: { id: sessionId },
      data: {
        currentRegistrationId: selected.registrationId,
        currentPrice: selected.floorPrice,
        highestBidderTeamId: null,
        highestBidderName: null,
        timerEndsAt: new Date(Date.now() + session.timerSeconds * 1000),
        pausedRemainingMs: null,
        status: "LIVE",
      },
      select: { id: true, currentRegistrationId: true },
    });
  });

  await logAuctionEvent(sessionId, "nominate", {
    registrationId: selected.registrationId,
    floorPrice: selected.floorPrice,
  });
  await notifyAuctionUpdate(sessionId);
  return {
    ok: true,
    data: {
      sessionId: updated.id,
      registrationId: updated.currentRegistrationId!,
    },
  };
}

export async function placeBid(
  sessionId: string,
  actorUserId: string,
  amount: number,
): Promise<ActionResult<{ sessionId: string; amount: number }>> {
  const session = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    include: {
      teams: true,
      players: { where: { status: { in: ["POOL", "ON_AUCTION"] } } },
      currentRegistration: { select: { id: true } },
    },
  });
  if (!session) return { ok: false, error: "Auction session not found." };
  if (!LIVE_STATUSES.includes(session.status)) return { ok: false, error: "Auction is not live." };
  if (!session.currentRegistrationId) return { ok: false, error: "No player currently on auction." };

  const team = session.teams.find((t) => t.captainUserId === actorUserId);
  if (!team) return { ok: false, error: "Only captains can bid." };

  const cheapestFloor = cheapestAvailableFloor(session.players.map((p) => p.floorPrice));
  const openSlots = Math.max(session.rosterSize - team.slotsFilled, 0);
  const check = validateBid({
    auctionStatus: "live",
    amount,
    currentPrice: session.currentPrice,
    minIncrement: session.minBidIncrement,
    teamIsHighestBidder: session.highestBidderTeamId === team.id,
    openSlots,
    currentBudget: team.currentBudget,
    cheapestFloor,
  });
  if (!check.ok) return { ok: false, error: check.reason };

  const updated = await prisma.auctionSession.updateMany({
    where: { id: sessionId, version: session.version },
    data: {
      currentPrice: amount,
      highestBidderTeamId: team.id,
      highestBidderName: team.name,
      timerEndsAt: new Date(Date.now() + session.timerSeconds * 1000),
      bidHistory: [
        ...((session.bidHistory as Array<Record<string, unknown>> | null) ?? []),
        { at: new Date().toISOString(), amount, teamId: team.id, teamName: team.name },
      ] as never,
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    return { ok: false, error: "Bid conflict — another captain bid first. Try again." };
  }

  await logAuctionEvent(sessionId, "bid", {
    amount,
    teamId: team.id,
    teamName: team.name,
    registrationId: session.currentRegistrationId,
  });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId, amount } };
}

export async function sellCurrentPlayer(
  sessionId: string,
): Promise<ActionResult<{ sessionId: string }>> {
  const session = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    include: { teams: true },
  });
  if (!session) return { ok: false, error: "Auction session not found." };
  if (!session.currentRegistrationId) return { ok: false, error: "No nominated player." };
  if (!session.highestBidderTeamId || session.currentPrice <= 0) {
    await prisma.$transaction([
      prisma.auctionPlayer.update({
        where: { sessionId_registrationId: { sessionId, registrationId: session.currentRegistrationId } },
        data: { status: "UNSOLD", soldPrice: null, soldAt: new Date() },
      }),
      prisma.auctionSession.update({
        where: { id: sessionId },
        data: {
          currentRegistrationId: null,
          currentPrice: 0,
          highestBidderTeamId: null,
          highestBidderName: null,
          timerEndsAt: null,
          pausedRemainingMs: null,
          status: "IDLE",
          version: { increment: 1 },
        },
      }),
    ]);
    await logAuctionEvent(sessionId, "unsold", { registrationId: session.currentRegistrationId });
    await notifyAuctionUpdate(sessionId);
    return { ok: true, data: { sessionId } };
  }

  const winner = session.teams.find((t) => t.id === session.highestBidderTeamId);
  if (!winner) return { ok: false, error: "Winning team not found." };
  if (winner.currentBudget < session.currentPrice) return { ok: false, error: "Winning team budget insufficient." };

  await prisma.$transaction(async (tx) => {
    const sale = await tx.auctionSale.create({
      data: {
        sessionId,
        registrationId: session.currentRegistrationId!,
        teamId: winner.id,
        price: session.currentPrice,
      },
    });

    await tx.auctionPlayer.update({
      where: { sessionId_registrationId: { sessionId, registrationId: session.currentRegistrationId! } },
      data: {
        status: "SOLD",
        soldPrice: session.currentPrice,
        teamId: winner.id,
        soldAt: new Date(),
      },
    });

    await tx.auctionTeam.update({
      where: { id: winner.id },
      data: {
        currentBudget: { decrement: session.currentPrice },
        slotsFilled: { increment: 1 },
      },
    });

    await tx.auctionSession.update({
      where: { id: sessionId },
      data: {
        lastSaleId: sale.id,
        currentRegistrationId: null,
        currentPrice: 0,
        highestBidderTeamId: null,
        highestBidderName: null,
        timerEndsAt: null,
        pausedRemainingMs: null,
        status: "IDLE",
        version: { increment: 1 },
      },
    });
  });

  await logAuctionEvent(sessionId, "sold", {
    registrationId: session.currentRegistrationId,
    teamId: winner.id,
    teamName: winner.name,
    price: session.currentPrice,
  });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId } };
}

export async function skipCurrentPlayer(sessionId: string): Promise<ActionResult<{ sessionId: string }>> {
  const session = await prisma.auctionSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Auction session not found." };
  if (!session.currentRegistrationId) return { ok: false, error: "No player on the block." };

  await prisma.$transaction([
    prisma.auctionPlayer.update({
      where: {
        sessionId_registrationId: { sessionId, registrationId: session.currentRegistrationId },
      },
      data: { status: "POOL" },
    }),
    prisma.auctionSession.update({
      where: { id: sessionId },
      data: {
        currentRegistrationId: null,
        currentPrice: 0,
        highestBidderTeamId: null,
        highestBidderName: null,
        timerEndsAt: null,
        pausedRemainingMs: null,
        status: "IDLE",
        bidHistory: [],
        version: { increment: 1 },
      },
    }),
  ]);

  await logAuctionEvent(sessionId, "skip", { registrationId: session.currentRegistrationId });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId } };
}

export async function forceSellCurrentPlayer(sessionId: string): Promise<ActionResult<{ sessionId: string }>> {
  return sellCurrentPlayer(sessionId);
}

export async function undoLastSale(sessionId: string): Promise<ActionResult<{ sessionId: string }>> {
  const session = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    include: { lastSale: true },
  });
  if (!session) return { ok: false, error: "Auction session not found." };
  if (session.status !== "IDLE") {
    return { ok: false, error: "Finish the current player before undoing." };
  }
  if (!session.lastSale || session.lastSale.undoneAt) {
    return { ok: false, error: "Nothing to undo." };
  }

  const sale = session.lastSale;

  await prisma.$transaction(async (tx) => {
    await tx.auctionTeam.update({
      where: { id: sale.teamId },
      data: {
        currentBudget: { increment: sale.price },
        slotsFilled: { decrement: 1 },
      },
    });
    await tx.auctionPlayer.update({
      where: { sessionId_registrationId: { sessionId, registrationId: sale.registrationId } },
      data: { status: "POOL", soldPrice: null, teamId: null, soldAt: null },
    });
    await tx.auctionSale.update({
      where: { id: sale.id },
      data: { undoneAt: new Date() },
    });
    await tx.auctionSession.update({
      where: { id: sessionId },
      data: { lastSaleId: null, version: { increment: 1 } },
    });
  });

  await logAuctionEvent(sessionId, "undo_sale", {
    registrationId: sale.registrationId,
    teamId: sale.teamId,
    price: sale.price,
  });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId } };
}

export async function manualSellPlayer(
  sessionId: string,
  input: { registrationId?: string; teamId: string; price: number },
): Promise<ActionResult<{ sessionId: string }>> {
  const session = await prisma.auctionSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Auction session not found." };

  const targetId = input.registrationId ?? session.currentRegistrationId;
  if (!targetId) return { ok: false, error: "No player selected." };

  const player = await prisma.auctionPlayer.findUnique({
    where: { sessionId_registrationId: { sessionId, registrationId: targetId } },
  });
  if (!player || player.status === "SOLD") return { ok: false, error: "Player not available." };

  const team = await prisma.auctionTeam.findFirst({
    where: { id: input.teamId, sessionId },
  });
  if (!team) return { ok: false, error: "Team not found." };
  if (team.currentBudget < input.price) return { ok: false, error: "Team budget insufficient." };

  const isCurrent = targetId === session.currentRegistrationId;

  await prisma.$transaction(async (tx) => {
    const sale = await tx.auctionSale.create({
      data: {
        sessionId,
        registrationId: targetId,
        teamId: team.id,
        price: input.price,
      },
    });

    await tx.auctionPlayer.update({
      where: { sessionId_registrationId: { sessionId, registrationId: targetId } },
      data: {
        status: "SOLD",
        soldPrice: input.price,
        teamId: team.id,
        soldAt: new Date(),
      },
    });

    await tx.auctionTeam.update({
      where: { id: team.id },
      data: {
        currentBudget: { decrement: input.price },
        slotsFilled: { increment: 1 },
      },
    });

    if (isCurrent) {
      await tx.auctionSession.update({
        where: { id: sessionId },
        data: {
          lastSaleId: sale.id,
          currentRegistrationId: null,
          currentPrice: 0,
          highestBidderTeamId: null,
          highestBidderName: null,
          timerEndsAt: null,
          pausedRemainingMs: null,
          status: "IDLE",
          bidHistory: [],
          version: { increment: 1 },
        },
      });
    } else {
      await tx.auctionSession.update({
        where: { id: sessionId },
        data: { lastSaleId: sale.id, version: { increment: 1 } },
      });
    }
  });

  await logAuctionEvent(sessionId, "manual_sell", {
    registrationId: targetId,
    teamId: team.id,
    teamName: team.name,
    price: input.price,
  });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId } };
}

export async function adjustAuctionTimer(
  sessionId: string,
  seconds: number,
): Promise<ActionResult<{ sessionId: string; timerEndsAt: string | null }>> {
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 120) {
    return { ok: false, error: "Timer must be between 1 and 120 seconds." };
  }

  const session = await prisma.auctionSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Auction session not found." };

  const timerEndsAt =
    session.status === "LIVE" && session.currentRegistrationId
      ? new Date(Date.now() + seconds * 1000)
      : session.timerEndsAt;

  const updated = await prisma.auctionSession.update({
    where: { id: sessionId },
    data: {
      timerSeconds: seconds,
      timerEndsAt,
      version: { increment: 1 },
    },
    select: { timerEndsAt: true },
  });

  await logAuctionEvent(sessionId, "timer_adjust", { seconds });
  await notifyAuctionUpdate(sessionId);
  return {
    ok: true,
    data: { sessionId, timerEndsAt: updated.timerEndsAt?.toISOString() ?? null },
  };
}

export async function endAuction(sessionId: string): Promise<ActionResult<{ sessionId: string }>> {
  const updated = await prisma.auctionSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETE",
      currentRegistrationId: null,
      timerEndsAt: null,
      pausedRemainingMs: null,
      version: { increment: 1 },
    },
    select: { id: true },
  });
  await logAuctionEvent(sessionId, "auction_end", {});
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId: updated.id } };
}

export async function syncPlayerPool(sessionId: string): Promise<ActionResult<{ added: number }>> {
  const session = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    include: { tournament: true, players: { select: { registrationId: true } } },
  });
  if (!session) return { ok: false, error: "Auction session not found." };

  const existing = new Set(session.players.map((p) => p.registrationId));
  const regs = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentId: session.tournamentId,
      status: "APPROVED",
      participantRole: "PLAYER",
    },
    select: { id: true, snapshotAuctionFloor: true },
  });

  const toAdd = regs.filter((r) => !existing.has(r.id));
  if (toAdd.length > 0) {
    await prisma.auctionPlayer.createMany({
      data: toAdd.map((reg) => ({
        sessionId,
        registrationId: reg.id,
        floorPrice: Math.max(reg.snapshotAuctionFloor ?? 2, 2),
        status: "POOL",
      })),
    });
    await prisma.auctionSession.update({
      where: { id: sessionId },
      data: { version: { increment: 1 } },
    });
    await logAuctionEvent(sessionId, "pool_sync", { added: toAdd.length });
    await notifyAuctionUpdate(sessionId);
  }

  return { ok: true, data: { added: toAdd.length } };
}

export async function syncAllAuctionPools(): Promise<{ sessions: number; added: number }> {
  const sessions = await prisma.auctionSession.findMany({
    where: { status: { not: "COMPLETE" } },
    select: { id: true },
  });
  let added = 0;
  for (const s of sessions) {
    const res = await syncPlayerPool(s.id);
    if (res.ok) added += res.data.added;
  }
  return { sessions: sessions.length, added };
}

/** Reorders the nomination queue; ids not listed keep their relative order after the listed ones. */
export async function reorderQueue(
  sessionId: string,
  orderedRegistrationIds: string[],
): Promise<ActionResult<{ updated: number }>> {
  const session = await prisma.auctionSession.findUnique({
    where: { id: sessionId },
    include: {
      players: {
        where: { status: "POOL" },
        orderBy: [{ nominationOrder: "asc" }, { createdAt: "asc" }],
        select: { registrationId: true },
      },
    },
  });
  if (!session) return { ok: false, error: "Auction session not found." };

  const poolIds = new Set(session.players.map((p) => p.registrationId));
  const ordered = orderedRegistrationIds.filter((id) => poolIds.has(id));
  const rest = session.players
    .map((p) => p.registrationId)
    .filter((id) => !ordered.includes(id));
  const finalOrder = [...ordered, ...rest];

  await prisma.$transaction(
    finalOrder.map((registrationId, index) =>
      prisma.auctionPlayer.update({
        where: { sessionId_registrationId: { sessionId, registrationId } },
        data: { nominationOrder: index + 1 },
      }),
    ),
  );
  await prisma.auctionSession.update({
    where: { id: sessionId },
    data: { version: { increment: 1 } },
  });

  await logAuctionEvent(sessionId, "queue_reorder", { count: finalOrder.length });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { updated: finalOrder.length } };
}

/** Moves an UNSOLD player back into the pool (optionally straight onto the block). */
export async function reAuctionPlayer(
  sessionId: string,
  registrationId: string,
  options?: { nominate?: boolean },
): Promise<ActionResult<{ sessionId: string; registrationId: string }>> {
  const player = await prisma.auctionPlayer.findUnique({
    where: { sessionId_registrationId: { sessionId, registrationId } },
  });
  if (!player) return { ok: false, error: "Player not found in this auction." };
  if (player.status !== "UNSOLD") return { ok: false, error: "Only unsold players can be re-auctioned." };

  const maxOrder = await prisma.auctionPlayer.aggregate({
    where: { sessionId },
    _max: { nominationOrder: true },
  });

  await prisma.$transaction([
    prisma.auctionPlayer.update({
      where: { sessionId_registrationId: { sessionId, registrationId } },
      data: {
        status: "POOL",
        soldPrice: null,
        teamId: null,
        soldAt: null,
        nominationOrder: (maxOrder._max.nominationOrder ?? 0) + 1,
      },
    }),
    prisma.auctionSession.update({
      where: { id: sessionId },
      data: { version: { increment: 1 } },
    }),
  ]);

  await logAuctionEvent(sessionId, "re_auction", { registrationId });
  await notifyAuctionUpdate(sessionId);

  if (options?.nominate) {
    return nominatePlayer(sessionId, registrationId);
  }
  return { ok: true, data: { sessionId, registrationId } };
}

/** Marks a pool (or on-block) player as unsold without waiting for the timer. */
export async function markPlayerUnsold(
  sessionId: string,
  registrationId?: string,
): Promise<ActionResult<{ sessionId: string; registrationId: string }>> {
  const session = await prisma.auctionSession.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, error: "Auction session not found." };

  const targetId = registrationId ?? session.currentRegistrationId;
  if (!targetId) return { ok: false, error: "No player selected." };

  const player = await prisma.auctionPlayer.findUnique({
    where: { sessionId_registrationId: { sessionId, registrationId: targetId } },
  });
  if (!player) return { ok: false, error: "Player not found in this auction." };
  if (player.status === "SOLD") return { ok: false, error: "Player already sold — undo the sale instead." };

  const isCurrent = targetId === session.currentRegistrationId;

  await prisma.$transaction([
    prisma.auctionPlayer.update({
      where: { sessionId_registrationId: { sessionId, registrationId: targetId } },
      data: { status: "UNSOLD", soldPrice: null, teamId: null, soldAt: new Date() },
    }),
    prisma.auctionSession.update({
      where: { id: sessionId },
      data: isCurrent
        ? {
            currentRegistrationId: null,
            currentPrice: 0,
            highestBidderTeamId: null,
            highestBidderName: null,
            timerEndsAt: null,
            pausedRemainingMs: null,
            status: "IDLE",
            bidHistory: [],
            version: { increment: 1 },
          }
        : { version: { increment: 1 } },
    }),
  ]);

  await logAuctionEvent(sessionId, "mark_unsold", { registrationId: targetId });
  await notifyAuctionUpdate(sessionId);
  return { ok: true, data: { sessionId, registrationId: targetId } };
}

export async function tickAuctions(now: Date = new Date()): Promise<{ processed: number }> {
  const due = await prisma.auctionSession.findMany({
    where: {
      status: "LIVE",
      timerEndsAt: { lte: now },
      currentRegistrationId: { not: null },
    },
    select: { id: true },
  });

  for (const row of due) {
    await sellCurrentPlayer(row.id);
  }
  return { processed: due.length };
}

export async function getAuctionPublicState(tournamentSlug: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      game: true,
      status: true,
      autoManageStatus: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      auctionStartsAt: true,
      auctionEndsAt: true,
      startsAt: true,
      endsAt: true,
      registrationFormat: true,
      auctionSession: {
        include: sessionInclude(),
      },
    },
  });
  if (!tournament) return null;
  return tournament;
}

export async function getPresentedAuctionState(tournamentSlug: string, viewerUserId?: string) {
  const data = await getAuctionPublicState(tournamentSlug);
  if (!data?.auctionSession) return { tournament: data, session: null };
  return {
    tournament: data,
    session: presentAuctionSession(data.auctionSession, viewerUserId),
  };
}
