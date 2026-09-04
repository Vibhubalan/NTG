import type {
  BracketMatchSlot,
  BracketMatchView,
  BracketRoundView,
  FinalStandingView,
  GroupStandingView,
  GroupView,
  TournamentBracketView,
} from "@core/contracts/tournament-bracket";
import { challongePageUrl, challongeSlugFromUrl } from "@/lib/challonge";
import {
  generateBracketFromParticipants,
  generateRoundRobinBracketFromParticipants,
} from "@/lib/challonge-bracket-gen";
import { getJson, setJson } from "@/lib/upstash-redis";
import { promises as fs } from "fs";
import path from "path";

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

function normalizeScoresCsv(scoresCsv: string | null | undefined): string {
  if (!scoresCsv?.trim()) return "";
  const [a, b] = parseScores(scoresCsv);
  return `${a}-${b}`;
}

/**
 * Challonge double-elim creates an optional grand-final reset whose both
 * slots feed from the first GF. When that reset is left incomplete we already
 * hide it; when someone completes it by copying the same scoreline it shows
 * as a duplicate finals card. Detect that case so we only render one GF.
 */
export function isDuplicateGrandFinalReset(match: {
  state?: string | null;
  scoresCsv?: string | null;
  player1Id?: number | string | null;
  player2Id?: number | string | null;
  player1PrereqId?: number | string | null;
  player2PrereqId?: number | string | null;
}, prior: {
  state?: string | null;
  scoresCsv?: string | null;
  player1Id?: number | string | null;
  player2Id?: number | string | null;
} | null | undefined): boolean {
  if (!prior) return false;
  const p1 = match.player1PrereqId;
  const p2 = match.player2PrereqId;
  if (p1 == null || p2 == null || String(p1) !== String(p2)) return false;
  if ((match.state ?? "").toLowerCase() !== "complete") return false;
  if ((prior.state ?? "").toLowerCase() !== "complete") return false;
  if (normalizeScoresCsv(match.scoresCsv) !== normalizeScoresCsv(prior.scoresCsv)) {
    return false;
  }
  if (match.player1Id == null || match.player2Id == null) return false;
  return (
    String(match.player1Id) === String(prior.player1Id) &&
    String(match.player2Id) === String(prior.player2Id)
  );
}

