import { prisma } from "@core/database/client";
import { henrikFetch, henrikHeaders } from "@/lib/henrik-client";
import { normalizeHenrikRegion } from "@/lib/henrik-region";
import { slugWhere } from "@/lib/slug-utils";
import {
  computeAcs,
  computeAdr,
  computeHsPercent,
  isCommonCustomMatch,
  normalizeGameSide,
  resolveTeamSideMajority,
  type MatchLobbyPlayer,
  type RosterPlayerIdentity,
} from "@/lib/tournament-games";
import {
  parseRiotId,
  resolveRiotAccount,
} from "@auth-membership/application/riot-henrik.service";
import {
  GameSlug,
  LeaderboardScope,
  Prisma,
  TournamentGameSide,
  TournamentGameStatus,
} from "@prisma/client";

const SCAN_TIME_BUDGET_MS = 38_000;
/** Details checked per scan chunk (Henrik ~2.3s gap each). */
const DETAILS_PER_CHUNK = 3;
const DEFAULT_HISTORY_SIZE = 20;
const DEFAULT_MIN_PLAYERS = 5;

export type TournamentGamePlayerView = {
  id: string;
  puuid: string;
  userId: string | null;
  teamId: string | null;
  riotGameName: string;
  riotTagLine: string;
  riotId: string;
  side: "Red" | "Blue";
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  damage: number;
  acs: number;
  adr: number;
  hsPercent: number;
  rankTier: string | null;
};

export type TournamentGameView = {
  id: string;
  henrikMatchId: string;
  mapName: string | null;
  gameLengthSec: number | null;
  startedAt: string | null;
  region: string | null;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamARounds: number;
  teamBRounds: number;
  winnerSide: "Red" | "Blue" | null;
  teamAPresent: number;
  teamBPresent: number;
  status: TournamentGameStatus;
  scannedAt: string;
  publishedAt: string | null;
  players: TournamentGamePlayerView[];
  mvpRiotId: string | null;
  mvpAcs: number | null;
};

type HenrikMatchHistoryItem = {
  metadata?: {
    matchid?: string;
    map?: string;
    game_start?: number;
    game_length?: number;
    region?: string;
  };
};

type HenrikMatchDetail = {
  data?: {
    metadata?: {
      matchid?: string;
      map?: string;
      game_start?: number;
      game_length?: number;
      region?: string;
    };
    players?: {
      all_players?: MatchLobbyPlayer[];
    };
    teams?: {
      red?: { rounds_won?: number };
      blue?: { rounds_won?: number };
    };
  };
};

function encodePath(s: string): string {
  return encodeURIComponent(s);
}

