import type {
  BracketMatchSlot,
  BracketMatchView,
  BracketRoundView,
  FinalStandingView,
  TournamentBracketView,
} from "@core/contracts/tournament-bracket";
import { challongePageUrl, challongeSlugFromUrl } from "@/lib/challonge";

type ChallongeParticipant = {
  id: number;
  name: string;
  seed: number | null;
  final_rank: number | null;
};

type ChallongeMatch = {
  id: number;
  round: number;
  player1_id: number | null;
  player2_id: number | null;
  scores_csv: string;
  state: string;
  suggested_play_order: number | null;
  identifier: string | null;
  player1_prereq_match_id: number | null;
  player2_prereq_match_id: number | null;
  group_id?: number | null;
  optional?: boolean | null;
};

type ChallongeResponse = {
  tournament: {
    name: string;
    tournament_type: string;
    state: string;
    participants?: { participant: ChallongeParticipant }[];
    matches?: { match: ChallongeMatch }[];
  };
  participants?: { participant: ChallongeParticipant }[];
  matches?: { match: ChallongeMatch }[];
};

function extractChallongePayload(data: ChallongeResponse) {
  const participants = data.participants ?? data.tournament.participants ?? [];
  const matches = data.matches ?? data.tournament.matches ?? [];
  return { tournament: data.tournament, participants, matches };
}

function parseScores(scoresCsv: string): [string, string] {
  if (!scoresCsv.trim()) return ["0", "0"];
  const parts = scoresCsv.split("-").map((s) => s.trim());
  if (parts.length !== 2) return ["0", "0"];
  return [parts[0] || "0", parts[1] || "0"];
}

function participantMap(
  participants: ChallongeParticipant[],
): Map<number, ChallongeParticipant> {
  return new Map(participants.map((p) => [p.id, p]));
}

function slotFromParticipant(
  participant: ChallongeParticipant | undefined,
  score: string,
  isWinner: boolean,
): BracketMatchSlot {
  return {
    seed: participant?.seed ?? null,
    name: participant?.name ?? "TBD",
    score,
    isWinner,
  };
}

function matchState(state: string): BracketMatchView["state"] {
  if (state === "complete") return "complete";
  if (state === "open") return "open";
  return "pending";
}

function roundSide(
  round: number,
  tournamentType: string,
  isGrandFinal: boolean,
): BracketRoundView["side"] {
  if (isGrandFinal) return "final";
  if (round < 0) return "losers";
  return "winners";
}

function roundLabel(
  round: number,
  side: BracketRoundView["side"],
  matchCount: number,
  winnersRoundIndex: number,
  totalWinnersRounds: number,
  maxPositive: number | null,
): string {
  if (side === "final") return "Finals";
  if (side === "losers") return `Losers Round ${Math.abs(round)}`;
  if (maxPositive !== null && round === maxPositive) return "Finals";
  if (winnersRoundIndex === totalWinnersRounds - 2 && matchCount <= 2) return "Semifinals";
  if (winnersRoundIndex === 0) return "Round 1";
  if (winnersRoundIndex === 1) return "Round 2";
  return `Round ${round}`;
}

function computeMatchRecords(
  participants: ChallongeParticipant[],
  matches: ChallongeMatch[],
): Map<number, { wins: number; losses: number }> {
  const records = new Map<number, { wins: number; losses: number }>();
  for (const p of participants) {
    records.set(p.id, { wins: 0, losses: 0 });
  }

  for (const m of matches) {
    if (m.state !== "complete" || !m.player1_id || !m.player2_id) continue;
    const [score1, score2] = parseScores(m.scores_csv).map(Number);
    const r1 = records.get(m.player1_id);
    const r2 = records.get(m.player2_id);
    if (!r1 || !r2) continue;

    if (score1 > score2) {
      r1.wins += 1;
      r2.losses += 1;
    } else if (score2 > score1) {
      r2.wins += 1;
      r1.losses += 1;
    }
  }

  return records;
}

function buildFinalStandings(
  participants: ChallongeParticipant[],
  records: Map<number, { wins: number; losses: number }>,
): FinalStandingView[] {
  const seenRanks = new Set<number>();
  return participants
    .filter((p) => p.final_rank === 1 || p.final_rank === 2)
    .sort((a, b) => (a.final_rank ?? 99) - (b.final_rank ?? 99))
    .filter((p) => {
      const rank = p.final_rank as number;
      if (seenRanks.has(rank)) return false;
      seenRanks.add(rank);
      return true;
    })
    .map((p) => {
      const rec = records.get(p.id);
      const wins = rec?.wins ?? 0;
      const losses = rec?.losses ?? 0;
      return {
        rank: p.final_rank as number,
        name: p.name,
        record: `${wins} - ${losses}`,
      };
    });
}