function shouldKeepApiMatch(match: ChallongeMatch, all: ChallongeMatch[]): boolean {
  if (match.optional && match.state !== "complete") return false;
  const prior =
    match.player1_prereq_match_id != null
      ? all.find((m) => m.id === match.player1_prereq_match_id) ?? null
      : null;
  if (
    isDuplicateGrandFinalReset(
      {
        state: match.state,
        scoresCsv: match.scores_csv,
        player1Id: match.player1_id,
        player2Id: match.player2_id,
        player1PrereqId: match.player1_prereq_match_id,
        player2PrereqId: match.player2_prereq_match_id,
      },
      prior
        ? {
            state: prior.state,
            scoresCsv: prior.scores_csv,
            player1Id: prior.player1_id,
            player2Id: prior.player2_id,
          }
        : null,
    )
  ) {
    return false;
  }
  return true;
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
  const fromChallongeRank = participants
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

  if (fromChallongeRank.length > 0) return fromChallongeRank;

  // Fallback when Challonge hasn't set final_rank yet: order by match W-L.
  const ranked = [...participants]
    .map((p) => {
      const rec = records.get(p.id) ?? { wins: 0, losses: 0 };
      return { p, rec };
    })
    .filter((e) => e.p.name.trim().length > 0)
    .sort(
      (a, b) =>
        b.rec.wins - a.rec.wins ||
        a.rec.losses - b.rec.losses ||
        (a.p.seed ?? 999) - (b.p.seed ?? 999),
    );

  const hasResults = ranked.some((e) => e.rec.wins > 0 || e.rec.losses > 0);
  if (!hasResults) return [];

  return ranked.slice(0, 2).map((entry, idx) => ({
    rank: idx + 1,
    name: entry.p.name,
    record: `${entry.rec.wins} - ${entry.rec.losses}`,
  }));
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
  const rawMatches = matchRows.map((row) => row.match);
  const byId = participantMap(participants);
  const tournamentType = tournament.tournament_type ?? "single elimination";

  // Build groups if group_id is present
  const matchesWithGroup = rawMatches.filter(
    (m) => m.group_id !== null && m.group_id !== undefined,
  );
  let groups: GroupView[] | null = null;

  if (matchesWithGroup.length > 0) {
    const groupMap = new Map<number, ChallongeMatch[]>();
    for (const m of matchesWithGroup) {
      const gId = m.group_id as number;
      const list = groupMap.get(gId) ?? [];
      list.push(m);
      groupMap.set(gId, list);
    }

    const sortedGroupIds = Array.from(groupMap.keys()).sort((a, b) => a - b);
    groups = sortedGroupIds.map((gId, idx) => {
      const gMatches = groupMap.get(gId) ?? [];
      const letter = String.fromCharCode(65 + idx); // 'A', 'B', etc.
      const groupName = `Group ${letter}`;

      const roundMap = new Map<number, ChallongeMatch[]>();
      for (const m of gMatches) {
        const list = roundMap.get(m.round) ?? [];
        list.push(m);
        roundMap.set(m.round, list);
      }

      const gRounds: BracketRoundView[] = Array.from(roundMap.keys())
        .sort((a, b) => a - b)
        .map((rNum) => {
          const rMatches = roundMap.get(rNum) ?? [];
          return {
            id: `group-${gId}-r${rNum}`,
            label: `Round ${rNum}`,
            side: "winners",
            roundNumber: rNum,
            matches: rMatches.map((m) => {
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
              };
            }),
          };
        });

      const groupParticipants = new Set<ChallongeParticipant>();
      for (const m of gMatches) {
        if (m.player1_id && byId.has(m.player1_id)) groupParticipants.add(byId.get(m.player1_id)!);
        if (m.player2_id && byId.has(m.player2_id)) groupParticipants.add(byId.get(m.player2_id)!);
      }

      const gParticipantsList = Array.from(groupParticipants);
      const gRecords = computeMatchRecords(gParticipantsList, gMatches);

      const standings: GroupStandingView[] = gParticipantsList.map((p, pIdx) => {
        const rec = gRecords.get(p.id) ?? { wins: 0, losses: 0 };
        return {
          rank: p.final_rank ?? pIdx + 1,
          name: p.name,
          matchRecord: `${rec.wins} - ${rec.losses} - 0`,
          ptsDiff: 0,
          pts: rec.wins * 3,
          tb: 0,
          setWins: rec.wins,
          setTies: 0,
          matchHistory: [],
        };
      });

      return {
        id: `group-${gId}`,
        name: groupName,
        standings,
        rounds: gRounds,
      };
    });
  }

  // Filter matches for the main playoff/tree rounds
  const hasNonGroupMatches = rawMatches.some(
    (m) => m.group_id === null || m.group_id === undefined,
  );
  const matches = rawMatches.filter((m) => {
    if (hasNonGroupMatches && m.group_id !== null && m.group_id !== undefined) return false;
    return shouldKeepApiMatch(m, rawMatches);
  });

  const grouped = new Map<number, ChallongeMatch[]>();
  for (const match of matches) {
    const list = grouped.get(match.round) ?? [];
    list.push(match);
    grouped.set(match.round, list);
  }

  const positiveRounds = [...grouped.keys()].filter((r) => r > 0);
  const maxPositive = positiveRounds.length > 0 ? Math.max(...positiveRounds) : null;
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
          player1PrereqMatchId: m.player1_prereq_match_id
            ? String(m.player1_prereq_match_id)
            : null,
          player2PrereqMatchId: m.player2_prereq_match_id
            ? String(m.player2_prereq_match_id)
            : null,
        };
      }),
    };
  });

  const records = computeMatchRecords(participants, rawMatches);
  const finalStandings = buildFinalStandings(participants, records);

  const isRoundRobin =
    tournamentType.toLowerCase().includes("round_robin") ||
    tournamentType.toLowerCase().includes("round robin");

  if ((!groups || groups.length === 0) && isRoundRobin && rounds.length > 0) {
    const standings: GroupStandingView[] =
      finalStandings && finalStandings.length > 0
        ? finalStandings.map((s, idx) => ({
            rank: s.rank || idx + 1,
            name: s.name,
            matchRecord: s.record || "0 - 0 - 0",
            ptsDiff: 0,
            pts: 0,
            tb: 0,
            setWins: 0,
            setTies: 0,
            matchHistory: [],
          }))
        : participants.map((p, idx) => {
            const rec = records.get(p.id) ?? { wins: 0, losses: 0 };
            return {
              rank: p.final_rank ?? idx + 1,
              name: p.name,
              matchRecord: `${rec.wins} - ${rec.losses} - 0`,
              ptsDiff: 0,
              pts: rec.wins * 3,
              tb: 0,
              setWins: rec.wins,
              setTies: 0,
              matchHistory: [],
            };
          });

    groups = [
      {
        id: "group-1",
        name: "Group A",
        standings,
        rounds,
      },
    ];
  }

  return {
    tournamentName: tournament.name,
    tournamentType,
    rounds,
    participants: participants
      .map((p) => p.name)
      .filter((name) => name.trim().length > 0),
    finalStandings,
    groups,
    mvp: null,
    sourceUrl: challongePageUrl(url),
    fetchedAt: new Date().toISOString(),
  };
}