async function fetchHistoryUrl(url: string): Promise<HenrikMatchHistoryItem[]> {
  const res = await henrikFetch(url, {
    headers: henrikHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Henrik match history failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: HenrikMatchHistoryItem[] };
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchCustomMatchHistory(opts: {
  region: string;
  puuid?: string | null;
  gameName?: string | null;
  tagLine?: string | null;
  size: number;
}): Promise<HenrikMatchHistoryItem[]> {
  const region = normalizeHenrikRegion(opts.region);
  const size = Math.min(Math.max(opts.size, 1), 30);

  // Prefer name#tag (same path as the proven sample script), then by-puuid.
  const urls: string[] = [];
  if (opts.gameName && opts.tagLine) {
    urls.push(
      `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodePath(opts.gameName)}/${encodePath(opts.tagLine)}?mode=custom&size=${size}`,
    );
  }
  if (opts.puuid) {
    urls.push(
      `https://api.henrikdev.xyz/valorant/v3/by-puuid/matches/${region}/${encodePath(opts.puuid)}?mode=custom&size=${size}`,
    );
  }
  if (!urls.length) return [];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      return await fetchHistoryUrl(url);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("Failed to fetch match history.");
}

async function fetchMatchDetails(matchId: string): Promise<HenrikMatchDetail | null> {
  const res = await henrikFetch(
    `https://api.henrikdev.xyz/valorant/v2/match/${encodePath(matchId)}`,
    { headers: henrikHeaders(), next: { revalidate: 0 } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Henrik match detail failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as HenrikMatchDetail;
}

function splitRiotFields(
  gameName: string | null | undefined,
  tagLine: string | null | undefined,
  snapshotRiotId: string | null | undefined,
): { gameName: string; tagLine: string } | null {
  if (gameName?.trim() && tagLine?.trim()) {
    return { gameName: gameName.trim(), tagLine: tagLine.trim() };
  }
  if (snapshotRiotId) return parseRiotId(snapshotRiotId);
  return null;
}

async function resolveTeamRoster(
  teamId: string,
): Promise<{ teamName: string; players: RosterPlayerIdentity[]; region: string }> {
  const team = await prisma.tournamentTeam.findUnique({
    where: { id: teamId },
    include: {
      players: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: true,
          registration: true,
        },
      },
    },
  });
  if (!team) throw new Error("Team not found.");

  const players: RosterPlayerIdentity[] = [];
  let region = "ap";

  for (const row of team.players) {
    const fromUser = row.user
      ? splitRiotFields(row.user.riotGameName, row.user.riotTagLine, null)
      : null;
    const fromRow = splitRiotFields(row.riotGameName, row.riotTagLine, null);
    const fromReg = splitRiotFields(
      null,
      null,
      row.registration?.snapshotRiotId ?? null,
    );
    const identity = fromUser ?? fromRow ?? fromReg;
    let puuid = row.user?.riotPuuid ?? null;

    if (!puuid && identity) {
      try {
        const account = await resolveRiotAccount(identity.gameName, identity.tagLine);
        if (account?.puuid) {
          puuid = account.puuid;
          if (account.region) region = normalizeHenrikRegion(account.region);
          if (row.userId) {
            await prisma.user.update({
              where: { id: row.userId },
              data: {
                riotPuuid: account.puuid,
                riotGameName: account.gameName,
                riotTagLine: account.tagLine,
                riotRegion: account.region ?? undefined,
              },
            });
          }
        }
      } catch {
        // Skip unresolvable players for this scan.
      }
    } else if (row.user?.riotRegion) {
      region = normalizeHenrikRegion(row.user.riotRegion);
    }

    if (!puuid || !identity) continue;

    players.push({
      puuid,
      userId: row.userId,
      teamId: team.id,
      riotGameName: identity.gameName,
      riotTagLine: identity.tagLine,
    });
  }

  return { teamName: team.name, players, region };
}

function mapPlayerRows(
  lobby: MatchLobbyPlayer[],
  rosterByPuuid: Map<string, RosterPlayerIdentity>,
  teamAPuuids: Set<string>,
  teamBPuuids: Set<string>,
  teamAId: string,
  teamBId: string,
  teamASide: "Red" | "Blue" | null,
) {
  return lobby
    .filter((p) => p.puuid)
    .map((p) => {
      const roster = rosterByPuuid.get(p.puuid);
      const side = normalizeGameSide(p.team) ?? "Red";
      let teamId: string | null = roster?.teamId ?? null;

      if (!teamId && teamASide) {
        teamId = side === teamASide ? teamAId : teamBId;
      } else if (!teamId && teamAPuuids.has(p.puuid)) {
        teamId = teamAId;
      } else if (!teamId && teamBPuuids.has(p.puuid)) {
        teamId = teamBId;
      }

      const stats = p.stats ?? {};
      return {
        puuid: p.puuid,
        userId: roster?.userId ?? null,
        teamId,
        riotGameName: p.name ?? roster?.riotGameName ?? "Unknown",
        riotTagLine: p.tag ?? roster?.riotTagLine ?? "",
        side: side as TournamentGameSide,
        agent: p.character ?? null,
        kills: stats.kills ?? 0,
        deaths: stats.deaths ?? 0,
        assists: stats.assists ?? 0,
        score: stats.score ?? 0,
        damage: p.damage_made ?? 0,
        headshots: stats.headshots ?? 0,
        bodyshots: stats.bodyshots ?? 0,
        legshots: stats.legshots ?? 0,
      };
    });
}

async function upsertCandidateGame(opts: {
  tournamentId: string;
  henrikMatchId: string;
  detail: HenrikMatchDetail;
  teamAId: string;
  teamBId: string;
  teamAPuuids: Set<string>;
  teamBPuuids: Set<string>;
  rosterByPuuid: Map<string, RosterPlayerIdentity>;
  teamAPresent: number;
  teamBPresent: number;
  region: string;
}): Promise<{ id: string; created: boolean }> {
  const meta = opts.detail.data?.metadata;
  const teams = opts.detail.data?.teams;
  const lobby = opts.detail.data?.players?.all_players ?? [];
  const redRounds = teams?.red?.rounds_won ?? 0;
  const blueRounds = teams?.blue?.rounds_won ?? 0;
  const teamASide = resolveTeamSideMajority(opts.teamAPuuids, lobby);

  let teamARounds = 0;
  let teamBRounds = 0;
  if (teamASide === "Red") {
    teamARounds = redRounds;
    teamBRounds = blueRounds;
  } else if (teamASide === "Blue") {
    teamARounds = blueRounds;
    teamBRounds = redRounds;
  } else {
    teamARounds = redRounds;
    teamBRounds = blueRounds;
  }

  let winnerSide: TournamentGameSide | null = null;
  if (redRounds > blueRounds) winnerSide = TournamentGameSide.Red;
  else if (blueRounds > redRounds) winnerSide = TournamentGameSide.Blue;

  const playerRows = mapPlayerRows(
    lobby,
    opts.rosterByPuuid,
    opts.teamAPuuids,
    opts.teamBPuuids,
    opts.teamAId,
    opts.teamBId,
    teamASide,
  );

  const existing = await prisma.tournamentGame.findUnique({
    where: {
      tournamentId_henrikMatchId: {
        tournamentId: opts.tournamentId,
        henrikMatchId: opts.henrikMatchId,
      },
    },
  });

  if (existing?.status === TournamentGameStatus.PUBLISHED) {
    return { id: existing.id, created: false };
  }

  const startedAt =
    typeof meta?.game_start === "number" && Number.isFinite(meta.game_start)
      ? new Date(meta.game_start * 1000)
      : null;
  const safeStartedAt =
    startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null;

  let payloadJson: Prisma.InputJsonValue | undefined;
  try {
    payloadJson = JSON.parse(JSON.stringify(opts.detail)) as Prisma.InputJsonValue;
  } catch {
    payloadJson = undefined;
  }

  const data = {
    mapName: meta?.map ?? null,
    gameLengthSec: meta?.game_length ?? null,
    startedAt: safeStartedAt,
    region: meta?.region ?? opts.region,
    teamAId: opts.teamAId,
    teamBId: opts.teamBId,
    teamARounds,
    teamBRounds,
    winnerSide,
    teamAPresent: opts.teamAPresent,
    teamBPresent: opts.teamBPresent,
    status: TournamentGameStatus.CANDIDATE,
    payloadJson,
    scannedAt: new Date(),
  };

  const game = existing
    ? await prisma.tournamentGame.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.tournamentGame.create({
        data: {
          tournamentId: opts.tournamentId,
          henrikMatchId: opts.henrikMatchId,
          ...data,
        },
      });

  await prisma.tournamentGamePlayer.deleteMany({ where: { gameId: game.id } });
  const uniquePlayers = new Map<string, (typeof playerRows)[number]>();
  for (const p of playerRows) {
    if (!p.puuid || uniquePlayers.has(p.puuid)) continue;
    uniquePlayers.set(p.puuid, p);
  }
  if (uniquePlayers.size) {
    await prisma.tournamentGamePlayer.createMany({
      data: [...uniquePlayers.values()].map((p) => ({
        gameId: game.id,
        ...p,
      })),
      skipDuplicates: true,
    });
  }

  return { id: game.id, created: !existing };
}

function toGameView(
  game: {
    id: string;
    henrikMatchId: string;
    mapName: string | null;
    gameLengthSec: number | null;
    startedAt: Date | null;
    region: string | null;
    teamAId: string;
    teamBId: string;
    teamARounds: number;
    teamBRounds: number;
    winnerSide: TournamentGameSide | null;
    teamAPresent: number;
    teamBPresent: number;
    status: TournamentGameStatus;
    scannedAt: Date;
    publishedAt: Date | null;
    teamA: { name: string };
    teamB: { name: string };
    players: Array<{
      id: string;
      puuid: string;
      userId: string | null;
      teamId: string | null;
      riotGameName: string;
      riotTagLine: string;
      side: TournamentGameSide;
      agent: string | null;
      kills: number;
      deaths: number;
      assists: number;
      score: number;
      damage: number;
      headshots: number;
      bodyshots: number;
      legshots: number;
      user?: {
        leaderboard?: Array<{ rankTier: string | null }>;
        registrations?: Array<{ snapshotRankTier: string | null }>;
      } | null;
    }>;
  },
): TournamentGameView {
  const totalRounds = game.teamARounds + game.teamBRounds;
  const players: TournamentGamePlayerView[] = game.players.map((p) => {
    const lb = p.user?.leaderboard?.[0]?.rankTier ?? null;
    const snap = p.user?.registrations?.[0]?.snapshotRankTier ?? null;
    return {
      id: p.id,
      puuid: p.puuid,
      userId: p.userId,
      teamId: p.teamId,
      riotGameName: p.riotGameName,
      riotTagLine: p.riotTagLine,
      riotId: `${p.riotGameName}#${p.riotTagLine}`,
      side: p.side,
      agent: p.agent,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      score: p.score,
      damage: p.damage,
      acs: computeAcs(p.score, totalRounds),
      adr: computeAdr(p.damage, totalRounds),
      hsPercent: computeHsPercent(p.headshots, p.bodyshots, p.legshots),
      rankTier: lb ?? snap ?? null,
    };
  });

  let mvpRiotId: string | null = null;
  let mvpAcs: number | null = null;
  for (const p of players) {
    if (mvpAcs == null || p.acs > mvpAcs) {
      mvpAcs = p.acs;
      mvpRiotId = p.riotId;
    }
  }

  return {
    id: game.id,
    henrikMatchId: game.henrikMatchId,
    mapName: game.mapName,
    gameLengthSec: game.gameLengthSec,
    startedAt: game.startedAt?.toISOString() ?? null,
    region: game.region,
    teamAId: game.teamAId,
    teamBId: game.teamBId,
    teamAName: game.teamA.name,
    teamBName: game.teamB.name,
    teamARounds: game.teamARounds,
    teamBRounds: game.teamBRounds,
    winnerSide: game.winnerSide,
    teamAPresent: game.teamAPresent,
    teamBPresent: game.teamBPresent,
    status: game.status,
    scannedAt: game.scannedAt.toISOString(),
    publishedAt: game.publishedAt?.toISOString() ?? null,
    players,
    mvpRiotId,
    mvpAcs,
  };
}

function gameInclude(tournamentId: string): Prisma.TournamentGameInclude {
  return {
    teamA: { select: { name: true } },
    teamB: { select: { name: true } },
    players: {
      include: {
        user: {
          include: {
            leaderboard: {
              where: { scope: LeaderboardScope.TOWN, game: GameSlug.VALORANT },
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
            registrations: {
              where: { tournamentId },
              take: 1,
            },
          },
        },
      },
    },
  };
}

export async function listTournamentGamesAdmin(slug: string): Promise<{
  ok: true;
  games: TournamentGameView[];
} | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findFirst({ where: slugWhere(slug) });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const games = await prisma.tournamentGame.findMany({
    where: { tournamentId: tournament.id },
    include: gameInclude(tournament.id),
    orderBy: [{ startedAt: "desc" }, { scannedAt: "desc" }],
  });

  return { ok: true, games: games.map(toGameView) };
}

export async function listPublishedTournamentGames(slug: string): Promise<{
  ok: true;
  yourGamesEnabled: boolean;
  games: TournamentGameView[];
} | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findFirst({ where: slugWhere(slug) });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const games = await prisma.tournamentGame.findMany({
    where: {
      tournamentId: tournament.id,
      status: TournamentGameStatus.PUBLISHED,
    },
    include: gameInclude(tournament.id),
    orderBy: [{ startedAt: "desc" }, { publishedAt: "desc" }],
  });

  return {
    ok: true,
    yourGamesEnabled: tournament.yourGamesEnabled,
    games: games.map(toGameView),
  };
}

export type ScanChunkResult = {
  done: boolean;
  cursor: number;
  total: number;
  checked: number;
  found: TournamentGameView[];
  progress: string;
  teamAResolved: number;
  teamBResolved: number;
};

export async function scanTournamentGamesChunk(opts: {
  slug: string;
  teamAId: string;
  teamBId: string;
  cursor?: number;
  minPlayersPerTeam?: number;
  historySize?: number;
}): Promise<{ ok: true; result: ScanChunkResult } | { ok: false; error: string }> {
  try {
    const tournament = await prisma.tournament.findFirst({ where: slugWhere(opts.slug) });
    if (!tournament) return { ok: false, error: "Tournament not found." };

    if (opts.teamAId === opts.teamBId) {
      return { ok: false, error: "Select two different teams." };
    }

    const [teamA, teamB] = await Promise.all([
      prisma.tournamentTeam.findFirst({
        where: { id: opts.teamAId, tournamentId: tournament.id },
      }),
      prisma.tournamentTeam.findFirst({
        where: { id: opts.teamBId, tournamentId: tournament.id },
      }),
    ]);
    if (!teamA || !teamB) return { ok: false, error: "Teams must belong to this tournament." };

    const started = Date.now();
    const minPlayers = opts.minPlayersPerTeam ?? DEFAULT_MIN_PLAYERS;
    const historySize = opts.historySize ?? DEFAULT_HISTORY_SIZE;
    const cursor = Math.max(0, opts.cursor ?? 0);

    const [rosterA, rosterB] = await Promise.all([
      resolveTeamRoster(opts.teamAId),
      resolveTeamRoster(opts.teamBId),
    ]);

    if (rosterA.players.length < minPlayers || rosterB.players.length < minPlayers) {
      return {
        ok: false,
        error: `Need at least ${minPlayers} resolvable Riot identities per team (A=${rosterA.players.length}, B=${rosterB.players.length}).`,
      };
    }

    const teamAPuuids = new Set(rosterA.players.map((p) => p.puuid));
    const teamBPuuids = new Set(rosterB.players.map((p) => p.puuid));
    const rosterByPuuid = new Map<string, RosterPlayerIdentity>();
    for (const p of [...rosterA.players, ...rosterB.players]) {
      rosterByPuuid.set(p.puuid, p);
    }

    const scanner = rosterA.players[0]!;
    const region = rosterA.region || rosterB.region || "ap";

    let history: HenrikMatchHistoryItem[] = [];
    try {
      history = await fetchCustomMatchHistory({
        region,
        puuid: scanner.puuid,
        gameName: scanner.riotGameName,
        tagLine: scanner.riotTagLine,
        size: historySize,
      });
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to fetch match history.",
      };
    }

    const total = history.length;
    if (cursor >= total) {
      return {
        ok: true,
        result: {
          done: true,
          cursor: total,
          total,
          checked: 0,
          found: [],
          progress: `Scanned all ${total} custom matches.`,
          teamAResolved: rosterA.players.length,
          teamBResolved: rosterB.players.length,
        },
      };
    }

    const foundIds: string[] = [];
    let checked = 0;
    let nextCursor = cursor;

    for (let i = cursor; i < total; i++) {
      if (Date.now() - started > SCAN_TIME_BUDGET_MS) break;
      if (checked >= DETAILS_PER_CHUNK) break;

      const matchId = history[i]?.metadata?.matchid;
      nextCursor = i + 1;
      if (!matchId) {
        checked += 1;
        continue;
      }

      let detail: HenrikMatchDetail | null;
      try {
        detail = await fetchMatchDetails(matchId);
      } catch (err) {
        console.error("[tournament-games] detail failed", matchId, err);
        checked += 1;
        continue;
      }
      checked += 1;
      if (!detail?.data) continue;

      const lobby = detail.data.players?.all_players ?? [];
      const lobbyPuuids = new Set(lobby.map((p) => p.puuid).filter(Boolean));
      const overlap = isCommonCustomMatch({
        teamAPuuids,
        teamBPuuids,
        lobbyPuuids,
        minPlayersPerTeam: minPlayers,
      });
      if (!overlap.match) continue;

      try {
        const upserted = await upsertCandidateGame({
          tournamentId: tournament.id,
          henrikMatchId: matchId,
          detail,
          teamAId: opts.teamAId,
          teamBId: opts.teamBId,
          teamAPuuids,
          teamBPuuids,
          rosterByPuuid,
          teamAPresent: overlap.teamAPresent,
          teamBPresent: overlap.teamBPresent,
          region,
        });
        foundIds.push(upserted.id);
      } catch (err) {
        console.error("[tournament-games] upsert failed", matchId, err);
      }
    }

    let found: TournamentGameView[] = [];
    if (foundIds.length > 0) {
      try {
        const foundGames = await prisma.tournamentGame.findMany({
          where: { id: { in: foundIds } },
          include: gameInclude(tournament.id),
        });
        found = foundGames.map(toGameView);
      } catch (err) {
        console.error("[tournament-games] load found failed", err);
      }
    }

    const done = nextCursor >= total;
    return {
      ok: true,
      result: {
        done,
        cursor: nextCursor,
        total,
        checked,
        found,
        progress: done
          ? `Finished scanning ${total} custom matches.`
          : `Checked ${nextCursor}/${total} custom matches…`,
        teamAResolved: rosterA.players.length,
        teamBResolved: rosterB.players.length,
      },
    };
  } catch (err) {
    console.error("[tournament-games] scan chunk failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Scan failed unexpectedly.",
    };
  }
}

