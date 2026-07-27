import { cheapestAvailableFloor, safeMaxBid } from "../domain/rules";

type RegistrationRankInfo = {
  snapshotRankTier?: string | null;
  snapshotCs2PeakPremier?: string | null;
  snapshotCs2FaceitRank?: string | null;
  snapshotCs2Hours?: number | null;
  user?: {
    image?: string | null;
    riotPlayerCard?: string | null;
    steamAvatarUrl?: string | null;
  } | null;
};

export type RawSession = {
  id: string;
  status: string;
  version?: number;
  pass: number;
  startingBudget: number;
  rosterSize: number;
  timerSeconds: number;
  minBidIncrement: number;
  currentPrice: number;
  highestBidderTeamId: string | null;
  highestBidderName: string | null;
  timerEndsAt: Date | null;
  bidHistory: unknown;
  currentRegistration:
    | ({
        id: string;
        snapshotDisplayName: string | null;
        snapshotAuctionFloor: number | null;
        snapshotRiotId: string | null;
      } & RegistrationRankInfo)
    | null;
  teams: Array<{
    id: string;
    name: string;
    captainUserId: string;
    startingBudget: number;
    currentBudget: number;
    coreDeduction: number;
    slotsFilled: number;
    players: Array<{
      soldPrice: number | null;
      registration: { snapshotDisplayName: string | null; snapshotRiotId: string | null };
    }>;
  }>;
  players: Array<{
    registrationId: string;
    floorPrice: number;
    status: string;
    soldPrice: number | null;
    teamId?: string | null;
    soldAt?: Date | null;
    nominationOrder?: number | null;
    registration: {
      snapshotDisplayName: string | null;
      snapshotRiotId: string | null;
      snapshotAuctionFloor: number | null;
    } & RegistrationRankInfo;
  }>;
};

function avatarUrl(reg: RegistrationRankInfo | null | undefined): string | null {
  return (
    reg?.user?.riotPlayerCard ??
    reg?.user?.steamAvatarUrl ??
    reg?.user?.image ??
    null
  );
}

function rankDetails(reg: RegistrationRankInfo | null | undefined) {
  return {
    premier: reg?.snapshotCs2PeakPremier ?? null,
    faceit: reg?.snapshotCs2FaceitRank ?? null,
    hours: reg?.snapshotCs2Hours ?? null,
    valorantRank: reg?.snapshotRankTier ?? null,
  };
}

export function presentAuctionSession(session: RawSession, viewerUserId?: string) {
  const poolFloors = session.players
    .filter((p) => p.status === "POOL" || p.status === "ON_AUCTION")
    .map((p) => p.floorPrice);
  const cheapestFloor = cheapestAvailableFloor(poolFloors);

  const teams = session.teams.map((team) => {
    const openSlots = Math.max(session.rosterSize - team.slotsFilled, 0);
    return {
      id: team.id,
      name: team.name,
      captainUserId: team.captainUserId,
      startingBudget: team.startingBudget,
      currentBudget: team.currentBudget,
      coreDeduction: team.coreDeduction,
      slotsFilled: team.slotsFilled,
      openSlots,
      rosterSize: session.rosterSize,
      safeMax: safeMaxBid({ currentBudget: team.currentBudget, openSlots, cheapestFloor }),
      isMe: viewerUserId ? team.captainUserId === viewerUserId : false,
      players: team.players.map((p) => ({
        displayName: p.registration.snapshotDisplayName,
        riotId: p.registration.snapshotRiotId,
        soldPrice: p.soldPrice,
      })),
    };
  });

  const myTeam = viewerUserId ? teams.find((t) => t.captainUserId === viewerUserId) : undefined;
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  return {
    id: session.id,
    status: session.status.toLowerCase(),
    version: (session as { version?: number }).version ?? 0,
    pass: session.pass,
    settings: {
      startingBudget: session.startingBudget,
      rosterSize: session.rosterSize,
      timerSeconds: session.timerSeconds,
      minBidIncrement: session.minBidIncrement,
    },
    currentPrice: session.currentPrice,
    highestBidder: session.highestBidderTeamId,
    highestBidderName: session.highestBidderName,
    timerEndsAt: session.timerEndsAt?.toISOString() ?? null,
    bidHistory: session.bidHistory ?? [],
    currentPlayer: session.currentRegistration
      ? {
          id: session.currentRegistration.id,
          name: session.currentRegistration.snapshotDisplayName,
          riotId: session.currentRegistration.snapshotRiotId,
          floor: session.currentRegistration.snapshotAuctionFloor,
          avatarUrl: avatarUrl(session.currentRegistration),
          ...rankDetails(session.currentRegistration),
        }
      : null,
    teams,
    myTeamId: myTeam?.id,
    pool: session.players
      .filter((p) => p.status === "POOL")
      .map((p) => ({
        registrationId: p.registrationId,
        name: p.registration.snapshotDisplayName,
        riotId: p.registration.snapshotRiotId,
        floor: p.floorPrice,
        nominationOrder: p.nominationOrder ?? null,
        avatarUrl: avatarUrl(p.registration),
        ...rankDetails(p.registration),
      })),
    sold: session.players
      .filter((p) => p.status === "SOLD")
      .sort((a, b) => (b.soldAt?.getTime?.() ?? 0) - (a.soldAt?.getTime?.() ?? 0))
      .map((p) => ({
        registrationId: p.registrationId,
        name: p.registration.snapshotDisplayName,
        soldPrice: p.soldPrice,
        teamId: p.teamId ?? null,
        teamName: p.teamId ? teamNameById.get(p.teamId) ?? null : null,
        soldAt: p.soldAt?.toISOString?.() ?? null,
      })),
    unsold: session.players
      .filter((p) => p.status === "UNSOLD")
      .map((p) => ({
        registrationId: p.registrationId,
        name: p.registration.snapshotDisplayName,
        floor: p.floorPrice,
      })),
    poolCount: session.players.filter((p) => p.status === "POOL").length,
    soldCount: session.players.filter((p) => p.status === "SOLD").length,
    unsoldCount: session.players.filter((p) => p.status === "UNSOLD").length,
    totalCount: session.players.length,
  };
}

export type PresentedAuctionSession = ReturnType<typeof presentAuctionSession>;
