import {
  BracketType,
  MatchStatus,
  ParticipantType,
  type StageType,
} from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@core/database/client";
import { getStagePlugin } from "./stage-registry";
import { resolveStageSeeding, snakeDistribute } from "./seeding.engine";
import type {
  GeneratedMatch,
  StageGenerateContext,
} from "@tournaments-leagues/domain/stages/types";

/** Matches created per insert request — one at a time to stay under Vercel 60s. */
export const MATCH_INSERT_BATCH = 1;

const MATCH_GEN_JOB_KEY = "_matchGenJob";

type StoredMatchGenJob = {
  bracketId: string;
  generated: GeneratedMatch[];
  createdAt: number;
};

function parseConfigRecord(config: unknown): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}

async function loadMatchGenJob(stageId: string): Promise<StoredMatchGenJob | null> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    select: { config: true },
  });
  const raw = parseConfigRecord(stage?.config)[MATCH_GEN_JOB_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const job = raw as StoredMatchGenJob;
  if (!job.bracketId || !Array.isArray(job.generated)) return null;
  return job;
}

async function saveMatchGenJob(
  stageId: string,
  job: StoredMatchGenJob | null,
): Promise<void> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    select: { config: true },
  });
  const next = parseConfigRecord(stage?.config);
  if (job) {
    next[MATCH_GEN_JOB_KEY] = job;
  } else {
    delete next[MATCH_GEN_JOB_KEY];
  }
  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: { config: next as object },
  });
}

async function resolveGeneratedForJob(
  stageId: string,
  bracketId: string,
): Promise<GeneratedMatch[]> {
  const job = await loadMatchGenJob(stageId);
  if (job?.bracketId === bracketId && job.generated.length > 0) {
    return job.generated;
  }
  const { generated } = await buildGeneratedMatchesForStage(stageId);
  return generated;
}

function newId(): string {
  return `c${randomBytes(12).toString("hex")}`;
}

function stageTypeToBracketType(type: StageType): BracketType {
  switch (type) {
    case "SINGLE_ELIMINATION":
      return BracketType.SINGLE_ELIMINATION;
    case "DOUBLE_ELIMINATION":
      return BracketType.DOUBLE_ELIMINATION;
    case "ROUND_ROBIN":
      return BracketType.ROUND_ROBIN;
    case "SWISS":
      return BracketType.SWISS;
    case "GSL":
      return BracketType.GSL;
    case "LEAGUE":
      return BracketType.LEAGUE;
    default:
      return BracketType.HYBRID;
  }
}

function placementKey(m: {
  stageGroupId?: string | null;
  roundNumber: number;
  positionInRound: number;
  bracketSide?: string | null;
}): string {
  return `${m.stageGroupId ?? ""}|${m.roundNumber}|${m.positionInRound}|${m.bracketSide ?? ""}`;
}

function chunkEvenly(ids: string[], chunks: number): string[][] {
  const result: string[][] = Array.from({ length: Math.max(1, chunks) }, () => []);
  ids.forEach((id, i) => {
    result[i % result.length]!.push(id);
  });
  return result;
}

async function loadStageForGenerate(stageId: string) {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: {
          slots: { orderBy: { slotIndex: "asc" }, include: { team: true } },
        },
      },
      tournament: { select: { id: true } },
      bracket: true,
    },
  });
  if (!stage) throw new Error("Stage not found.");
  return stage;
}

