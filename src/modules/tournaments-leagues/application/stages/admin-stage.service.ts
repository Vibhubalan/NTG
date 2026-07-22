import type {
  SeedingMethod,
  StageMatchFormat,
  StageStatus,
  StageType,
} from "@prisma/client";
import { prisma } from "@core/database/client";
import type {
  StageGraphInput,
  StageInput,
  ValidationIssue,
} from "@tournaments-leagues/domain/stages/types";
import { validateStageGraph } from "@tournaments-leagues/domain/stages/validation";
import { getStagePlugin } from "./stage-registry";
import {
  finalizeMatchGeneration,
  generateMatchesForStage,
  insertMatchGenerationBatch,
  prepareMatchGeneration,
} from "./match-generation.engine";
import { applyStageMovement } from "./movement.engine";
import {
  evaluateStageQualification,
  type QualificationPlacement,
} from "./qualification.engine";
import { parseStoredGames } from "./series-format";

export type AdminStageGraph = {
  stages: AdminStageNode[];
  validation: ValidationIssue[];
};

export type AdminStageNode = {
  id: string;
  name: string;
  order: number;
  stageType: StageType;
  matchFormat: StageMatchFormat;
  seedingMethod: SeedingMethod;
  status: StageStatus;
  config: unknown;
  tieBreakRules: unknown;
  runnable: boolean;
  groups: {
    id: string;
    name: string;
    order: number;
    targetSize: number | null;
    slots: {
      id: string;
      slotIndex: number;
      teamId: string | null;
      teamName: string | null;
      sourceStageId: string | null;
      sourceGroupId: string | null;
      sourcePosition: number | null;
    }[];
  }[];
  rules: {
    id: string;
    groupId: string | null;
    priority: number;
    selector: unknown;
    destination: unknown;
  }[];
  seeding: { teamId: string; teamName: string; seed: number }[];
  matchCount: number;
  matches: {
    id: string;
    roundNumber: number;
    positionInRound: number;
    bracketSide: string | null;
    status: string;
    stageGroupId: string | null;
    stageGroupName: string | null;
    scheduledAt: string | null;
    scheduleStatus: string;
    confirmedBySlot0: boolean;
    confirmedBySlot1: boolean;
    resultDeadlineAt: string | null;
    participants: {
      slot: number;
      teamId: string | null;
      teamLabel: string | null;
    }[];
    result: {
      winnerSlot: number;
      scoreSummary: string | null;
      scoreA: number | null;
      scoreB: number | null;
      screenshotUrl: string | null;
      games: {
        winnerSlot: 0 | 1;
        scoreA?: number | null;
        scoreB?: number | null;
        screenshotUrl?: string | null;
      }[] | null;
    } | null;
  }[];
};

async function resolveTournamentId(slug: string): Promise<string> {
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!t) throw new Error("Tournament not found.");
  return t.id;
}

function ruleTargetsStage(destination: unknown, stageId: string): boolean {
  if (!destination || typeof destination !== "object") return false;
  const d = destination as { kind?: string; stageId?: string };
  return (
    (d.kind === "STAGE" || d.kind === "STAGE_GROUP") && d.stageId === stageId
  );
}

function remapRuleDestination(
  destination: unknown,
  allStages: { id: string; order: number }[],
  fromStageOrder: number,
): unknown {
  if (!destination || typeof destination !== "object") return destination;
  const d = destination as { kind?: string; stageId?: string; groupId?: string };
  if (d.kind !== "STAGE" && d.kind !== "STAGE_GROUP") return destination;

  const target = d.stageId ? allStages.find((s) => s.id === d.stageId) : null;
  // Keep valid later-stage destinations exactly as configured (no silent remap).
  if (target && target.order > fromStageOrder) return destination;
  return destination;
}

/** Repair broken stage links — do not invent TOP→next feeders when rules exist. */
async function syncStageChain(tournamentId: string): Promise<void> {
  const stages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
    include: {
      groups: { orderBy: { order: "asc" } },
      qualificationRules: { orderBy: { priority: "asc" } },
    },
  });

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]!;
    const next = stages[i + 1];
    if (!next) continue;

    // Only ensure a default feeder when the previous stage has no advancement rules at all.
    const hasAdvanceRule = stage.qualificationRules.some((r) => {
      const dest = r.destination as { kind?: string };
      return dest.kind === "STAGE" || dest.kind === "STAGE_GROUP";
    });
    if (!hasAdvanceRule) {
      await ensureFeederRules(stage.id, next.id);
    }
  }
}

async function ensureFeederRules(
  previousStageId: string,
  targetStageId: string,
): Promise<void> {
  const previous = await prisma.tournamentStage.findUnique({
    where: { id: previousStageId },
    include: {
      groups: { orderBy: { order: "asc" } },
      qualificationRules: true,
    },
  });
  if (!previous) return;

  // Never override admin-configured qualification (Top→playoffs, places→stage 2, etc.).
  if (previous.qualificationRules.length > 0) return;

  const hasLink = previous.qualificationRules.some((r) =>
    ruleTargetsStage(r.destination, targetStageId),
  );
  if (hasLink) return;

  const destination = { kind: "STAGE", stageId: targetStageId };
  if (previous.groups.length > 0) {
    await prisma.stageQualificationRule.createMany({
      data: previous.groups.map((g, i) => ({
        stageId: previous.id,
        groupId: g.id,
        priority: i,
        selector: { kind: "TOP_N", n: 2 },
        destination,
      })),
    });
  } else {
    await prisma.stageQualificationRule.create({
      data: {
        stageId: previous.id,
        groupId: null,
        priority: 0,
        selector: { kind: "TOP_N", n: 2 },
        destination,
      },
    });
  }
}

async function getStageRosterTeamIds(stageId: string): Promise<string[]> {
  const [slots, entries] = await Promise.all([
    prisma.stageGroupSlot.findMany({
      where: { group: { stageId }, teamId: { not: null } },
      select: { teamId: true },
      orderBy: { slotIndex: "asc" },
    }),
    prisma.stageSeedingEntry.findMany({
      where: { stageId },
      orderBy: { seed: "asc" },
      select: { teamId: true },
    }),
  ]);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const s of slots) {
    if (s.teamId && !seen.has(s.teamId)) {
      seen.add(s.teamId);
      ids.push(s.teamId);
    }
  }
  for (const e of entries) {
    if (!seen.has(e.teamId)) {
      seen.add(e.teamId);
      ids.push(e.teamId);
    }
  }
  return ids;
}

type MatchRow = NonNullable<AdminStageNode["matches"]>[number];