export async function publishTournamentGames(opts: {
  slug: string;
  gameIds: string[];
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findFirst({ where: slugWhere(opts.slug) });
  if (!tournament) return { ok: false, error: "Tournament not found." };
  if (!opts.gameIds.length) return { ok: false, error: "No games selected." };

  const result = await prisma.tournamentGame.updateMany({
    where: {
      tournamentId: tournament.id,
      id: { in: opts.gameIds },
      status: { in: [TournamentGameStatus.CANDIDATE, TournamentGameStatus.HIDDEN] },
    },
    data: {
      status: TournamentGameStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  // Publishing implies the public Matches tab should be visible.
  if (result.count > 0 && !tournament.yourGamesEnabled) {
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { yourGamesEnabled: true },
    });
  }

  return { ok: true, count: result.count };
}

export async function setTournamentGameStatus(opts: {
  slug: string;
  gameId: string;
  status: TournamentGameStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findFirst({ where: slugWhere(opts.slug) });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const game = await prisma.tournamentGame.findFirst({
    where: { id: opts.gameId, tournamentId: tournament.id },
  });
  if (!game) return { ok: false, error: "Game not found." };

  await prisma.tournamentGame.update({
    where: { id: game.id },
    data: {
      status: opts.status,
      publishedAt:
        opts.status === TournamentGameStatus.PUBLISHED
          ? game.publishedAt ?? new Date()
          : opts.status === TournamentGameStatus.CANDIDATE
            ? null
            : game.publishedAt,
    },
  });

  return { ok: true };
}

export async function deleteTournamentGame(opts: {
  slug: string;
  gameId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tournament = await prisma.tournament.findFirst({ where: slugWhere(opts.slug) });
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const game = await prisma.tournamentGame.findFirst({
    where: { id: opts.gameId, tournamentId: tournament.id },
  });
  if (!game) return { ok: false, error: "Game not found." };

  await prisma.tournamentGame.delete({ where: { id: game.id } });
  return { ok: true };
}
