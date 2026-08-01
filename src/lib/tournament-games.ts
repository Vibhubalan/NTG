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