function mapAdminMatch(m: {
  id: string;
  roundNumber: number;
  positionInRound: number;
  bracketSide: string | null;
  status: string;
  stageGroupId: string | null;
  scheduledAt: Date | null;
  scheduleStatus: string;
  confirmedBySlot0: boolean;
  confirmedBySlot1: boolean;
  resultDeadlineAt: Date | null;
  stageGroup: { name: string } | null;
  participants: {
    slot: number;
    tournamentTeamId: string | null;
    teamLabel: string | null;
  }[];
  result: {
    winnerSlot: number;
    scoreSummary: string | null;
    scoreA: number | null;
    scoreB: number | null;
    screenshotUrl: string | null;
    games?: unknown;
  } | null;
}): MatchRow {
  return {
    id: m.id,
    roundNumber: m.roundNumber,
    positionInRound: m.positionInRound,
    bracketSide: m.bracketSide,
    status: m.status,
    stageGroupId: m.stageGroupId,
    stageGroupName: m.stageGroup?.name ?? null,
    scheduledAt: m.scheduledAt?.toISOString() ?? null,
    scheduleStatus: m.scheduleStatus,
    confirmedBySlot0: m.confirmedBySlot0,
    confirmedBySlot1: m.confirmedBySlot1,
    resultDeadlineAt: m.resultDeadlineAt?.toISOString() ?? null,
    participants: m.participants.map((p) => ({
      slot: p.slot,
      teamId: p.tournamentTeamId,
      teamLabel: p.teamLabel,
    })),
    result: m.result
      ? {
          winnerSlot: m.result.winnerSlot,
          scoreSummary: m.result.scoreSummary,
          scoreA: m.result.scoreA ?? null,
          scoreB: m.result.scoreB ?? null,
          screenshotUrl: m.result.screenshotUrl ?? null,
          games: parseStoredGames((m.result as { games?: unknown }).games),
        }
      : null,
  };
}

/**
 * Admin stage graph. Defaults are fast: no chain repair, no match payloads.
 * Pass `includeMatches: true` (all stages) or a stageId (one stage) when needed.
 */
export async function getStageGraphAdmin(
  slug: string,
  options?: {
    skipChainRepair?: boolean;
    includeMatches?: boolean | string;
  },
): Promise<AdminStageGraph> {
  const tournamentId = await resolveTournamentId(slug);
  // Writes call sync explicitly; reads must stay cheap for Vercel.
  if (options?.skipChainRepair === false) {
    await syncStageChain(tournamentId);
  }
  const includeMatches = options?.includeMatches ?? false;
  const matchStageId =
    typeof includeMatches === "string" ? includeMatches : null;
  const loadAllMatches = includeMatches === true;

  const stages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: {
          slots: {
            orderBy: { slotIndex: "asc" },
            include: { team: { select: { name: true } } },
          },
        },
      },
      qualificationRules: { orderBy: { priority: "asc" } },
      seedingEntries: {
        orderBy: { seed: "asc" },
        include: { team: { select: { name: true } } },
      },
      bracket: {
        include: { _count: { select: { matches: true } } },
      },
    },
  });

  const matchesByStageId = new Map<string, MatchRow[]>();
  if (loadAllMatches || matchStageId) {
    const stageIds = matchStageId
      ? [matchStageId]
      : stages.map((s) => s.id);
    const brackets = await prisma.bracket.findMany({
      where: { stageId: { in: stageIds } },
      select: {
        stageId: true,
        matches: {
          orderBy: [{ roundNumber: "asc" }, { positionInRound: "asc" }],
          include: {
            participants: { orderBy: { slot: "asc" } },
            result: true,
            stageGroup: { select: { name: true } },
          },
        },
      },
    });
    for (const b of brackets) {
      if (!b.stageId) continue;
      matchesByStageId.set(b.stageId, b.matches.map(mapAdminMatch));
    }
  }

  const nodes: AdminStageNode[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    stageType: s.stageType,
    matchFormat: s.matchFormat,
    seedingMethod: s.seedingMethod,
    status: s.status,
    config: s.config,
    tieBreakRules: s.tieBreakRules,
    runnable: getStagePlugin(s.stageType).runnable,
    groups: s.groups.map((g) => ({
      id: g.id,
      name: g.name,
      order: g.order,
      targetSize: g.targetSize,
      slots: g.slots.map((slot) => ({
        id: slot.id,
        slotIndex: slot.slotIndex,
        teamId: slot.teamId,
        teamName: slot.team?.name ?? null,
        sourceStageId: slot.sourceStageId,
        sourceGroupId: slot.sourceGroupId,
        sourcePosition: slot.sourcePosition,
      })),
    })),
    rules: s.qualificationRules.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      priority: r.priority,
      selector: r.selector,
      destination: r.destination,
    })),
    seeding: s.seedingEntries.map((e) => ({
      teamId: e.teamId,
      teamName: e.team.name,
      seed: e.seed,
    })),
    matchCount: s.bracket?._count.matches ?? 0,
    matches: matchesByStageId.get(s.id) ?? [],
  }));

  const graphInput = toGraphInput(nodes);
  const validation = [
    ...validateStageGraph(graphInput),
    ...nodes.flatMap((n) =>
      getStagePlugin(n.stageType).validateConfig(
        graphInput.stages.find((s) => s.id === n.id)!,
        graphInput.stages,
      ),
    ),
  ];

  return { stages: nodes, validation };
}

export async function getStageMatchesAdmin(
  slug: string,
  stageId: string,
  opts?: { offset?: number; limit?: number },
): Promise<{
  matches: MatchRow[];
  matchCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}> {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
    select: { id: true },
  });
  if (!stage) throw new Error("Stage not found.");

  const offset = Math.max(0, Math.floor(opts?.offset ?? 0));
  const limit = Math.min(30, Math.max(1, Math.floor(opts?.limit ?? 30)));

  const bracket = await prisma.bracket.findUnique({
    where: { stageId },
    select: {
      _count: { select: { matches: true } },
      matches: {
        skip: offset,
        take: limit,
        orderBy: [{ roundNumber: "asc" }, { positionInRound: "asc" }],
        select: {
          id: true,
          roundNumber: true,
          positionInRound: true,
          bracketSide: true,
          status: true,
          stageGroupId: true,
          scheduledAt: true,
          scheduleStatus: true,
          confirmedBySlot0: true,
          confirmedBySlot1: true,
          resultDeadlineAt: true,
          participants: {
            orderBy: { slot: "asc" },
            select: {
              slot: true,
              tournamentTeamId: true,
              teamLabel: true,
            },
          },
          // Omit games JSON — large BO series payloads were timing out.
          result: {
            select: {
              winnerSlot: true,
              scoreSummary: true,
              scoreA: true,
              scoreB: true,
              screenshotUrl: true,
            },
          },
          stageGroup: { select: { name: true } },
        },
      },
    },
  });
  const matches = (bracket?.matches ?? []).map((m) =>
    mapAdminMatch({ ...m, result: m.result ? { ...m.result, games: null } : null }),
  );
  const matchCount = bracket?._count.matches ?? 0;
  return {
    matches,
    matchCount,
    offset,
    limit,
    hasMore: offset + matches.length < matchCount,
  };
}