function sortRoundKeys(keys: number[], tournamentType: string): number[] {
  const positive = keys.filter((k) => k > 0).sort((a, b) => a - b);
  const negative = keys.filter((k) => k < 0).sort((a, b) => Math.abs(a) - Math.abs(b));
  const isDouble = tournamentType.toLowerCase().includes("double");

  if (!isDouble) return positive;

  if (positive.length <= 1) return [...positive, ...negative];

  const grandFinal = positive[positive.length - 1];
  const winners = positive.slice(0, -1);
  return [...winners, ...negative, grandFinal];
}

function normalizeResponse(url: string, data: ChallongeResponse): TournamentBracketView {
  const { tournament, participants: participantRows, matches: matchRows } =
    extractChallongePayload(data);
  const participants = participantRows.map((row) => row.participant);
  const matches = matchRows
    .map((row) => row.match)
    .filter((m) => {
      // Exclude group stage matches (they have a non-null group_id)
      if (m.group_id !== null && m.group_id !== undefined) return false;
      // Exclude unplayed optional reset matches (like unplayed double-elimination grand final resets)
      if (m.optional && m.state !== "complete") return false;
      return true;
    });
  const byId = participantMap(participants);
  const tournamentType = tournament.tournament_type ?? "single elimination";

  const grouped = new Map<number, ChallongeMatch[]>();
  for (const match of matches) {
    const list = grouped.get(match.round) ?? [];
    list.push(match);
    grouped.set(match.round, list);
  }

  const positiveRounds = [...grouped.keys()].filter((r) => r > 0);
  const maxPositive =
    positiveRounds.length > 0 ? Math.max(...positiveRounds) : null;
  const isDouble = tournamentType.toLowerCase().includes("double");

  const sortedRoundKeys = sortRoundKeys([...grouped.keys()], tournamentType);
  const winnerKeys = sortedRoundKeys.filter((r) => {
    const isGrandFinal =
      isDouble &&
      maxPositive !== null &&
      r === maxPositive &&
      (grouped.get(r)?.length ?? 0) === 1;
    return r > 0 && !isGrandFinal;
  });

  const rounds: BracketRoundView[] = sortedRoundKeys.map((round) => {
    const roundMatches = (grouped.get(round) ?? []).sort(
      (a, b) => (a.suggested_play_order ?? a.id) - (b.suggested_play_order ?? b.id),
    );
    const isGrandFinal =
      isDouble &&
      maxPositive !== null &&
      round === maxPositive &&
      roundMatches.length === 1;
    const side = roundSide(round, tournamentType, isGrandFinal);
    const winnersRoundIndex = winnerKeys.indexOf(round);
    const label = roundLabel(
      round,
      side,
      roundMatches.length,
      winnersRoundIndex >= 0 ? winnersRoundIndex : 0,
      winnerKeys.length,
      maxPositive,
    );

    return {
      id: `round-${round}`,
      label,
      side,
      roundNumber: round,
      matches: roundMatches.map((m) => {
        const [score1, score2] = parseScores(m.scores_csv);
        const p1 = m.player1_id ? byId.get(m.player1_id) : undefined;
        const p2 = m.player2_id ? byId.get(m.player2_id) : undefined;
        const s1 = Number(score1);
        const s2 = Number(score2);
        const complete = m.state === "complete";

        return {
          id: String(m.id),
          matchNumber: m.suggested_play_order,
          state: matchState(m.state),
          slots: [
            slotFromParticipant(p1, score1, complete && s1 > s2),
            slotFromParticipant(p2, score2, complete && s2 > s1),
          ],
          player1PrereqMatchId: m.player1_prereq_match_id ? String(m.player1_prereq_match_id) : null,
          player2PrereqMatchId: m.player2_prereq_match_id ? String(m.player2_prereq_match_id) : null,
        };
      }),
    };
  });

  const records = computeMatchRecords(participants, matches);
  const finalStandings = buildFinalStandings(participants, records);

  return {
    tournamentName: tournament.name,
    tournamentType,
    rounds,
    participants: participants
      .map((p) => p.name)
      .filter((name) => name.trim().length > 0),
    finalStandings,
    mvp: null,
    sourceUrl: challongePageUrl(url),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchChallongeBracket(
  bracketUrl: string,
): Promise<TournamentBracketView | null> {
  const slug = challongeSlugFromUrl(bracketUrl);
  const apiKey = process.env.CHALLONGE_API_KEY;
  if (!slug || !apiKey) return null;

  const params = new URLSearchParams({
    api_key: apiKey,
    include_participants: "1",
    include_matches: "1",
  });

  try {
    const res = await fetch(
      `https://api.challonge.com/v1/tournaments/${encodeURIComponent(slug)}.json?${params}`,
      { next: { revalidate: 120 } },
    );

    if (!res.ok) {
      console.error(`[challonge] ${slug} HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as ChallongeResponse;
    if (!data.tournament) return null;

    const { matches } = extractChallongePayload(data);
    if (matches.length === 0) return null;

    return normalizeResponse(bracketUrl, data);
  } catch (error) {
    console.error("[challonge] fetch failed:", error);
    return null;
  }
}
