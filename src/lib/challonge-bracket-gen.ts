import type {
  BracketMatchView,
  BracketRoundView,
  FinalStandingView,
  GroupStandingView,
  GroupView,
  TournamentBracketView,
} from "@core/contracts/tournament-bracket";

export type ParticipantInput = { seed: number | null; name: string };

function generateSingleGroup(
  groupName: string,
  groupId: string,
  participants: ParticipantInput[],
): GroupView {
  const sorted = [...participants].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
  const list: (ParticipantInput | null)[] = [...sorted];
  if (list.length % 2 !== 0) {
    list.push(null);
  }

  const numTeams = list.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  const rounds: BracketRoundView[] = [];
  let matchNum = 1;

  for (let r = 0; r < numRounds; r++) {
    const matches: BracketMatchView[] = [];

    for (let i = 0; i < half; i++) {
      const p1 = list[i];
      const p2 = list[numTeams - 1 - i];

      if (p1 && p2) {
        matches.push({
          id: `${groupId}-r${r + 1}-m${matches.length + 1}`,
          matchNumber: matchNum++,
          state: "open",
          slots: [
            { seed: p1.seed ?? null, name: p1.name, score: "0", isWinner: false },
            { seed: p2.seed ?? null, name: p2.name, score: "0", isWinner: false },
          ],
        });
      }
    }

    const last = list.pop()!;
    list.splice(1, 0, last);

    rounds.push({
      id: `${groupId}-r${r + 1}`,
      roundNumber: r + 1,
      label: `Round ${r + 1}`,
      side: "winners",
      matches,
    });
  }

  const standings: GroupStandingView[] = sorted.map((p, idx) => ({
    rank: idx + 1,
    name: p.name,
    matchRecord: "0 - 0 - 0",
    ptsDiff: 0,
    pts: 0,
    tb: 0,
    setWins: 0,
    setTies: 0,
    matchHistory: [],
  }));

  return {
    id: groupId,
    name: groupName,
    standings,
    rounds,
  };
}

export function generateBracketFromParticipants(
  participants: ParticipantInput[],
  bracketName = "Single Elimination",
): TournamentBracketView {
  const sorted = [...participants].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

  if (sorted.length === 0) {
    return {
      tournamentName: bracketName,
      tournamentType: "single_elimination",
      rounds: [],
      participants: [],
      finalStandings: [],
      mvp: null,
      sourceUrl: null,
      fetchedAt: new Date().toISOString(),
    };
  }

  let size = 4;
  while (size < sorted.length) {
    size *= 2;
  }

  const pairings: [number, number][] = [];
  if (size === 4) {
    pairings.push([1, 4], [2, 3]);
  } else if (size === 8) {
    pairings.push([1, 8], [4, 5], [2, 7], [3, 6]);
  } else {
    for (let i = 1; i <= size / 2; i++) {
      pairings.push([i, size - i + 1]);
    }
  }

  const pMap = new Map<number, ParticipantInput>();
  sorted.forEach((p, idx) => pMap.set(p.seed ?? idx + 1, p));

  const totalRounds = Math.log2(size);
  const rounds: BracketRoundView[] = [];

  const getRoundLabel = (rIndex: number, total: number) => {
    if (rIndex === total) return "Finals";
    if (rIndex === total - 1) return "Semifinals";
    if (rIndex === total - 2) return "Quarterfinals";
    return `Round ${rIndex}`;
  };

  const r1Matches: BracketMatchView[] = pairings.map(([s1, s2], idx) => {
    const p1 = pMap.get(s1);
    const p2 = pMap.get(s2);
    const isBye = !p1 || !p2;

    return {
      id: `r1-m${idx + 1}`,
      matchNumber: idx + 1,
      state: isBye ? "complete" : "open",
      slots: [
        { seed: s1, name: p1?.name || "BYE", score: p1 ? "0" : "-", isWinner: false },
        { seed: s2, name: p2?.name || "BYE", score: p2 ? "0" : "-", isWinner: false },
      ],
    };
  });

  rounds.push({
    id: "r1",
    roundNumber: 1,
    label: getRoundLabel(1, totalRounds),
    side: "winners",
    matches: r1Matches,
  });

  let prevMatches = r1Matches;
  let currentMatchNum = r1Matches.length + 1;

  for (let r = 2; r <= totalRounds; r++) {
    const currentMatchesCount = Math.pow(2, totalRounds - r);
    const currentMatches: BracketMatchView[] = [];

    for (let m = 0; m < currentMatchesCount; m++) {
      const p1Match = prevMatches[m * 2];
      const p2Match = prevMatches[m * 2 + 1];

      currentMatches.push({
        id: `r${r}-m${m + 1}`,
        matchNumber: currentMatchNum++,
        state: "pending",
        player1PrereqMatchId: p1Match?.id ?? null,
        player2PrereqMatchId: p2Match?.id ?? null,
        slots: [
          { seed: null, name: "TBD", score: "-", isWinner: false },
          { seed: null, name: "TBD", score: "-", isWinner: false },
        ],
      });
    }

    rounds.push({
      id: `r${r}`,
      roundNumber: r,
      label: getRoundLabel(r, totalRounds),
      side: r === totalRounds ? "final" : "winners",
      matches: currentMatches,
    });

    prevMatches = currentMatches;
  }

  return {
    tournamentName: bracketName,
    tournamentType: "single_elimination",
    rounds,
    participants: sorted.map((p) => p.name),
    finalStandings: [],
    mvp: null,
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
  };
}

export function generateRoundRobinBracketFromParticipants(
  participants: ParticipantInput[],
  bracketName = "Round Robin",
): TournamentBracketView {
  const sorted = [...participants].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

  if (sorted.length === 0) {
    return {
      tournamentName: bracketName,
      tournamentType: "round_robin",
      rounds: [],
      participants: [],
      finalStandings: [],
      groups: [],
      mvp: null,
      sourceUrl: null,
      fetchedAt: new Date().toISOString(),
    };
  }

  // If 6 or more teams, split into Group A and Group B
  let groups: GroupView[] | null = null;
  if (sorted.length >= 6) {
    const halfCount = Math.ceil(sorted.length / 2);
    const gA = generateSingleGroup("Group A", "group-a", sorted.slice(0, halfCount));
    const gB = generateSingleGroup("Group B", "group-b", sorted.slice(halfCount));
    groups = [gA, gB];
  } else {
    const single = generateSingleGroup("Group A", "group-a", sorted);
    groups = [single];
  }

  const allRounds = groups.flatMap((g) => g.rounds);
  const standings: FinalStandingView[] = sorted.map((p, idx) => ({
    rank: idx + 1,
    name: p.name,
    record: "0 - 0 - 0",
  }));

  return {
    tournamentName: bracketName,
    tournamentType: "round_robin",
    rounds: allRounds,
    participants: sorted.map((p) => p.name),
    finalStandings: standings,
    groups,
    mvp: null,
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
  };
}