function toGraphInput(nodes: AdminStageNode[]): StageGraphInput {
  return {
    stages: nodes.map(
      (n): StageInput => ({
        id: n.id,
        name: n.name,
        order: n.order,
        stageType: n.stageType,
        matchFormat: n.matchFormat,
        seedingMethod: n.seedingMethod,
        status: n.status,
        config: n.config,
        tieBreakRules: n.tieBreakRules,
        groups: n.groups.map((g) => ({
          id: g.id,
          name: g.name,
          order: g.order,
          targetSize: g.targetSize,
          slots: g.slots.map((s) => ({
            id: s.id,
            slotIndex: s.slotIndex,
            teamId: s.teamId,
            sourceStageId: s.sourceStageId,
            sourceGroupId: s.sourceGroupId,
            sourcePosition: s.sourcePosition,
          })),
        })),
        rules: n.rules.map((r) => ({
          id: r.id,
          groupId: r.groupId,
          priority: r.priority,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          selector: r.selector as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          destination: r.destination as any,
        })),
        seeding: n.seeding.map((s) => ({ teamId: s.teamId, seed: s.seed })),
      }),
    ),
  };
}

/** Replace the full stage graph for a tournament (builder save). */
export async function replaceStageGraph(
  slug: string,
  input: StageGraphInput,
): Promise<AdminStageGraph> {
  const tournamentId = await resolveTournamentId(slug);
  const issues = validateStageGraph(input);
  if (issues.length > 0) {
    const err = new Error("Stage graph validation failed.");
    (err as Error & { issues: ValidationIssue[] }).issues = issues;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    // Cascades remove groups/rules/slots/brackets
    await tx.tournamentStage.deleteMany({ where: { tournamentId } });

    for (const stage of input.stages) {
      const created = await tx.tournamentStage.create({
        data: {
          tournamentId,
          name: stage.name.trim(),
          order: stage.order,
          stageType: stage.stageType,
          matchFormat: stage.matchFormat ?? "BO1",
          seedingMethod: stage.seedingMethod ?? "MANUAL",
          status: stage.status ?? "DRAFT",
          config: stage.config as object | undefined,
          tieBreakRules: stage.tieBreakRules as object | undefined,
        },
      });

      const groupIdMap = new Map<string, string>();

      for (const group of stage.groups ?? []) {
        const g = await tx.tournamentStageGroup.create({
          data: {
            stageId: created.id,
            name: group.name.trim(),
            order: group.order,
            targetSize: group.targetSize ?? null,
          },
        });
        if (group.id) groupIdMap.set(group.id, g.id);

        for (const slot of group.slots ?? []) {
          await tx.stageGroupSlot.create({
            data: {
              groupId: g.id,
              slotIndex: slot.slotIndex,
              teamId: slot.teamId ?? null,
              sourceStageId: null, // remapped in second pass
              sourceGroupId: null,
              sourcePosition: slot.sourcePosition ?? null,
            },
          });
        }
      }

      for (const rule of stage.rules ?? []) {
        const mappedGroupId = rule.groupId
          ? (groupIdMap.get(rule.groupId) ?? rule.groupId)
          : null;
        await tx.stageQualificationRule.create({
          data: {
            stageId: created.id,
            groupId: mappedGroupId,
            priority: rule.priority ?? 0,
            selector: rule.selector as object,
            destination: rule.destination as object,
          },
        });
      }

      for (const seed of stage.seeding ?? []) {
        await tx.stageSeedingEntry.create({
          data: {
            stageId: created.id,
            teamId: seed.teamId,
            seed: seed.seed,
          },
        });
      }

      // stash temp id mapping on config for remapping destinations — handled below via order
      void created;
    }
  });

  // Second pass: remap destination stage/group ids and placeholder sources by order/name
  await remapDestinationIds(tournamentId, input);

  return getStageGraphAdmin(slug);
}

async function remapDestinationIds(
  tournamentId: string,
  input: StageGraphInput,
): Promise<void> {
  const stages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
    include: { groups: true, qualificationRules: true },
  });

  const stageByOrder = new Map(stages.map((s) => [s.order, s]));
  const inputByOrder = new Map(input.stages.map((s) => [s.order, s]));

  // Map old/temp stage ids → new ids via order
  const stageIdMap = new Map<string, string>();
  for (const s of input.stages) {
    if (!s.id) continue;
    const created = stageByOrder.get(s.order);
    if (created) stageIdMap.set(s.id, created.id);
  }

  const groupIdMap = new Map<string, string>();
  for (const s of input.stages) {
    const created = stageByOrder.get(s.order);
    if (!created) continue;
    for (const g of s.groups ?? []) {
      if (!g.id) continue;
      const cg = created.groups.find((x) => x.order === g.order);
      if (cg) groupIdMap.set(g.id, cg.id);
    }
  }

  for (const stage of stages) {
    for (const rule of stage.qualificationRules) {
      const dest = rule.destination as {
        kind?: string;
        stageId?: string;
        groupId?: string;
      };
      if (dest?.kind === "STAGE") {
        const newStageId = dest.stageId
          ? (stageIdMap.get(dest.stageId) ?? dest.stageId)
          : dest.stageId;
        if (newStageId !== dest.stageId) {
          await prisma.stageQualificationRule.update({
            where: { id: rule.id },
            data: { destination: { kind: "STAGE", stageId: newStageId } },
          });
        }
        continue;
      }
      if (dest?.kind !== "STAGE_GROUP") continue;
      const newStageId = dest.stageId ? stageIdMap.get(dest.stageId) ?? dest.stageId : dest.stageId;
      const newGroupId = dest.groupId ? groupIdMap.get(dest.groupId) ?? dest.groupId : dest.groupId;
      if (newStageId !== dest.stageId || newGroupId !== dest.groupId) {
        await prisma.stageQualificationRule.update({
          where: { id: rule.id },
          data: {
            destination: { kind: "STAGE_GROUP", stageId: newStageId, groupId: newGroupId },
          },
        });
      }
    }

    const inputStage = inputByOrder.get(stage.order);
    if (!inputStage) continue;
    for (const g of inputStage.groups ?? []) {
      const createdGroup = stage.groups.find((x) => x.order === g.order);
      if (!createdGroup) continue;
      for (const slot of g.slots ?? []) {
        if (!slot.sourceStageId && !slot.sourceGroupId) continue;
        await prisma.stageGroupSlot.updateMany({
          where: { groupId: createdGroup.id, slotIndex: slot.slotIndex },
          data: {
            sourceStageId: slot.sourceStageId
              ? (stageIdMap.get(slot.sourceStageId) ?? slot.sourceStageId)
              : null,
            sourceGroupId: slot.sourceGroupId
              ? (groupIdMap.get(slot.sourceGroupId) ?? slot.sourceGroupId)
              : null,
            sourcePosition: slot.sourcePosition ?? null,
          },
        });
      }
    }
  }
}