async function ensureGroupSlotsFromSeeding(
  stage: Awaited<ReturnType<typeof loadStageForGenerate>>,
): Promise<Awaited<ReturnType<typeof loadStageForGenerate>>> {
  const seedingMethod =
    stage.seedingMethod === "RANDOM" ? "MANUAL" : stage.seedingMethod;
  const seeded = await resolveStageSeeding({
    tournamentId: stage.tournamentId,
    stageId: stage.id,
    method: seedingMethod,
  });

  if (stage.groups.length === 0 || seeded.length === 0) return stage;

  const filledCounts = stage.groups.map(
    (g) => g.slots.filter((s) => s.teamId).length,
  );
  const someEmpty = filledCounts.some((c) => c === 0);
  const someFilled = filledCounts.some((c) => c > 0);
  const noneFilled = filledCounts.every((c) => c === 0);
  const shouldDistribute = noneFilled || (someEmpty && someFilled);
  if (!shouldDistribute) return stage;

  const method = stage.seedingMethod;
  const distribution =
    method === "SNAKE"
      ? snakeDistribute(
          seeded.map((s) => s.teamId),
          stage.groups.length,
        )
      : chunkEvenly(
          seeded.map((s) => s.teamId),
          stage.groups.length,
        );

  for (let gi = 0; gi < stage.groups.length; gi++) {
    const group = stage.groups[gi]!;
    const teamIds = distribution[gi] ?? [];
    await prisma.stageGroupSlot.deleteMany({ where: { groupId: group.id } });
    const targetSize = Math.max(teamIds.length, group.targetSize ?? 0, 2);
    await prisma.tournamentStageGroup.update({
      where: { id: group.id },
      data: { targetSize },
    });
    await prisma.stageGroupSlot.createMany({
      data: Array.from({ length: targetSize }, (_, si) => ({
        groupId: group.id,
        slotIndex: si,
        teamId: teamIds[si] ?? null,
      })),
    });
  }

  return loadStageForGenerate(stage.id);
}

export async function buildGeneratedMatchesForStage(
  stageId: string,
): Promise<{ generated: GeneratedMatch[]; tournamentId: string; stageType: StageType }> {
  let stage = await loadStageForGenerate(stageId);
  const plugin = getStagePlugin(stage.stageType);
  if (!plugin.runnable) {
    throw new Error(`${stage.stageType} cannot generate matches yet.`);
  }

  stage = await ensureGroupSlotsFromSeeding(stage);

  // Never re-shuffle RANDOM when recomputing pairings across chunked inserts —
  // use persisted StageSeedingEntry / group slots as the stable order.
  const seedingMethod =
    stage.seedingMethod === "RANDOM" ? "MANUAL" : stage.seedingMethod;

  const seeded = await resolveStageSeeding({
    tournamentId: stage.tournamentId,
    stageId: stage.id,
    method: seedingMethod,
  });

  const teamNames = new Map<string, string>();
  for (const s of seeded) teamNames.set(s.teamId, s.name);
  for (const g of stage.groups) {
    for (const slot of g.slots) {
      if (slot.teamId && slot.team) teamNames.set(slot.teamId, slot.team.name);
    }
  }

  const ctx: StageGenerateContext = {
    stageId: stage.id,
    stageType: stage.stageType,
    matchFormat: stage.matchFormat,
    config: stage.config,
    seededTeamIds: seeded.map((s) => s.teamId),
    teamNames,
    groups: stage.groups.map((g) => {
      const names = new Map<string, string>();
      const teamIds = g.slots
        .filter((s) => s.teamId && !s.eliminated)
        .map((s) => {
          names.set(
            s.teamId!,
            s.team?.name ?? teamNames.get(s.teamId!) ?? "Team",
          );
          return s.teamId!;
        });
      return {
        id: g.id,
        name: g.name,
        order: g.order,
        teamIds,
        teamNames: names,
      };
    }),
  };

  return {
    generated: plugin.generateMatches(ctx),
    tournamentId: stage.tournamentId,
    stageType: stage.stageType,
  };
}

/**
 * Wipe old bracket, create empty bracket, return total matches to insert.
 * Does not insert matches — client continues with insert batches.
 */
