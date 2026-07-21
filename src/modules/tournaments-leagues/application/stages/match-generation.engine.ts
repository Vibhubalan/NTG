import { BracketType, MatchStatus, ParticipantType, type StageType } from "@prisma/client";
import { prisma } from "@core/database/client";
import { getStagePlugin } from "./stage-registry";
import { resolveStageSeeding, snakeDistribute } from "./seeding.engine";
import type { StageGenerateContext } from "@tournaments-leagues/domain/stages/types";

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

export async function generateMatchesForStage(stageId: string): Promise<{ matchCount: number }> {
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

  const plugin = getStagePlugin(stage.stageType);
  if (!plugin.runnable) {
    throw new Error(`${stage.stageType} cannot generate matches yet.`);
  }

  const seeded = await resolveStageSeeding({
    tournamentId: stage.tournamentId,
    stageId: stage.id,
    method: stage.seedingMethod,
  });

  // Fill / redistribute group slots from seeding.
  // Redistribute when any pool is empty while teams exist (common after adding a new pool).
  if (stage.groups.length > 0 && seeded.length > 0) {
    const filledCounts = stage.groups.map(
      (g) => g.slots.filter((s) => s.teamId).length,
    );
    const someEmpty = filledCounts.some((c) => c === 0);
    const someFilled = filledCounts.some((c) => c > 0);
    const noneFilled = filledCounts.every((c) => c === 0);
    const shouldDistribute = noneFilled || (someEmpty && someFilled);

    if (shouldDistribute) {
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

      const refreshed = await prisma.tournamentStageGroup.findMany({
        where: { stageId },
        orderBy: { order: "asc" },
        include: {
          slots: { orderBy: { slotIndex: "asc" }, include: { team: true } },
        },
      });
      stage.groups = refreshed;
    }
  }

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
          names.set(s.teamId!, s.team?.name ?? teamNames.get(s.teamId!) ?? "Team");
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

  const generated = plugin.generateMatches(ctx);

  // Replace existing stage bracket
  if (stage.bracket) {
    await prisma.match.deleteMany({ where: { bracketId: stage.bracket.id } });
    await prisma.bracket.delete({ where: { id: stage.bracket.id } });
  }

  // Regenerating brackets means the cup is no longer decided — drop stale champion.
  await prisma.tournamentPlacement.deleteMany({
    where: { tournamentId: stage.tournamentId, role: "CHAMPION" },
  });

  const totalRounds =
    generated.reduce((max, m) => Math.max(max, m.roundNumber), 0) || 1;

  const bracket = await prisma.bracket.create({
    data: {
      stageId: stage.id,
      tournamentId: null,
      type: stageTypeToBracketType(stage.stageType),
      totalRounds,
    },
  });

  const keyToId = new Map<string, string>();

  // Create matches in parallel batches — sequential creates time out on Vercel/Neon.
  const CREATE_BATCH = 20;
  for (let i = 0; i < generated.length; i += CREATE_BATCH) {
    const chunk = generated.slice(i, i + CREATE_BATCH);
    const created = await Promise.all(
      chunk.map((m) =>
        prisma.match.create({
          data: {
            bracketId: bracket.id,
            stageGroupId: m.stageGroupId ?? null,
            roundNumber: m.roundNumber,
            positionInRound: m.positionInRound,
            bracketSide: m.bracketSide ?? null,
            status: m.status === "BYE" ? MatchStatus.BYE : MatchStatus.SCHEDULED,
            participants: {
              create: m.participants.map((p) => ({
                slot: p.slot,
                participantType: ParticipantType.TEAM,
                tournamentTeamId: p.tournamentTeamId ?? null,
                teamLabel: p.teamLabel ?? null,
                seed: p.seed ?? null,
              })),
            },
          },
        }),
      ),
    );
    for (let j = 0; j < chunk.length; j++) {
      keyToId.set(chunk[j]!.key, created[j]!.id);
    }
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

  for (let i = 0; i < linkUpdates.length; i += CREATE_BATCH) {
    await Promise.all(linkUpdates.slice(i, i + CREATE_BATCH));
  }

  // Auto-advance BYE winners
  const byeMatches = await prisma.match.findMany({
    where: { bracketId: bracket.id, status: MatchStatus.BYE },
    include: { participants: true },
  });
  for (const bye of byeMatches) {
    const winner = bye.participants.find((p) => p.tournamentTeamId);
    if (winner && bye.nextWinnerMatchId) {
      await placeTeamInMatch(bye.nextWinnerMatchId, winner.tournamentTeamId!, winner.teamLabel);
    }
  }

  await prisma.tournamentStage.update({
    where: { id: stageId },
    data: { status: "LIVE" },
  });

  return { matchCount: generated.length };
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
  // Never rewrite a match that already has a result.
  if (target.result) return;

  // Keep a team in at most one slot in this bracket (avoids duplicate appearances)
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

  // Overwrite preferred slot when editing a prior result (old winner was sitting here).
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

function chunkEvenly(ids: string[], chunks: number): string[][] {
  const result: string[][] = Array.from({ length: Math.max(1, chunks) }, () => []);
  ids.forEach((id, i) => {
    result[i % result.length]!.push(id);
  });
  return result;
}

export { placeTeamInMatch };