export async function createStage(
  slug: string,
  input: {
    name: string;
    stageType: StageType;
    matchFormat?: StageMatchFormat;
    seedingMethod?: SeedingMethod;
  },
): Promise<AdminStageGraph> {
  const tournamentId = await resolveTournamentId(slug);
  const max = await prisma.tournamentStage.aggregate({
    where: { tournamentId },
    _max: { order: true },
  });
  const order = (max._max.order ?? 0) + 1;
  const isBracket =
    input.stageType === "SINGLE_ELIMINATION" ||
    input.stageType === "DOUBLE_ELIMINATION";
  const seedSource = order > 1 ? "PREVIOUS_STAGE" : "TEAMS";
  const previous =
    order > 1
      ? await prisma.tournamentStage.findFirst({
          where: { tournamentId, order: order - 1 },
          select: { id: true },
        })
      : null;
  const config: Record<string, unknown> = {
    seedSource,
    ...(previous ? { feederStageIds: [previous.id] } : {}),
    ...(isBracket ? { finalsMatchFormat: "BO5" as const } : {}),
  };

  const created = await prisma.tournamentStage.create({
    data: {
      tournamentId,
      name: input.name.trim() || `Stage ${order}`,
      order,
      stageType: input.stageType,
      matchFormat: input.matchFormat ?? (isBracket ? "BO3" : "BO1"),
      seedingMethod: input.seedingMethod ?? "MANUAL",
      status: "DRAFT",
      config: config as object,
      groups:
        input.stageType === "ROUND_ROBIN" ||
        input.stageType === "SWISS" ||
        input.stageType === "GSL" ||
        input.stageType === "LEAGUE"
          ? { create: [{ name: "Pool A", order: 1, targetSize: 4 }] }
          : undefined,
    },
  });

  // Link previous stage → this one with a default Top-2 rule when missing.
  if (order > 1) {
    const previousFull = await prisma.tournamentStage.findFirst({
      where: { tournamentId, order: order - 1 },
      include: {
        groups: { orderBy: { order: "asc" } },
        qualificationRules: true,
      },
    });
    if (previousFull) {
      const alreadyLinked = previousFull.qualificationRules.some((r) =>
        ruleTargetsStage(r.destination, created.id),
      );
      if (!alreadyLinked) {
        const destination = { kind: "STAGE", stageId: created.id };
        if (previousFull.groups.length > 0) {
          await prisma.stageQualificationRule.createMany({
            data: previousFull.groups.map((g, i) => ({
              stageId: previousFull.id,
              groupId: g.id,
              priority: i,
              selector: { kind: "TOP_N", n: 2 },
              destination,
            })),
          });
        } else {
          await prisma.stageQualificationRule.create({
            data: {
              stageId: previousFull.id,
              groupId: null,
              priority: 0,
              selector: { kind: "TOP_N", n: 2 },
              destination,
            },
          });
        }
      }
    }
  }

  return getStageGraphAdmin(slug);
}

export async function updateStage(
  slug: string,
  stageId: string,
  data: Partial<{
    name: string;
    order: number;
    stageType: StageType;
    matchFormat: StageMatchFormat;
    seedingMethod: SeedingMethod;
    status: StageStatus;
    config: unknown;
    tieBreakRules: unknown;
    seedSource: StageSeedSource;
    feederStageIds: string[] | null;
    finalsMatchFormat: "BO1" | "BO3" | "BO5" | null;
    finishesAt: string | null;
    resultWindowHours: number | null;
  }>,
): Promise<AdminStageGraph> {
  const tournamentId = await resolveTournamentId(slug);
  const existing = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
  });
  if (!existing) throw new Error("Stage not found.");

  const hasConfigPatch =
    data.seedSource !== undefined ||
    data.feederStageIds !== undefined ||
    data.finalsMatchFormat !== undefined ||
    data.finishesAt !== undefined ||
    data.resultWindowHours !== undefined;

  let nextConfig: unknown = data.config;
  if (hasConfigPatch) {
    nextConfig = mergeStageConfig(existing.config, {
      seedSource: data.seedSource,
      feederStageIds: data.feederStageIds,
      finalsMatchFormat: data.finalsMatchFormat,
      finishesAt: data.finishesAt,
      resultWindowHours: data.resultWindowHours,
    });
  }

  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: {
      name: data.name?.trim(),
      order: data.order,
      stageType: data.stageType,
      matchFormat: data.matchFormat,
      seedingMethod: data.seedingMethod,
      status: data.status,
      ...(nextConfig !== undefined
        ? { config: nextConfig as object }
        : {}),
      tieBreakRules: data.tieBreakRules as object | undefined,
    },
  });
  return getStageGraphAdmin(slug);
}

export async function deleteStage(slug: string, stageId: string): Promise<AdminStageGraph> {
  const tournamentId = await resolveTournamentId(slug);
  await prisma.tournamentStage.deleteMany({ where: { id: stageId, tournamentId } });
  return getStageGraphAdmin(slug);
}