export async function prepareMatchGeneration(stageId: string): Promise<{
  jobId: string;
  bracketId: string;
  total: number;
  cursor: number;
  complete: false;
}> {
  const { generated, tournamentId, stageType } =
    await buildGeneratedMatchesForStage(stageId);

  if (generated.length === 0) {
    throw new Error("No matches to generate — check pools / seeding.");
  }

  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: { bracket: true },
  });
  if (!stage) throw new Error("Stage not found.");

  if (stage.bracket) {
    await prisma.match.deleteMany({ where: { bracketId: stage.bracket.id } });
    await prisma.bracket.delete({ where: { id: stage.bracket.id } });
  }

  await prisma.tournamentPlacement.deleteMany({
    where: { tournamentId, role: "CHAMPION" },
  });

  const totalRounds =
    generated.reduce((max, m) => Math.max(max, m.roundNumber), 0) || 1;

  const bracket = await prisma.bracket.create({
    data: {
      stageId,
      tournamentId: null,
      type: stageTypeToBracketType(stageType),
      totalRounds,
    },
  });

  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: { status: "READY" },
  });

  await saveMatchGenJob(stageId, {
    bracketId: bracket.id,
    generated,
    createdAt: Date.now(),
  });

  return {
    jobId: stageId,
    bracketId: bracket.id,
    total: generated.length,
    cursor: 0,
    complete: false,
  };
}

/**
 * Insert the next MATCH_INSERT_BATCH matches via bulk SQL.
 * Deterministically recomputes the full list and slices by cursor.
 */
export async function insertMatchGenerationBatch(
  stageId: string,
  cursor: number,
  batchSize = MATCH_INSERT_BATCH,
): Promise<{
  jobId: string;
  cursor: number;
  created: number;
  total: number;
  complete: boolean;
}> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: { bracket: true },
  });
  if (!stage?.bracket) {
    throw new Error("Generate not prepared — call prepare first.");
  }
  const bracketId = stage.bracket.id;

  const generated = await resolveGeneratedForJob(stageId, bracketId);
  const total = generated.length;
  const safeCursor = Math.max(0, Math.min(cursor, total));

  // Resume: if DB already has more rows than cursor (partial prior success), advance.
  const existingCount = await prisma.match.count({ where: { bracketId } });
  const effectiveCursor = Math.max(safeCursor, existingCount);

  if (effectiveCursor >= total) {
    return {
      jobId: stageId,
      cursor: total,
      created: 0,
      total,
      complete: true,
    };
  }

  const slice = generated.slice(effectiveCursor, effectiveCursor + batchSize);
  if (slice.length === 0) {
    return {
      jobId: stageId,
      cursor: total,
      created: 0,
      total,
      complete: true,
    };
  }

  const matchRows: {
    id: string;
    m: GeneratedMatch;
  }[] = slice.map((m) => ({ id: newId(), m }));

  await prisma.match.createMany({
    data: matchRows.map(({ id, m }) => ({
      id,
      bracketId,
      stageGroupId: m.stageGroupId ?? null,
      roundNumber: m.roundNumber,
      positionInRound: m.positionInRound,
      bracketSide: m.bracketSide ?? null,
      status: m.status === "BYE" ? MatchStatus.BYE : MatchStatus.SCHEDULED,
      scheduleStatus: "UNSET",
      confirmedBySlot0: false,
      confirmedBySlot1: false,
    })),
  });

  const participantData = matchRows.flatMap(({ id: matchId, m }) =>
    m.participants.map((part) => ({
      id: newId(),
      matchId,
      slot: part.slot,
      participantType: ParticipantType.TEAM,
      tournamentTeamId: part.tournamentTeamId ?? null,
      teamLabel: part.teamLabel ?? null,
      seed: part.seed ?? null,
    })),
  );

  if (participantData.length > 0) {
    await prisma.matchParticipant.createMany({ data: participantData });
  }

  const nextCursor = effectiveCursor + slice.length;
  return {
    jobId: stageId,
    cursor: nextCursor,
    created: slice.length,
    total,
    complete: nextCursor >= total,
  };
}

/**
 * Wire next-match links, advance BYEs, mark stage LIVE.
 */