/** Fresh live data TTL — 10 seconds for real-time score updates. */
const FETCH_REVALIDATE_SEC = 10;
const COOLDOWN_429_MS = 60_000;
const COOLDOWN_QUOTA_MS = 24 * 60 * 60_000;
const MEMORY_TTL_MS = 10_000;
const DISK_FRESH_MS = 10_000;
const DISK_DIR = path.join(process.cwd(), ".cache", "challonge");

/**
 * Cross-instance cache (Upstash Redis) — the in-memory + disk caches above only
 * live for a single serverless invocation on Vercel, so every cold function hit
 * would otherwise re-fetch Challonge. Redis survives across instances.
 */
const REDIS_TTL_LIVE_SEC = 30;
const REDIS_TTL_COMPLETED_SEC = 600;

function redisBracketKey(slug: string): string {
  // v2: hide duplicate completed grand-final resets
  return `challonge:bracket:v3:${slug}`;
}

/** Store a freshly fetched bracket in memory, disk, and Redis (cross-instance). */
function persistBracket(
  slug: string,
  bracket: TournamentBracketView,
  allowStaleCache: boolean,
) {
  rememberBracket(slug, bracket);
  const ttlSec = allowStaleCache ? REDIS_TTL_COMPLETED_SEC : REDIS_TTL_LIVE_SEC;
  void setJson(redisBracketKey(slug), bracket, ttlSec);
}

let rateLimitedUntil = 0;
let logged429 = false;
let quotaLoaded = false;

const memoryCache = new Map<
  string,
  { expiresAt: number; bracket: TournamentBracketView }
>();

function rememberBracket(slug: string, bracket: TournamentBracketView) {
  memoryCache.set(slug, {
    expiresAt: Date.now() + MEMORY_TTL_MS,
    bracket,
  });
  void writeDiskCache(slug, bracket);
}

function rememberedBracket(slug: string): TournamentBracketView | null {
  const hit = memoryCache.get(slug);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(slug);
    return null;
  }
  return hit.bracket;
}

