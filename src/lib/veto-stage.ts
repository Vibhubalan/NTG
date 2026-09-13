import { prisma } from "@core/database/client";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { normalizeBracketUrlItems } from "@/lib/challonge";
import { parseVetoFormats, vetoesToRestart, vetoStageFor, type VetoStage } from "@/lib/veto-format";

type BracketSource = { bracketUrl: string | null; bracketUrls: unknown; status: string };

/** Stage of each Challonge match, read from the cup's brackets (the same cache the cup page fills). */
export async function stagesForMatches(
  t: BracketSource,
  matchIds: string[],
): Promise<Map<string, VetoStage>> {
  const stages = new Map<string, VetoStage>();
  for (const item of normalizeBracketUrlItems(t)) {
    if (stages.size === matchIds.length) break;
    const bracket = await fetchChallongeBracket(item.url, t.status === "COMPLETED").catch(() => null);
    if (!bracket) continue;
    for (const id of matchIds) {
      const stage = stages.has(id) ? null : vetoStageFor(bracket, id);
      if (stage) stages.set(id, stage);
    }
  }
  return stages;
}

/**
 * Apply a format change to vetoes already under way: every still-live veto whose
 * stage now maps to a different format switches to it and starts over (the
 * services app rebuilds the session on the next join or click). Finished vetoes
 * are never touched. Returns how many were restarted.
 */
export async function restartChangedVetoes(tournamentId: string): Promise<number> {
  const live = await prisma.tournamentMatch.findMany({
    where: { tournamentId, status: "VETO_LIVE" },
    select: { id: true, challongeMatchId: true, format: true },
  });
  if (!live.length) return 0;

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { bracketUrl: true, bracketUrls: true, status: true, vetoFormats: true },
  });
  if (!t) return 0;

  const stages = await stagesForMatches(t, live.map((m) => m.challongeMatchId));
  const restart = vetoesToRestart(live, stages, parseVetoFormats(t.vetoFormats));
  for (const m of restart) {
    // Both writes re-check "still live", so a veto that finishes mid-save is kept.
    // veto_sessions is owned by the services app and has no Prisma model here.
    await prisma.$transaction([
      prisma.$executeRaw`DELETE FROM veto_sessions WHERE match_id = ${m.id} AND status = 'live'`,
      prisma.tournamentMatch.updateMany({
        where: { id: m.id, status: "VETO_LIVE" },
        data: { format: m.nextFormat },
      }),
    ]);
  }
  return restart.length;
}
