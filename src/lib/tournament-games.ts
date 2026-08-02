/** Pure helpers for tournament custom-game overlap + tracker-style stats. */

export type RosterPlayerIdentity = {
  puuid: string;
  userId?: string | null;
  teamId: string;
  riotGameName: string;
  riotTagLine: string;
};

export type MatchLobbyPlayer = {
  puuid: string;
  name?: string;
  tag?: string;
  team?: string;
  character?: string;
  stats?: {
    kills?: number;
    deaths?: number;
    assists?: number;
    score?: number;
    headshots?: number;
    bodyshots?: number;
    legshots?: number;
  };
  damage_made?: number;
};

export function countTeamPresence(
  teamPuuids: ReadonlySet<string>,
  lobbyPuuids: ReadonlySet<string>,
): number {
  let count = 0;
  for (const id of teamPuuids) {
    if (lobbyPuuids.has(id)) count += 1;
  }
  return count;
}

export function isCommonCustomMatch(opts: {
  teamAPuuids: ReadonlySet<string>;
  teamBPuuids: ReadonlySet<string>;
  lobbyPuuids: ReadonlySet<string>;
  minPlayersPerTeam: number;
}): { match: boolean; teamAPresent: number; teamBPresent: number } {
  const teamAPresent = countTeamPresence(opts.teamAPuuids, opts.lobbyPuuids);
  const teamBPresent = countTeamPresence(opts.teamBPuuids, opts.lobbyPuuids);
  return {
    teamAPresent,
    teamBPresent,
    match:
      teamAPresent >= opts.minPlayersPerTeam &&
      teamBPresent >= opts.minPlayersPerTeam,
  };
}

export function computeAcs(score: number, totalRounds: number): number {
  if (totalRounds <= 0) return 0;
  return Math.round(score / totalRounds);
}

export function computeAdr(damage: number, totalRounds: number): number {
  if (totalRounds <= 0) return 0;
  return Math.round(damage / totalRounds);
}

export function computeHsPercent(
  headshots: number,
  bodyshots: number,
  legshots: number,
): number {
  const shots = headshots + bodyshots + legshots;
  if (shots <= 0) return 0;
  return Math.round((headshots / shots) * 10000) / 100;
}

/** Henrik v2 kill event (top-level `data.kills` or nested round kill_events). */
export type HenrikKillEvent = {
  round?: number;
  kill_time_in_round?: number;
  killer_puuid?: string;
  victim_puuid?: string;
};

export type FirstKillDeathCounts = {
  firstKills: number;
  firstDeaths: number;
};

/**
 * Pull kill events from a stored Henrik match payload.
 * Accepts either the API envelope `{ data: {...} }` or the inner `data` object.
 */
export function extractKillEventsFromMatchPayload(payload: unknown): HenrikKillEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  if (Array.isArray(data.kills)) {
    return data.kills as HenrikKillEvent[];
  }

  const rounds = Array.isArray(data.rounds) ? data.rounds : [];
  const kills: HenrikKillEvent[] = [];
  for (const raw of rounds) {
    if (!raw || typeof raw !== "object") continue;
    const round = raw as Record<string, unknown>;
    const roundNum =
      typeof round.round === "number"
        ? round.round
        : typeof round.round_num === "number"
          ? round.round_num
          : null;
    const playerStats = Array.isArray(round.player_stats) ? round.player_stats : [];
    for (const psRaw of playerStats) {
      if (!psRaw || typeof psRaw !== "object") continue;
      const ps = psRaw as Record<string, unknown>;
      const events = Array.isArray(ps.kill_events) ? ps.kill_events : [];
      for (const evRaw of events) {
        if (!evRaw || typeof evRaw !== "object") continue;
        const ev = evRaw as Record<string, unknown>;
        kills.push({
          round:
            typeof ev.round === "number"
              ? ev.round
              : roundNum ?? undefined,
          kill_time_in_round:
            typeof ev.kill_time_in_round === "number"
              ? ev.kill_time_in_round
              : undefined,
          killer_puuid:
            typeof ev.killer_puuid === "string"
              ? ev.killer_puuid
              : typeof ps.player_puuid === "string"
                ? ps.player_puuid
                : undefined,
          victim_puuid:
            typeof ev.victim_puuid === "string" ? ev.victim_puuid : undefined,
        });
      }
    }
  }
  return kills;
}

/**
 * First kill / first death per round: earliest kill_time_in_round in each round.
 * Returns counts keyed by puuid.
 */
export function countFirstKillDeaths(
  kills: ReadonlyArray<HenrikKillEvent> | null | undefined,
): Map<string, FirstKillDeathCounts> {
  const byRound = new Map<number, HenrikKillEvent[]>();
  for (const k of kills ?? []) {
    if (typeof k.round !== "number") continue;
    if (!k.killer_puuid || !k.victim_puuid) continue;
    const list = byRound.get(k.round) ?? [];
    list.push(k);
    byRound.set(k.round, list);
  }

  const result = new Map<string, FirstKillDeathCounts>();
  const bump = (puuid: string, field: keyof FirstKillDeathCounts) => {
    const cur = result.get(puuid) ?? { firstKills: 0, firstDeaths: 0 };
    cur[field] += 1;
    result.set(puuid, cur);
  };

  for (const events of byRound.values()) {
    events.sort(
      (a, b) => (a.kill_time_in_round ?? 0) - (b.kill_time_in_round ?? 0),
    );
    const first = events[0];
    if (!first?.killer_puuid || !first.victim_puuid) continue;
    bump(first.killer_puuid, "firstKills");
    bump(first.victim_puuid, "firstDeaths");
  }
  return result;
}