export async function putStageGroups(
  slug: string,
  stageId: string,
  groups: {
    id?: string;
    name: string;
    order: number;
    targetSize?: number | null;
    slots?: {
      slotIndex: number;
      teamId?: string | null;
      sourceStageId?: string | null;
      sourceGroupId?: string | null;
      sourcePosition?: number | null;
    }[];
  }[],
  opts?: { skipGraph?: boolean },
): Promise<AdminStageGraph | null> {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
  });
  if (!stage) throw new Error("Stage not found.");

  const priorGroups = await prisma.tournamentStageGroup.findMany({
    where: { stageId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const priorRules = await prisma.stageQualificationRule.findMany({
    where: { stageId },
    orderBy: { priority: "asc" },
  });
  const oldIdToOrder = new Map(priorGroups.map((g) => [g.id, g.order]));

  await prisma.$transaction(
    async (tx) => {
      // Detach rules first so group delete does not cascade-wipe them.
      await tx.stageQualificationRule.deleteMany({ where: { stageId } });
      await tx.tournamentStageGroup.deleteMany({ where: { stageId } });

      const orderToNewId = new Map<number, string>();
      const slotRows: {
        groupId: string;
        slotIndex: number;
        teamId: string | null;
        sourceStageId: string | null;
        sourceGroupId: string | null;
        sourcePosition: number | null;
      }[] = [];

      for (const g of groups) {
        const created = await tx.tournamentStageGroup.create({
          data: {
            stageId,
            name: g.name.trim(),
            order: g.order,
            targetSize: g.targetSize ?? null,
          },
        });
        orderToNewId.set(g.order, created.id);
        for (const slot of g.slots ?? []) {
          slotRows.push({
            groupId: created.id,
            slotIndex: slot.slotIndex,
            teamId: slot.teamId ?? null,
            sourceStageId: slot.sourceStageId ?? null,
            sourceGroupId: slot.sourceGroupId ?? null,
            sourcePosition: slot.sourcePosition ?? null,
          });
        }
      }

      if (slotRows.length > 0) {
        await tx.stageGroupSlot.createMany({ data: slotRows });
      }

      if (priorRules.length > 0) {
        await tx.stageQualificationRule.createMany({
          data: priorRules.map((r) => {
            let groupId: string | null = null;
            if (r.groupId) {
              const order = oldIdToOrder.get(r.groupId);
              groupId = order != null ? (orderToNewId.get(order) ?? null) : null;
            }
            return {
              stageId,
              groupId,
              priority: r.priority,
              selector: r.selector as object,
              destination: r.destination as object,
            };
          }),
        });
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (opts?.skipGraph) return null;
  return getStageGraphAdmin(slug);
}

/** Update pool slot teams without recreating groups (keeps rule groupIds stable). */
export async function putStagePoolAssignments(
  slug: string,
  stageId: string,
  pools: { order: number; teamIds: string[] }[],
  opts?: { skipGraph?: boolean },
): Promise<AdminStageGraph | null> {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
    include: { groups: { orderBy: { order: "asc" }, include: { slots: true } } },
  });
  if (!stage) throw new Error("Stage not found.");

  await prisma.$transaction(
    async (tx) => {
      const slotRows: {
        groupId: string;
        slotIndex: number;
        teamId: string | null;
      }[] = [];

      for (const pool of pools) {
        const group = stage.groups.find((g) => g.order === pool.order);
        if (!group) continue;
        await tx.stageGroupSlot.deleteMany({ where: { groupId: group.id } });
        const size = Math.max(pool.teamIds.length, group.targetSize ?? 0, 2);
        await tx.tournamentStageGroup.update({
          where: { id: group.id },
          data: { targetSize: size },
        });
        for (let si = 0; si < size; si++) {
          slotRows.push({
            groupId: group.id,
            slotIndex: si,
            teamId: pool.teamIds[si] ?? null,
          });
        }
      }

      if (slotRows.length > 0) {
        await tx.stageGroupSlot.createMany({ data: slotRows });
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (opts?.skipGraph) return null;
  return getStageGraphAdmin(slug);
}

export async function putStageRules(
  slug: string,
  stageId: string,
  rules: {
    groupId?: string | null;
    priority?: number;
    selector: unknown;
    destination: unknown;
  }[],
  opts?: { skipGraph?: boolean },
): Promise<AdminStageGraph | null> {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
  });
  if (!stage) throw new Error("Stage not found.");

  await prisma.$transaction(
    async (tx) => {
      await tx.stageQualificationRule.deleteMany({ where: { stageId } });
      if (rules.length > 0) {
        await tx.stageQualificationRule.createMany({
          data: rules.map((r, i) => ({
            stageId,
            groupId: r.groupId ?? null,
            priority: i,
            selector: r.selector as object,
            destination: r.destination as object,
          })),
        });
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (opts?.skipGraph) return null;
  return getStageGraphAdmin(slug);
}

export async function putStageSeeding(
  slug: string,
  stageId: string,
  seeding: { teamId: string; seed: number }[],
  options?: {
    method?: "MANUAL" | "RANDOM";
    redistribute?: boolean;
    skipGraph?: boolean;
  },
): Promise<AdminStageGraph | null> {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
    include: { groups: { orderBy: { order: "asc" }, include: { slots: true } } },
  });
  if (!stage) throw new Error("Stage not found.");

  const method = options?.method ?? (stage.seedingMethod === "RANDOM" ? "RANDOM" : "MANUAL");
  const redistribute = options?.redistribute ?? true;
  let ordered = [...seeding].sort((a, b) => a.seed - b.seed);
  if (method === "RANDOM") {
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j]!, ordered[i]!];
    }
    ordered = ordered.map((s, i) => ({ ...s, seed: i + 1 }));
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.stageSeedingEntry.deleteMany({ where: { stageId } });
      if (ordered.length > 0) {
        await tx.stageSeedingEntry.createMany({
          data: ordered.map((s) => ({
            stageId,
            teamId: s.teamId,
            seed: s.seed,
          })),
        });
      }

      // Redistribute into pools when groups exist (skip when caller already set slots)
      if (redistribute && stage.groups.length > 0) {
        const teamIds = ordered.map((s) => s.teamId);
        const buckets = chunkEvenly(teamIds, stage.groups.length);
        const slotRows: {
          groupId: string;
          slotIndex: number;
          teamId: string | null;
        }[] = [];

        for (let gi = 0; gi < stage.groups.length; gi++) {
          const group = stage.groups[gi]!;
          const bucket = buckets[gi] ?? [];
          await tx.stageGroupSlot.deleteMany({ where: { groupId: group.id } });
          const targetSize = Math.max(bucket.length, group.targetSize ?? 0, 2);
          await tx.tournamentStageGroup.update({
            where: { id: group.id },
            data: { targetSize },
          });
          for (let si = 0; si < targetSize; si++) {
            slotRows.push({
              groupId: group.id,
              slotIndex: si,
              teamId: bucket[si] ?? null,
            });
          }
        }

        if (slotRows.length > 0) {
          await tx.stageGroupSlot.createMany({ data: slotRows });
        }
      }

      await tx.tournamentStage.update({
        where: { id: stageId },
        data: { seedingMethod: method, status: "READY" },
      });
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (options?.skipGraph) return null;
  return getStageGraphAdmin(slug);
}

function chunkEvenly(ids: string[], chunks: number): string[][] {
  const n = Math.max(1, chunks);
  const result: string[][] = Array.from({ length: n }, () => []);
  ids.forEach((id, i) => {
    result[i % n]!.push(id);
  });
  return result;
}

async function assertStageInTournament(slug: string, stageId: string) {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
  });
  if (!stage) throw new Error("Stage not found.");
  return { tournamentId, stage };
}

/** Full generate in one process (sync / internal). Prefer chunked phases from the UI. */
export async function generateStageMatches(slug: string, stageId: string) {
  await assertStageInTournament(slug, stageId);
  return generateMatchesForStage(stageId);
}

export async function prepareStageMatchGeneration(
  slug: string,
  stageId: string,
) {
  await assertStageInTournament(slug, stageId);
  return prepareMatchGeneration(stageId);
}

export async function insertStageMatchGenerationBatch(
  slug: string,
  stageId: string,
  cursor: number,
) {
  await assertStageInTournament(slug, stageId);
  return insertMatchGenerationBatch(stageId, cursor);
}

export async function finalizeStageMatchGeneration(
  slug: string,
  stageId: string,
) {
  await assertStageInTournament(slug, stageId);
  return finalizeMatchGeneration(stageId);
}

/**
 * Shuffle seed order and prepare an empty bracket — client continues with
 * insert/finalize batches (same path as Generate Matches).
 */
export async function reshuffleStageBracket(slug: string, stageId: string) {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
    include: {
      seedingEntries: { orderBy: { seed: "asc" } },
      bracket: {
        include: {
          matches: { include: { result: true } },
        },
      },
    },
  });
  if (!stage) throw new Error("Stage not found.");

  const hasResults = (stage.bracket?.matches ?? []).some((m) => m.result != null);
  if (hasResults) {
    throw new Error(
      "Cannot reshuffle after results are recorded. Clear results first, or regenerate from a fresh stage.",
    );
  }

  let teamIds = stage.seedingEntries.map((e) => e.teamId);
  if (teamIds.length === 0) {
    const slots = await prisma.stageGroupSlot.findMany({
      where: { group: { stageId }, teamId: { not: null } },
      select: { teamId: true },
    });
    teamIds = [...new Set(slots.map((s) => s.teamId!).filter(Boolean))];
  }
  if (teamIds.length < 2) {
    throw new Error("Need at least 2 seeded teams to reshuffle the bracket.");
  }

  for (let i = teamIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teamIds[i], teamIds[j]] = [teamIds[j]!, teamIds[i]!];
  }

  await putStageSeeding(
    slug,
    stageId,
    teamIds.map((id, i) => ({ teamId: id, seed: i + 1 })),
    { method: "MANUAL", redistribute: false, skipGraph: true },
  );

  return prepareMatchGeneration(stageId);
}

