import { prisma } from "@core/database/client";
import type { TournamentBracketView } from "@core/contracts/tournament-bracket";
import { normalizeTeamName } from "@/lib/tournament-champion";

/**
 * Persist Challonge finalists into TournamentPlacement so cups list / calendar
 * can show winners without calling Challonge on every page load.
 * Does not overwrite admin placements that already have a linked userId.
 */
export async function syncBracketChampionsToPlacements(
  tournamentId: string,
  brackets: { url: string; bracket: TournamentBracketView | null }[],
): Promise<void> {
  const withStandings = brackets
    .map((b) => b.bracket)
    .filter((b): b is TournamentBracketView => Boolean(b?.finalStandings?.length));

  // Prefer the bracket that actually has a #1 (playoffs over empty groups).
  const bracket =
    [...withStandings].reverse().find((b) =>
      b.finalStandings.some((s) => s.rank === 1 && s.name?.trim()),
    ) ?? withStandings[0];
  if (!bracket) return;

  const rank1 = bracket.finalStandings.find((s) => s.rank === 1);
  const rank2 = bracket.finalStandings.find((s) => s.rank === 2);
  const champName = rank1?.name?.trim();
  if (!champName) return;

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: { name: true },
  });

  const resolveLabel = (raw: string) => {
    const exact = teams.find(
      (t) => t.name.trim().toLowerCase() === raw.trim().toLowerCase(),
    );
    if (exact) return exact.name;
    const fuzzy = teams.find((t) => {
      const a = normalizeTeamName(t.name);
      const b = normalizeTeamName(raw);
      return (
        a === b ||
        (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a)))
      );
    });
    return fuzzy?.name ?? raw.trim();
  };

  const championLabel = resolveLabel(champName);
  const runnerLabel = rank2?.name?.trim() ? resolveLabel(rank2.name) : null;

  const existing = await prisma.tournamentPlacement.findMany({
    where: {
      tournamentId,
      role: { in: ["CHAMPION", "RUNNER_UP"] },
    },
    select: { role: true, userId: true, teamLabel: true },
  });
  const byRole = new Map(existing.map((p) => [p.role, p]));

  const champExisting = byRole.get("CHAMPION");
  if (!champExisting?.userId) {
    await prisma.tournamentPlacement.upsert({
      where: {
        tournamentId_role: { tournamentId, role: "CHAMPION" },
      },
      create: {
        tournamentId,
        role: "CHAMPION",
        teamLabel: championLabel,
      },
      update: {
        teamLabel: championLabel,
      },
    });
  }

  if (runnerLabel) {
    const runnerExisting = byRole.get("RUNNER_UP");
    if (!runnerExisting?.userId) {
      await prisma.tournamentPlacement.upsert({
        where: {
          tournamentId_role: { tournamentId, role: "RUNNER_UP" },
        },
        create: {
          tournamentId,
          role: "RUNNER_UP",
          teamLabel: runnerLabel,
        },
        update: {
          teamLabel: runnerLabel,
        },
      });
    }
  }
}