export function normalizeGameSide(raw: string | null | undefined): "Red" | "Blue" | null {
  const v = raw?.trim().toLowerCase();
  if (v === "red") return "Red";
  if (v === "blue") return "Blue";
  return null;
}

export function resolveTeamSideMajority(
  teamPuuids: ReadonlySet<string>,
  lobbyPlayers: MatchLobbyPlayer[],
): "Red" | "Blue" | null {
  let red = 0;
  let blue = 0;
  for (const p of lobbyPlayers) {
    if (!teamPuuids.has(p.puuid)) continue;
    const side = normalizeGameSide(p.team);
    if (side === "Red") red += 1;
    if (side === "Blue") blue += 1;
  }
  if (red === 0 && blue === 0) return null;
  return red >= blue ? "Red" : "Blue";
}

/**
 * Attribute a lobby player to a cup team.
 * When the puuid is on both rosters (primary + poach), prefer in-game side
 * vs Team A's majority side instead of last-write-wins roster map.
 */
export function resolveGamePlayerTeamId(opts: {
  puuid: string;
  side: "Red" | "Blue";
  teamAId: string;
  teamBId: string;
  teamAPuuids: ReadonlySet<string>;
  teamBPuuids: ReadonlySet<string>;
  teamASide: "Red" | "Blue" | null;
  rosterTeamId: string | null;
}): string | null {
  const onA = opts.teamAPuuids.has(opts.puuid);
  const onB = opts.teamBPuuids.has(opts.puuid);

  if (onA && onB) {
    if (opts.teamASide) {
      return opts.side === opts.teamASide ? opts.teamAId : opts.teamBId;
    }
    return opts.rosterTeamId;
  }

  if (opts.rosterTeamId) return opts.rosterTeamId;

  if (opts.teamASide) {
    return opts.side === opts.teamASide ? opts.teamAId : opts.teamBId;
  }
  if (onA) return opts.teamAId;
  if (onB) return opts.teamBId;
  return null;
}

/** Prefer the roster identity that matches the attributed team when dual-rostered. */
export function pickRosterIdentityForTeam(
  puuid: string,
  teamId: string | null,
  rosterAByPuuid: ReadonlyMap<string, RosterPlayerIdentity>,
  rosterBByPuuid: ReadonlyMap<string, RosterPlayerIdentity>,
): RosterPlayerIdentity | null {
  const a = rosterAByPuuid.get(puuid) ?? null;
  const b = rosterBByPuuid.get(puuid) ?? null;
  if (teamId && a?.teamId === teamId) return a;
  if (teamId && b?.teamId === teamId) return b;
  return a ?? b;
}

/** Which Valorant side most of a cup team's known players were on. */
export function majoritySideForPlayers(
  players: ReadonlyArray<{ side: "Red" | "Blue" }>,
): "Red" | "Blue" | null {
  let red = 0;
  let blue = 0;
  for (const p of players) {
    if (p.side === "Red") red += 1;
    if (p.side === "Blue") blue += 1;
  }
  if (red === 0 && blue === 0) return null;
  return red >= blue ? "Red" : "Blue";
}

/**
 * Split lobby players into cup team columns.
 * Roster-linked players use teamId; everyone else is placed by in-game side
 * (so a sub / alt account still shows on the correct team scoreboard).
 */
export function partitionPlayersByCupTeam<
  T extends { teamId: string | null; side: "Red" | "Blue" },
>(players: T[], teamAId: string, teamBId: string): { teamA: T[]; teamB: T[] } {
  const rosterA = players.filter((p) => p.teamId === teamAId);
  const rosterB = players.filter((p) => p.teamId === teamBId);
  const cupSideA = majoritySideForPlayers(rosterA);
  const cupSideB = majoritySideForPlayers(rosterB);

  // Prefer independent side majority from each roster so we never assign
  // team B's side to team A when roster A is empty.
  if (cupSideA && cupSideB && cupSideA !== cupSideB) {
    return {
      teamA: players.filter((p) => p.side === cupSideA),
      teamB: players.filter((p) => p.side === cupSideB),
    };
  }

  if (cupSideA) {
    const other = cupSideA === "Red" ? "Blue" : "Red";
    return {
      teamA: players.filter((p) => p.side === cupSideA),
      teamB: players.filter((p) => p.side === other),
    };
  }

  if (cupSideB) {
    const other = cupSideB === "Red" ? "Blue" : "Red";
    return {
      teamA: players.filter((p) => p.side === other),
      teamB: players.filter((p) => p.side === cupSideB),
    };
  }

  if (rosterA.length || rosterB.length) {
    return { teamA: rosterA, teamB: rosterB };
  }

  return {
    teamA: players.filter((p) => p.side === "Red"),
    teamB: players.filter((p) => p.side === "Blue"),
  };
}