export async function finalizeMatchGeneration(stageId: string): Promise<{
  complete: true;
  matchCount: number;
}> {
  const stage = await prisma.tournamentStage.findUnique({
    where: { id: stageId },
    include: { bracket: true },
  });
  if (!stage?.bracket) {
    throw new Error("Generate not prepared — call prepare first.");
  }
  const bracketId = stage.bracket.id;

  const generated = await resolveGeneratedForJob(stageId, bracketId);
  const dbMatches = await prisma.match.findMany({
    where: { bracketId },
    select: {
      id: true,
      roundNumber: true,
      positionInRound: true,
      bracketSide: true,
      stageGroupId: true,
    },
  });

  const idByPlacement = new Map<string, string>();
  for (const m of dbMatches) {
    idByPlacement.set(placementKey(m), m.id);
  }

  const keyToId = new Map<string, string>();
  for (const m of generated) {
    const id = idByPlacement.get(placementKey(m));
    if (id) keyToId.set(m.key, id);
  }

  const linkUpdates = generated
    .map((m) => {
      const id = keyToId.get(m.key);
      if (!id) return null;
      const nextWinnerId = m.nextWinnerKey ? keyToId.get(m.nextWinnerKey) : null;
      const nextLoserId = m.nextLoserKey ? keyToId.get(m.nextLoserKey) : null;
      if (!nextWinnerId && !nextLoserId) return null;
      return prisma.match.update({
        where: { id },
        data: {
          nextWinnerMatchId: nextWinnerId ?? null,
          nextLoserMatchId: nextLoserId ?? null,
        },
      });
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const LINK_BATCH = 8;
  for (let i = 0; i < linkUpdates.length; i += LINK_BATCH) {
    await Promise.all(linkUpdates.slice(i, i + LINK_BATCH));
  }

  const byeMatches = await prisma.match.findMany({
    where: { bracketId, status: MatchStatus.BYE },
    include: { participants: true },
  });
  for (const bye of byeMatches) {
    const winner = bye.participants.find((p) => p.tournamentTeamId);
    if (winner && bye.nextWinnerMatchId) {
      await placeTeamInMatch(
        bye.nextWinnerMatchId,
        winner.tournamentTeamId!,
        winner.teamLabel,
      );
    }
  }

  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: { status: "LIVE" },
  });

  await saveMatchGenJob(stageId, null);

  return { complete: true, matchCount: generated.length };
}

/** Full generate in one process (sync / internal). Prefer chunked API from the UI. */
export async function generateMatchesForStage(
  stageId: string,
): Promise<{ matchCount: number }> {
  await prepareMatchGeneration(stageId);
  let cursor = 0;
  let total = Infinity;
  for (;;) {
    const batch = await insertMatchGenerationBatch(stageId, cursor);
    total = batch.total;
    cursor = batch.cursor;
    if (batch.complete || cursor >= total) break;
  }
  const done = await finalizeMatchGeneration(stageId);
  return { matchCount: done.matchCount };
}

async function placeTeamInMatch(
  matchId: string,
  teamId: string,
  teamLabel: string | null,
  preferredSlot?: number,
): Promise<void> {
  const target = await prisma.match.findUnique({
    where: { id: matchId },
    select: { bracketId: true, result: { select: { id: true } } },
  });
  if (!target) return;
  if (target.result) return;

  await prisma.matchParticipant.updateMany({
    where: {
      tournamentTeamId: teamId,
      match: {
        bracketId: target.bracketId,
        id: { not: matchId },
        result: null,
      },
    },
    data: { tournamentTeamId: null, teamLabel: null },
  });

  const slots = await prisma.matchParticipant.findMany({
    where: { matchId },
    orderBy: { slot: "asc" },
  });

  if (slots.some((s) => s.tournamentTeamId === teamId)) return;

  const preferred =
    preferredSlot != null
      ? slots.find((s) => s.slot === preferredSlot)
      : null;

  if (preferred) {
    await prisma.matchParticipant.update({
      where: { id: preferred.id },
      data: {
        tournamentTeamId: teamId,
        teamLabel: teamLabel,
        participantType: ParticipantType.TEAM,
      },
    });
    return;
  }

  const empty = slots.find((s) => !s.tournamentTeamId);
  if (!empty) return;

  await prisma.matchParticipant.update({
    where: { id: empty.id },
    data: {
      tournamentTeamId: teamId,
      teamLabel: teamLabel,
      participantType: ParticipantType.TEAM,
    },
  });
}

export { placeTeamInMatch };