export async function advanceStageAdmin(slug: string, stageId: string) {
  const tournamentId = await resolveTournamentId(slug);
  const stage = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
  });
  if (!stage) throw new Error("Stage not found.");
  const result = await applyStageMovement(stageId);
  return result;
}

export type StageSeedSource = "TEAMS" | "PREVIOUS_STAGE";

export type StageCommitDraft = {
  id: string;
  name: string;
  stageType: StageType;
  matchFormat: StageMatchFormat;
  seedingMethod: "MANUAL" | "RANDOM";
  seedSource: StageSeedSource;
  /** Earlier stage ids that feed this stage when seedSource is PREVIOUS_STAGE. */
  feederStageIds?: string[];
  /** SE/DE only — format for the final (and grand final). */
  finalsMatchFormat?: "BO1" | "BO3" | "BO5" | null;
  finishesAt?: string | null;
  resultWindowHours?: number | null;
  groups: {
    id?: string;
    name: string;
    order: number;
    targetSize?: number | null;
    slots: {
      slotIndex: number;
      teamId?: string | null;
      sourceStageId?: string | null;
      sourceGroupId?: string | null;
      sourcePosition?: number | null;
    }[];
  }[];
  rules: {
    groupId?: string | null;
    priority?: number;
    selector: unknown;
    destination: unknown;
  }[];
};

function mergeStageConfig(
  existing: unknown,
  patch: {
    seedSource?: StageSeedSource;
    feederStageIds?: string[] | null;
    finalsMatchFormat?: "BO1" | "BO3" | "BO5" | null;
    finishesAt?: string | null;
    resultWindowHours?: number | null;
  },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (patch.seedSource) base.seedSource = patch.seedSource;
  if (patch.feederStageIds !== undefined) {
    if (patch.feederStageIds === null || patch.feederStageIds.length === 0) {
      delete base.feederStageIds;
    } else {
      base.feederStageIds = [...new Set(patch.feederStageIds.filter(Boolean))];
    }
  }
  if (patch.finalsMatchFormat === null) {
    delete base.finalsMatchFormat;
  } else if (patch.finalsMatchFormat) {
    base.finalsMatchFormat = patch.finalsMatchFormat;
  }
  if (patch.finishesAt === null) delete base.finishesAt;
  else if (typeof patch.finishesAt === "string") base.finishesAt = patch.finishesAt;
  if (patch.resultWindowHours === null) delete base.resultWindowHours;
  else if (
    typeof patch.resultWindowHours === "number" &&
    Number.isFinite(patch.resultWindowHours) &&
    patch.resultWindowHours > 0
  ) {
    base.resultWindowHours = patch.resultWindowHours;
  }
  return base;
}

