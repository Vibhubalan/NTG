import type { TournamentBracketView } from "@core/contracts/tournament-bracket";

export type VetoFormat = "BO1" | "BO3" | "BO5";
/** Where a match sits in the cup — this, not the players, decides its series length. */
export type VetoStage = "group" | "playoffs" | "semis" | "final";
export type VetoFormats = Record<VetoStage, VetoFormat>;

export const VETO_STAGES: { stage: VetoStage; label: string }[] = [
  { stage: "group", label: "Group stage" },
  { stage: "playoffs", label: "Playoffs — early rounds" },
  { stage: "semis", label: "Semifinals" },
  { stage: "final", label: "Finals" },
];

export const DEFAULT_VETO_FORMATS: VetoFormats = {
  group: "BO1",
  playoffs: "BO1",
  semis: "BO3",
  final: "BO5",
};

const FORMATS = new Set<string>(["BO1", "BO3", "BO5"]);

/** Stored config, with defaults for any stage an admin hasn't set. */
export function parseVetoFormats(value: unknown): VetoFormats {
  const out = { ...DEFAULT_VETO_FORMATS };
  if (value && typeof value === "object") {
    for (const { stage } of VETO_STAGES) {
      const f = (value as Record<string, unknown>)[stage];
      if (typeof f === "string" && FORMATS.has(f)) out[stage] = f as VetoFormat;
    }
  }
  return out;
}

/** Maps a format needs: one per pick plus the decider (mirrors the services app). */
export function minPoolSize(format: VetoFormat): number {
  return format === "BO1" ? 1 : format === "BO3" ? 3 : 5;
}

/**
 * Stage of a Challonge match, or null when it isn't in this bracket.
 *
 * Finals is the grand final (double elim) or the last winners round (single
 * elim). Semis are the matches feeding it — in double elim that is both the
 * winners final and the losers final.
 */
export function vetoStageFor(bracket: TournamentBracketView, matchId: string): VetoStage | null {
  const has = (r: { matches: { id: string }[] }) => r.matches.some((m) => m.id === matchId);

  if (bracket.groups?.some((g) => g.rounds.some(has))) return "group";

  const round = bracket.rounds.find(has);
  if (!round) return null;

  const type = (bracket.tournamentType ?? "").toLowerCase();
  if (type.includes("round") || type.includes("swiss")) return "group";
  if (round.side === "final") return "final";

  const sameSide = bracket.rounds
    .filter((r) => r.side === round.side)
    .sort((a, b) => Math.abs(a.roundNumber) - Math.abs(b.roundNumber));
  const fromEnd = sameSide.length - 1 - sameSide.indexOf(round);
  const hasGrandFinal = bracket.rounds.some((r) => r.side === "final");

  if (round.side === "winners" && !hasGrandFinal) {
    return fromEnd === 0 ? "final" : fromEnd === 1 ? "semis" : "playoffs";
  }
  return fromEnd === 0 ? "semis" : "playoffs";
}

/** Pool the services app will actually use — below 2 maps it swaps in its 7-map default. */
export function effectivePoolSize(pool: unknown): number {
  const n = Array.isArray(pool) ? pool.filter((m) => typeof m === "string" && m.trim()).length : 0;
  return n >= 2 ? n : 7;
}

/** Why this format setup can't run on the pool, or null when every stage fits. */
export function vetoPoolError(formats: VetoFormats, poolSize: number): string | null {
  const short = VETO_STAGES.filter(({ stage }) => minPoolSize(formats[stage]) > poolSize);
  if (!short.length) return null;
  const list = short.map((s) => `${s.label} (${formats[s.stage]})`).join(", ");
  return `${list} ${short.length === 1 ? "needs" : "need"} more than the ${poolSize} maps in the pool.`;
}

/**
 * Live vetoes whose stage now maps to a different format, with the format to
 * switch to. Matches whose stage can't be found are left alone.
 */
export function vetoesToRestart<T extends { challongeMatchId: string; format: VetoFormat }>(
  live: T[],
  stages: Map<string, VetoStage>,
  formats: VetoFormats,
): (T & { nextFormat: VetoFormat })[] {
  return live.flatMap((m) => {
    const stage = stages.get(m.challongeMatchId);
    return stage && formats[stage] !== m.format ? [{ ...m, nextFormat: formats[stage] }] : [];
  });
}