function diskPath(slug: string) {
  return path.join(DISK_DIR, `${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

function quotaPath() {
  return path.join(DISK_DIR, "_quota.json");
}

async function loadQuotaState() {
  if (quotaLoaded) return;
  quotaLoaded = true;
  try {
    const raw = await fs.readFile(quotaPath(), "utf8");
    const parsed = JSON.parse(raw) as { until?: number };
    if (typeof parsed.until === "number" && parsed.until > Date.now()) {
      rateLimitedUntil = parsed.until;
    }
  } catch {
    // no quota file yet
  }
}

async function persistQuotaState(until: number) {
  rateLimitedUntil = until;
  try {
    await fs.mkdir(DISK_DIR, { recursive: true });
    await fs.writeFile(quotaPath(), JSON.stringify({ until }), "utf8");
  } catch {
    // best-effort
  }
}

async function writeDiskCache(slug: string, bracket: TournamentBracketView) {
  try {
    await fs.mkdir(DISK_DIR, { recursive: true });
    await fs.writeFile(
      diskPath(slug),
      JSON.stringify({ savedAt: Date.now(), bracket }),
      "utf8",
    );
  } catch {
    // best-effort cache
  }
}

async function readDiskCache(
  slug: string,
): Promise<{ bracket: TournamentBracketView; ageMs: number } | null> {
  try {
    const raw = await fs.readFile(diskPath(slug), "utf8");
    const parsed = JSON.parse(raw) as {
      savedAt?: number;
      bracket?: TournamentBracketView;
    };
    if (!parsed?.bracket || typeof parsed.savedAt !== "number") return null;
    return { bracket: parsed.bracket, ageMs: Date.now() - parsed.savedAt };
  } catch {
    return null;
  }
}

type ModulePlayer = {
  id?: number | null;
  seed?: number | null;
  display_name?: string | null;
};

type ModuleMatch = {
  id?: number | null;
  identifier?: number | string | null;
  round?: number | null;
  state?: string | null;
  player1?: ModulePlayer | null;
  player2?: ModulePlayer | null;
  scores?: unknown;
  scores_csv?: string | null;
  winner_id?: number | null;
  player1_prereq_identifier?: string | number | null;
  player2_prereq_identifier?: string | number | null;
};

type ModuleGroup = {
  name?: string;
  scorecard_html?: string;
  matches_by_round?: Record<string, ModuleMatch[]>;
};

type ModuleStore = {
  tournament?: {
    id?: number;
    name?: string;
    tournament_type?: string;
    state?: string;
  };
  matches_by_round?: Record<string, ModuleMatch[]>;
  rounds?: { number?: number; title?: string }[];
  groups?: ModuleGroup[];
};

function parseScorecardHtml(scorecardHtml: string): GroupStandingView[] {
  const rows: GroupStandingView[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(scorecardHtml)) !== null) {
    const rowContent = trMatch[1];
    if (rowContent.includes("<th")) continue;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]+>/g, " ").trim());
    }
    if (tds.length >= 8) {
      const rank = Number(tds[0]) || rows.length + 1;
      const name = tds[1];
      const matchRecord = tds[2];
      const ptsDiff = Number(tds[3]) || 0;
      const pts = Number(tds[4]) || 0;
      const tb = Number(tds[5]) || 0;
      const setWins = Number(tds[6]) || 0;
      const setTies = Number(tds[7]) || 0;
      const historyMatches: ("W" | "L" | "T")[] = [];
      const historyRegex = /trend-box\s+-(win|loss|tie)/g;
      let hMatch;
      while ((hMatch = historyRegex.exec(rowContent)) !== null) {
        const t = hMatch[1];
        historyMatches.push(t === "win" ? "W" : t === "loss" ? "L" : "T");
      }
      rows.push({
        rank,
        name,
        matchRecord,
        ptsDiff,
        pts,
        tb,
        setWins,
        setTies,
        matchHistory: historyMatches,
      });
    }
  }
  return rows;
}

function extractBalancedJsonObject(source: string, startIdx: number): string | null {
  if (startIdx < 0 || source[startIdx] !== "{") return null;
  let depth = 0;
  for (let i = startIdx; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return source.slice(startIdx, i + 1);
    } else if (c === '"') {
      i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === '"') break;
        i++;
      }
    }
  }
  return null;
}

function moduleScores(match: ModuleMatch): [string, string] {
  if (typeof match.scores_csv === "string" && match.scores_csv.trim()) {
    return parseScores(match.scores_csv);
  }
  const scores = match.scores;
  if (Array.isArray(scores) && scores.length >= 2) {
    const a = scores[0];
    const b = scores[1];
    if (typeof a === "number" || typeof a === "string") {
      return [String(a ?? 0), String(b ?? 0)];
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      return [String(a[0] ?? 0), String(b[0] ?? 0)];
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      const s1 = (a as { score?: unknown }).score;
      const s2 = (b as { score?: unknown }).score;
      if (s1 != null && s2 != null) return [String(s1), String(s2)];
    }
  }
  if (Array.isArray(scores) && scores.length === 1 && Array.isArray(scores[0])) {
    const row = scores[0] as unknown[];
    if (row.length >= 2) return [String(row[0] ?? 0), String(row[1] ?? 0)];
  }
  return ["0", "0"];
}

function buildGroupRoundsFromModuleMatches(
  byRound: Record<string, ModuleMatch[]>,
): BracketRoundView[] {
  const roundNumbers = Object.keys(byRound)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  return roundNumbers.map((rNum) => {
    const roundMatches = byRound[String(rNum)] ?? [];
    return {
      id: `round-${rNum}`,
      label: `Round ${rNum}`,
      side: "winners",
      roundNumber: rNum,
      matches: roundMatches.map((m, idx) => {
        const [score1, score2] = moduleScores(m);
        const p1 = m.player1;
        const p2 = m.player2;
        const complete = (m.state ?? "").toLowerCase() === "complete";
        const s1 = Number(score1);
        const s2 = Number(score2);
        const p1Win =
          complete &&
          (m.winner_id != null
            ? m.winner_id === p1?.id
            : Number.isFinite(s1) && Number.isFinite(s2) && s1 > s2);
        const p2Win =
          complete &&
          (m.winner_id != null
            ? m.winner_id === p2?.id
            : Number.isFinite(s1) && Number.isFinite(s2) && s2 > s1);

        return {
          id: String(m.id ?? `${rNum}-${m.identifier ?? idx}`),
          matchNumber:
            typeof m.identifier === "number"
              ? m.identifier
              : Number(m.identifier) || idx + 1,
          state: matchState(m.state ?? "pending"),
          slots: [
            {
              seed: p1?.seed ?? null,
              name: p1?.display_name?.trim() || "TBD",
              score: score1,
              isWinner: Boolean(p1Win),
            },
            {
              seed: p2?.seed ?? null,
              name: p2?.display_name?.trim() || "TBD",
              score: score2,
              isWinner: Boolean(p2Win),
            },
          ],
          player1PrereqMatchId: m.player1_prereq_identifier
            ? String(m.player1_prereq_identifier)
            : null,
          player2PrereqMatchId: m.player2_prereq_identifier
            ? String(m.player2_prereq_identifier)
            : null,
        };
      }),
    };
  });
}

function standingsFromGroupRounds(rounds: BracketRoundView[]): GroupStandingView[] {
  const names = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const slot of match.slots) {
        const name = slot.name?.trim();
        if (name && name !== "TBD" && name !== "BYE") names.add(name);
      }
    }
  }
  return [...names].map((name) => ({
    rank: 0,
    name,
    matchRecord: "0 - 0 - 0",
    ptsDiff: 0,
    pts: 0,
    tb: 0,
    setWins: 0,
    setTies: 0,
    matchHistory: [],
  }));
}

function normalizeModuleStore(
  url: string,
  store: ModuleStore,
): TournamentBracketView | null {
  const byRound = store.matches_by_round;
  const storeGroups = store.groups;

  let groups: GroupView[] | null = null;

  if (storeGroups && storeGroups.length > 0) {
    groups = storeGroups.map((g, idx) => {
      const groupName = g.name || `Group ${String.fromCharCode(65 + idx)}`;
      const gRounds = g.matches_by_round ? buildGroupRoundsFromModuleMatches(g.matches_by_round) : [];
      const parsed = g.scorecard_html ? parseScorecardHtml(g.scorecard_html) : [];
      const standings =
        parsed.length > 0 ? parsed : standingsFromGroupRounds(gRounds);
      return {
        id: `group-${idx + 1}`,
        name: groupName,
        standings,
        rounds: gRounds,
      };
    });
  }

  if (!byRound || Object.keys(byRound).length === 0) {
    if (groups && groups.length > 0) {
      const allRounds = groups.flatMap((g) => g.rounds);
      const allParticipants = Array.from(
        new Set(groups.flatMap((g) => g.standings.map((s) => s.name))),
      );
      return {
        tournamentName: store.tournament?.name || "Tournament",
        tournamentType: store.tournament?.tournament_type || "round robin",
        rounds: allRounds,
        participants: allParticipants,
        finalStandings: [],
        groups,
        mvp: null,
        sourceUrl: challongePageUrl(url),
        fetchedAt: new Date().toISOString(),
      };
    }
    return null;
  }

  const tournamentType = store.tournament?.tournament_type ?? "single elimination";

  // Drop mis-copied grand final resets (same participants + score as first GF).
  const allModuleMatches = Object.values(byRound).flat();
  const filteredByRound: Record<string, ModuleMatch[]> = {};
  for (const [roundKey, roundMatches] of Object.entries(byRound)) {
    filteredByRound[roundKey] = roundMatches.filter((m) => {
      const p1Pre = m.player1_prereq_identifier;
      const p2Pre = m.player2_prereq_identifier;
      if (p1Pre == null || p2Pre == null || String(p1Pre) !== String(p2Pre)) {
        return true;
      }
      const prior =
        allModuleMatches.find(
          (x) => x.identifier != null && String(x.identifier) === String(p1Pre),
        ) ?? null;
      const [mScore1, mScore2] = moduleScores(m);
      const [pScore1, pScore2] = prior ? moduleScores(prior) : ["", ""];
      return !isDuplicateGrandFinalReset(
        {
          state: m.state,
          scoresCsv: `${mScore1}-${mScore2}`,
          player1Id: m.player1?.id ?? m.player1?.display_name ?? null,
          player2Id: m.player2?.id ?? m.player2?.display_name ?? null,
          player1PrereqId: p1Pre,
          player2PrereqId: p2Pre,
        },
        prior
          ? {
              state: prior.state,
              scoresCsv: `${pScore1}-${pScore2}`,
              player1Id: prior.player1?.id ?? prior.player1?.display_name ?? null,
              player2Id: prior.player2?.id ?? prior.player2?.display_name ?? null,
            }
          : null,
      );
    });
  }

  const roundNumbers = Object.keys(filteredByRound)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n));
  if (roundNumbers.length === 0 && (!groups || groups.length === 0)) return null;

  const grouped = new Map<number, ModuleMatch[]>();
  for (const n of roundNumbers) {
    grouped.set(n, filteredByRound[String(n)] ?? []);
  }

  const positiveRounds = roundNumbers.filter((r) => r > 0);
  const maxPositive =
    positiveRounds.length > 0 ? Math.max(...positiveRounds) : null;
  const isDouble = tournamentType.toLowerCase().includes("double");
  const sortedRoundKeys = sortRoundKeys(roundNumbers, tournamentType);
  const winnerKeys = sortedRoundKeys.filter((r) => {
    const isGrandFinal =
      isDouble &&
      maxPositive !== null &&
      r === maxPositive &&
      (grouped.get(r)?.length ?? 0) === 1;
    return r > 0 && !isGrandFinal;
  });

  const titleByNumber = new Map<number, string>();
  for (const r of store.rounds ?? []) {
    if (typeof r.number === "number" && r.title) titleByNumber.set(r.number, r.title);
  }

  const participants = new Set<string>();
  const rounds: BracketRoundView[] = sortedRoundKeys.map((round) => {
    const roundMatches = [...(grouped.get(round) ?? [])];
    const isGrandFinal =
      isDouble &&
      maxPositive !== null &&
      round === maxPositive &&
      roundMatches.length === 1;
    const side = roundSide(round, tournamentType, isGrandFinal);
    const winnersRoundIndex = winnerKeys.indexOf(round);
    const label =
      titleByNumber.get(round) ||
      roundLabel(
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
      matches: roundMatches.map((m, idx) => {
        const [score1, score2] = moduleScores(m);
        const p1 = m.player1;
        const p2 = m.player2;
        if (p1?.display_name) participants.add(p1.display_name);
        if (p2?.display_name) participants.add(p2.display_name);
        const complete = (m.state ?? "").toLowerCase() === "complete";
        const s1 = Number(score1);
        const s2 = Number(score2);
        const p1Win =
          complete &&
          (m.winner_id != null
            ? m.winner_id === p1?.id
            : Number.isFinite(s1) && Number.isFinite(s2) && s1 > s2);
        const p2Win =
          complete &&
          (m.winner_id != null
            ? m.winner_id === p2?.id
            : Number.isFinite(s1) && Number.isFinite(s2) && s2 > s1);

        return {
          id: String(m.id ?? `${round}-${m.identifier ?? idx}`),
          matchNumber:
            typeof m.identifier === "number"
              ? m.identifier
              : Number(m.identifier) || idx + 1,
          state: matchState(m.state ?? "pending"),
          slots: [
            {
              seed: p1?.seed ?? null,
              name: p1?.display_name?.trim() || "TBD",
              score: score1,
              isWinner: Boolean(p1Win),
            },
            {
              seed: p2?.seed ?? null,
              name: p2?.display_name?.trim() || "TBD",
              score: score2,
              isWinner: Boolean(p2Win),
            },
          ],
          player1PrereqMatchId: m.player1_prereq_identifier
            ? String(m.player1_prereq_identifier)
            : null,
          player2PrereqMatchId: m.player2_prereq_identifier
            ? String(m.player2_prereq_identifier)
            : null,
        };
      }),
    };
  });

  // Standings from completed match W-L
  const recordMap = new Map<string, { wins: number; losses: number }>();
  for (const name of participants) recordMap.set(name, { wins: 0, losses: 0 });
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.state !== "complete") continue;
      const [a, b] = match.slots;
      if (!a?.isWinner && !b?.isWinner) continue;
      if (a?.isWinner && a.name !== "TBD") {
        const ra = recordMap.get(a.name) ?? { wins: 0, losses: 0 };
        ra.wins += 1;
        recordMap.set(a.name, ra);
        if (b?.name && b.name !== "TBD") {
          const rb = recordMap.get(b.name) ?? { wins: 0, losses: 0 };
          rb.losses += 1;
          recordMap.set(b.name, rb);
        }
      } else if (b?.isWinner && b.name !== "TBD") {
        const rb = recordMap.get(b.name) ?? { wins: 0, losses: 0 };
        rb.wins += 1;
        recordMap.set(b.name, rb);
        if (a?.name && a.name !== "TBD") {
          const ra = recordMap.get(a.name) ?? { wins: 0, losses: 0 };
          ra.losses += 1;
          recordMap.set(a.name, ra);
        }
      }
    }
  }

  const ranked = [...recordMap.entries()]
    .sort((x, y) => y[1].wins - x[1].wins || x[1].losses - y[1].losses)
    .slice(0, 2);
  const hasResults = ranked.some(([, r]) => r.wins > 0 || r.losses > 0);
  const finalStandings: FinalStandingView[] = hasResults
    ? ranked.map(([name, r], idx) => ({
        rank: idx + 1,
        name,
        record: `${r.wins} - ${r.losses}`,
      }))
    : [];

  if (groups) {
    for (const group of groups) {
      for (const standing of group.standings) {
        if (standing.name.trim()) participants.add(standing.name);
      }
      for (const round of group.rounds) {
        for (const match of round.matches) {
          for (const slot of match.slots) {
            const name = slot.name?.trim();
            if (name && name !== "TBD" && name !== "BYE") participants.add(name);
          }
        }
      }
    }
  }

  return {
    tournamentName: store.tournament?.name || "Tournament",
    tournamentType,
    rounds,
    participants: [...participants],
    finalStandings,
    groups,
    mvp: null,
    sourceUrl: challongePageUrl(url),
    fetchedAt: new Date().toISOString(),
  };
}

const MODULE_STORE_MARKERS = [
  "window._initialStoreState['TournamentStore'] = ",
  'window._initialStoreState["TournamentStore"] = ',
  "TournamentStore.fill = ",
] as const;

function findModuleStoreJson(html: string): string | null {
  for (const marker of MODULE_STORE_MARKERS) {
    const markerIdx = html.indexOf(marker);
    if (markerIdx < 0) continue;
    let start = markerIdx + marker.length;
    while (start < html.length && /\s/.test(html[start]!)) start++;
    const jsonText = extractBalancedJsonObject(html, start);
    if (jsonText) return jsonText;
  }
  return null;
}

/** Public Challonge module page embeds bracket JSON — no API quota. */
async function fetchChallongeModuleBracket(
  bracketUrl: string,
  slug: string,
): Promise<TournamentBracketView | null> {
  try {
    const res = await fetch(`https://challonge.com/${encodeURIComponent(slug)}/module`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: FETCH_REVALIDATE_SEC },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const jsonText = findModuleStoreJson(html);
    if (!jsonText) return null;
    const store = JSON.parse(jsonText) as ModuleStore;
    return normalizeModuleStore(bracketUrl, store);
  } catch (error) {
    console.warn("[challonge] module scrape failed:", error);
    return null;
  }
}