function readFeederStageIdsFromConfig(config: unknown): string[] {
  if (!config || typeof config !== "object" || !("feederStageIds" in config)) {
    return [];
  }
  const v = (config as { feederStageIds?: unknown }).feederStageIds;
  if (!Array.isArray(v)) return [];
  return v.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function clearStageRoster(stageId: string): Promise<void> {
  const groups = await prisma.tournamentStageGroup.findMany({
    where: { stageId },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);
  await prisma.$transaction(
    async (tx) => {
      await tx.stageSeedingEntry.deleteMany({ where: { stageId } });
      if (groupIds.length > 0) {
        await tx.stageGroupSlot.updateMany({
          where: { groupId: { in: groupIds } },
          data: {
            teamId: null,
            eliminated: false,
            sourceStageId: null,
            sourceGroupId: null,
            sourcePosition: null,
          },
        });
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

async function stageHasRecordedResults(stageId: string): Promise<boolean> {
  const hit = await prisma.matchResult.findFirst({
    where: { match: { bracket: { stageId } } },
    select: { id: true },
  });
  return hit != null;
}

function readSeedSourceFromConfig(
  config: unknown,
  order: number,
): StageSeedSource {
  if (config && typeof config === "object" && "seedSource" in config) {
    const v = (config as { seedSource?: string }).seedSource;
    if (v === "PREVIOUS_STAGE" || v === "TEAMS") return v;
  }
  return order > 1 ? "PREVIOUS_STAGE" : "TEAMS";
}

/** Persist buffered drafts. Optionally rebuild groups only for one stage. */
async function persistStageDrafts(
  slug: string,
  tournamentId: string,
  drafts: StageCommitDraft[],
  options?: { rebuildGroupsForStageId?: string },
): Promise<void> {
  const allStages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  // Only touch the stage we're generating (or all drafts during full sync).
  const targetId = options?.rebuildGroupsForStageId;
  const draftsToWrite = targetId
    ? drafts.filter((d) => d.id === targetId)
    : drafts;

  for (const draft of draftsToWrite) {
    const stage = await prisma.tournamentStage.findFirst({
      where: { id: draft.id, tournamentId },
    });
    if (!stage) continue;

    await prisma.tournamentStage.update({
      where: { id: draft.id },
      data: {
        name: draft.name.trim(),
        stageType: draft.stageType,
        matchFormat: draft.matchFormat,
        seedingMethod: draft.seedingMethod,
        config: mergeStageConfig(stage.config, {
          seedSource: draft.seedSource,
          feederStageIds: draft.feederStageIds ?? null,
          finalsMatchFormat:
            draft.stageType === "SINGLE_ELIMINATION" ||
            draft.stageType === "DOUBLE_ELIMINATION"
              ? (draft.finalsMatchFormat ?? "BO5")
              : null,
          finishesAt: draft.finishesAt,
          resultWindowHours: draft.resultWindowHours,
        }) as object,
      },
    });

    const ruleGroupIdToOrder = new Map<string, number>();
    for (const g of draft.groups) {
      if (g.id) ruleGroupIdToOrder.set(g.id, g.order);
    }

    if (options?.rebuildGroupsForStageId === draft.id) {
      await putStageGroups(slug, draft.id, draft.groups, { skipGraph: true });
    }

    const liveGroups = await prisma.tournamentStageGroup.findMany({
      where: { stageId: draft.id },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    const orderToLiveId = new Map(liveGroups.map((g) => [g.order, g.id]));

    const remappedRules = draft.rules.map((r) => {
      let groupId = r.groupId;
      if (groupId) {
        const order = ruleGroupIdToOrder.get(groupId);
        groupId = order != null ? (orderToLiveId.get(order) ?? null) : null;
      }
      return {
        ...r,
        groupId,
        destination: remapRuleDestination(
          r.destination,
          allStages,
          stage.order,
        ),
      };
    });

    await putStageRules(slug, draft.id, remappedRules, { skipGraph: true });
  }
}

async function seedStageFromFeeders(
  slug: string,
  stageId: string,
  draft: StageCommitDraft | undefined,
  precomputed?: Map<string, QualificationPlacement[]>,
): Promise<{
  moved: number;
  teamIds: string[];
  byFeeder: { stageId: string; stageName: string; count: number }[];
}> {
  const stage = await prisma.tournamentStage.findFirstOrThrow({
    where: { id: stageId },
    select: { id: true, tournamentId: true, order: true, config: true },
  });

  const earlier = await prisma.tournamentStage.findMany({
    where: { tournamentId: stage.tournamentId, order: { lt: stage.order } },
    orderBy: { order: "asc" },
    include: { qualificationRules: true },
  });

  const allowedFeeders =
    draft?.feederStageIds?.length
      ? new Set(draft.feederStageIds)
      : (() => {
          const fromConfig = readFeederStageIdsFromConfig(stage.config);
          return fromConfig.length > 0 ? new Set(fromConfig) : null;
        })();

  const hasFeeder = earlier.some(
    (s) =>
      (!allowedFeeders || allowedFeeders.has(s.id)) &&
      s.qualificationRules.some((r) => ruleTargetsStage(r.destination, stageId)),
  );

  if (!hasFeeder) {
    const previous = earlier[earlier.length - 1];
    if (!previous) {
      throw new Error(
        "No earlier stage exists. Seed from Teams or add an earlier stage.",
      );
    }
    // Only auto-create a feeder when the previous stage has no rules yet.
    if (
      previous.qualificationRules.length === 0 &&
      (!allowedFeeders || allowedFeeders.has(previous.id))
    ) {
      await ensureFeederRules(previous.id, stageId);
      const refreshed = await prisma.tournamentStage.findUnique({
        where: { id: previous.id },
        include: { qualificationRules: true },
      });
      if (refreshed) {
        const idx = earlier.findIndex((s) => s.id === previous.id);
        if (idx >= 0) earlier[idx] = refreshed;
      }
    }
  }

  // Collect qualifier IDs only — no per-team slot writes (that hung Sync).
  const teamIds: string[] = [];
  const seen = new Set<string>();
  const byFeeder: { stageId: string; stageName: string; count: number }[] = [];
  const feederSeen = new Set<string>();

  for (const feeder of earlier) {
    if (feederSeen.has(feeder.id)) continue;
    feederSeen.add(feeder.id);
    if (allowedFeeders && !allowedFeeders.has(feeder.id)) continue;

    const feedsHere = feeder.qualificationRules.some((r) =>
      ruleTargetsStage(r.destination, stageId),
    );
    if (!feedsHere) continue;

    let placements = precomputed?.get(feeder.id);
    if (!placements) {
      placements = await evaluateStageQualification(feeder.id);
      precomputed?.set(feeder.id, placements);
    }

    let count = 0;
    for (const p of placements) {
      const dest = p.destination;
      const toHere =
        (dest.kind === "STAGE" && dest.stageId === stageId) ||
        (dest.kind === "STAGE_GROUP" && dest.stageId === stageId);
      if (!toHere || seen.has(p.teamId)) continue;
      seen.add(p.teamId);
      teamIds.push(p.teamId);
      count += 1;
    }
    byFeeder.push({
      stageId: feeder.id,
      stageName: feeder.name,
      count,
    });
  }

  if (teamIds.length === 0) {
    throw new Error(
      "No teams qualified into this stage. Check feeder stages on Settings, set Top/Bottom/Position rules on those stages to send teams here, finish those matches, then try again.",
    );
  }

  await clearStageRoster(stageId);

  const method = draft?.seedingMethod ?? "MANUAL";
  const allowed = new Set(teamIds);
  const draftAssigned =
    draft?.groups.flatMap((g) =>
      g.slots.map((s) => s.teamId).filter((id): id is string => Boolean(id)),
    ) ?? [];
  const ordered: string[] = [];
  const orderedSeen = new Set<string>();
  for (const id of draftAssigned) {
    if (!allowed.has(id) || orderedSeen.has(id)) continue;
    orderedSeen.add(id);
    ordered.push(id);
  }
  for (const id of teamIds) {
    if (orderedSeen.has(id)) continue;
    orderedSeen.add(id);
    ordered.push(id);
  }

  const draftCoversAll =
    ordered.length === teamIds.length &&
    draftAssigned.length > 0 &&
    draftAssigned.every((id) => allowed.has(id)) &&
    new Set(draftAssigned.filter((id) => allowed.has(id))).size ===
      teamIds.length;

  await putStageSeeding(
    slug,
    stageId,
    ordered.map((id, i) => ({ teamId: id, seed: i + 1 })),
    { method, redistribute: !draftCoversAll },
  );

  if (draftCoversAll && draft && draft.groups.length > 0) {
    await putStagePoolAssignments(
      slug,
      stageId,
      draft.groups.map((g) => ({
        order: g.order,
        teamIds: g.slots
          .map((s) => s.teamId)
          .filter((id): id is string => Boolean(id) && allowed.has(id!)),
      })),
    );
  }

  return { moved: ordered.length, teamIds: ordered, byFeeder };
}

/**
 * Persist buffered stage drafts and seed the target stage (no match insert).
 * Client should call prepare → insert → finalize separately to avoid timeouts.
 */
export async function commitStageDraftsForGenerate(
  slug: string,
  stageId: string,
  drafts: StageCommitDraft[],
): Promise<{ moved: number }> {
  const tournamentId = await resolveTournamentId(slug);
  const target = await prisma.tournamentStage.findFirst({
    where: { id: stageId, tournamentId },
  });
  if (!target) throw new Error("Stage not found.");

  await persistStageDrafts(slug, tournamentId, drafts, {
    rebuildGroupsForStageId: stageId,
  });

  const targetDraft = drafts.find((d) => d.id === stageId);
  const seedSource = targetDraft?.seedSource ?? "TEAMS";
  let moved = 0;

  if (seedSource === "PREVIOUS_STAGE") {
    const result = await seedStageFromFeeders(slug, stageId, targetDraft);
    moved = result.moved;
  } else {
    const allTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (allTeams.length === 0) {
      throw new Error("No teams in this cup to seed from.");
    }
    const method = targetDraft?.seedingMethod ?? "MANUAL";
    const teamIds = allTeams.map((t) => t.id);
    const assigned =
      targetDraft?.groups.flatMap((g) =>
        g.slots.map((s) => s.teamId).filter((id): id is string => Boolean(id)),
      ) ?? [];
    const allowed = new Set(teamIds);
    const draftCoversAll =
      assigned.length > 0 &&
      assigned.every((id) => allowed.has(id)) &&
      new Set(assigned).size === teamIds.length;

    if (draftCoversAll && targetDraft) {
      await putStageSeeding(
        slug,
        stageId,
        [...new Set(assigned)].map((id, i) => ({ teamId: id, seed: i + 1 })),
        { method, redistribute: false, skipGraph: true },
      );
      await putStagePoolAssignments(
        slug,
        stageId,
        targetDraft.groups.map((g) => ({
          order: g.order,
          teamIds: g.slots
            .map((s) => s.teamId)
            .filter((id): id is string => Boolean(id)),
        })),
        { skipGraph: true },
      );
    } else {
      await putStageSeeding(
        slug,
        stageId,
        teamIds.map((id, i) => ({ teamId: id, seed: i + 1 })),
        { method, skipGraph: true },
      );
    }
  }

  return { moved };
}

/**
 * Persist buffered stage drafts, seed the target stage, then prepare an empty
 * bracket. Client continues with insert/finalize batches.
 * Seed from PREVIOUS_STAGE runs qualification from ALL earlier stages that
 * point here (not only the immediate previous stage).
 */
export async function commitStageAndGenerate(
  slug: string,
  stageId: string,
  drafts: StageCommitDraft[],
): Promise<{
  jobId: string;
  bracketId: string;
  total: number;
  cursor: number;
  complete: false;
  moved: number;
}> {
  const { moved } = await commitStageDraftsForGenerate(slug, stageId, drafts);
  const prepared = await prepareMatchGeneration(stageId);
  return { ...prepared, moved };
}

/**
 * Save all drafts, then re-seed every linked stage (Stage 1 → 2 → 3 …)
 * and regenerate brackets that do not have results yet.
 */
export async function syncAllStages(
  slug: string,
  drafts: StageCommitDraft[],
): Promise<{
  graph: AdminStageGraph;
  synced: {
    stageId: string;
    name: string;
    moved: number;
    teamCount: number;
    regenerated: boolean;
    skippedResults: boolean;
    byFeeder: { stageName: string; count: number }[];
  }[];
}> {
  const tournamentId = await resolveTournamentId(slug);
  await persistStageDrafts(slug, tournamentId, drafts);

  const stages = await prisma.tournamentStage.findMany({
    where: { tournamentId },
    orderBy: { order: "asc" },
  });

  // Evaluate each feeder stage once (standings from match results — safe before reseeding).
  const quals = new Map<string, QualificationPlacement[]>();
  const maxOrder = stages[stages.length - 1]?.order ?? 0;
  await Promise.all(
    stages
      .filter((s) => s.order < maxOrder)
      .map(async (s) => {
        quals.set(s.id, await evaluateStageQualification(s.id));
      }),
  );

  const synced: {
    stageId: string;
    name: string;
    moved: number;
    teamCount: number;
    regenerated: boolean;
    skippedResults: boolean;
    byFeeder: { stageName: string; count: number }[];
  }[] = [];

  for (const stage of stages) {
    const draft = drafts.find((d) => d.id === stage.id);
    const seedSource =
      draft?.seedSource ?? readSeedSourceFromConfig(stage.config, stage.order);

    if (seedSource !== "PREVIOUS_STAGE") continue;

    try {
      const result = await seedStageFromFeeders(slug, stage.id, draft, quals);
      const hasResults = await stageHasRecordedResults(stage.id);
      let regenerated = false;
      if (!hasResults && result.teamIds.length >= 2) {
        await generateMatchesForStage(stage.id);
        regenerated = true;
      }
      synced.push({
        stageId: stage.id,
        name: stage.name,
        moved: result.moved,
        teamCount: result.teamIds.length,
        regenerated,
        skippedResults: hasResults,
        byFeeder: result.byFeeder.map((f) => ({
          stageName: f.stageName,
          count: f.count,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      synced.push({
        stageId: stage.id,
        name: stage.name,
        moved: 0,
        teamCount: 0,
        regenerated: false,
        skippedResults: false,
        byFeeder: [{ stageName: message.slice(0, 120), count: 0 }],
      });
    }
  }

  const graph = await getStageGraphAdmin(slug, { skipChainRepair: true });
  return { graph, synced };
}