export async function fetchChallongeBracket(
  bracketUrl: string,
  allowStaleCache = false,
): Promise<TournamentBracketView | null> {
  const slug = challongeSlugFromUrl(bracketUrl);
  if (!slug) return null;

  await loadQuotaState();

  const memHit = rememberedBracket(slug);
  if (memHit) return memHit;

  const redisHit = await getJson<TournamentBracketView>(redisBracketKey(slug));
  if (redisHit) {
    memoryCache.set(slug, { expiresAt: Date.now() + MEMORY_TTL_MS, bracket: redisHit });
    return redisHit;
  }

  const disk = await readDiskCache(slug);
  if (disk) {
    memoryCache.set(slug, {
      expiresAt: Date.now() + MEMORY_TTL_MS,
      bracket: disk.bracket,
    });
    // Fresh disk hit (or completed tournament allowing stale cache) — skip Challonge entirely (saves quota & load time).
    if (disk.ageMs < DISK_FRESH_MS || allowStaleCache) return disk.bracket;
  }

  // Prefer public module page (native UI, no API quota).
  const fromModule = await fetchChallongeModuleBracket(bracketUrl, slug);
  if (fromModule) {
    persistBracket(slug, fromModule, allowStaleCache);
    return fromModule;
  }

  const apiKey = process.env.CHALLONGE_API_KEY;
  if (!apiKey) return disk?.bracket ?? rememberedBracket(slug);

  // Quota / rate cooldown — never hammer Challonge; serve last good native bracket.
  if (Date.now() < rateLimitedUntil) {
    return disk?.bracket ?? rememberedBracket(slug);
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    include_participants: "1",
    include_matches: "1",
  });

  try {
    const res = await fetch(
      `https://api.challonge.com/v1/tournaments/${encodeURIComponent(slug)}.json?${params}`,
      {
        next: { revalidate: FETCH_REVALIDATE_SEC },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (res.status === 429) {
      const detail = await res.text().catch(() => "");
      const monthly = /30 days|monthly|request limit exceeded/i.test(detail);
      await persistQuotaState(
        Date.now() + (monthly ? COOLDOWN_QUOTA_MS : COOLDOWN_429_MS),
      );
      if (!logged429) {
        logged429 = true;
        console.warn(
          `[challonge] rate limited (429)${monthly ? " — monthly quota exhausted" : ""} — using cache/module`,
        );
      }
      return disk?.bracket ?? rememberedBracket(slug);
    }

    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(`[challonge] ${slug} HTTP ${res.status}`);
      }
      return disk?.bracket ?? rememberedBracket(slug);
    }

    const data = (await res.json()) as ChallongeResponse;
    if (!data.tournament) return disk?.bracket ?? rememberedBracket(slug);

    const { matches: matchRows, participants } = extractChallongePayload(data);
    const tournamentType = (data.tournament.tournament_type ?? "single_elimination").toLowerCase();
    const isRoundRobin =
      tournamentType.includes("round_robin") || tournamentType.includes("round robin");

    let bracket: TournamentBracketView | null = null;

    if (matchRows.length === 0) {
      if (participants.length > 0) {
        if (isRoundRobin) {
          bracket = generateRoundRobinBracketFromParticipants(
            participants.map((p) => ({ seed: p.participant.seed, name: p.participant.name })),
            data.tournament.name,
          );
        } else {
          bracket = generateBracketFromParticipants(
            participants.map((p) => ({ seed: p.participant.seed, name: p.participant.name })),
            data.tournament.name,
          );
        }
      }
    } else {
      bracket = normalizeResponse(bracketUrl, data);
    }

    if (bracket) {
      persistBracket(slug, bracket, allowStaleCache);
      return bracket;
    }
    return disk?.bracket ?? null;
  } catch (error) {
    console.warn("[challonge] fetch failed:", error);
    return disk?.bracket ?? rememberedBracket(slug);
  }
}

/** Fetch several brackets in parallel (cup detail page only). */
export async function fetchChallongeBrackets(
  urls: string[],
  allowStaleCache = false,
): Promise<{ url: string; bracket: TournamentBracketView | null }[]> {
  return Promise.all(
    urls.map(async (url) => ({
      url,
      bracket: await fetchChallongeBracket(url, allowStaleCache),
    })),
  );
}
