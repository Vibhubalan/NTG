import { prisma } from "@core/database/client";
import type { TournamentBracketView } from "@core/contracts/tournament-bracket";
import { normalizeTeamName } from "@/lib/tournament-champion";

/** Remove Challonge-synced champ/runner rows (no linked user). Keeps admin-linked placements. */
export async function clearAutoSyncedChampions(tournamentId: string): Promise<boolean> {
  const res = await prisma.tournamentPlacement.deleteMany({
    where: {
      tournamentId,
      role: { in: ["CHAMPION", "RUNNER_UP"] },
      userId: null,
    },
  });
  return res.count > 0;
}

/**
 * Persist Challonge finalists into TournamentPlacement so cups list / calendar
 * can show winners without calling Challonge on every page load.
 * Does not overwrite admin placements that already have a linked userId.
 * When no bracket is marked "Use for Winners", clears previously auto-synced winners.
 * Returns true if DB records were updated/modified, false otherwise.
 */
export async function syncBracketChampionsToPlacements(
  tournamentId: string,
  brackets: { url: string; isFinal?: boolean; bracket: TournamentBracketView | null }[],
  tournamentStatus?: string,
): Promise<boolean> {
  if (tournamentStatus && tournamentStatus !== "COMPLETED") {
    return await clearAutoSyncedChampions(tournamentId);
  }

  const eligible = brackets.filter((b) => b.isFinal !== false);
  if (eligible.length === 0) {
    return await clearAutoSyncedChampions(tournamentId);
  }

  const withStandings = eligible
    .map((b) => b.bracket)
    .filter((b): b is TournamentBracketView => Boolean(b?.finalStandings?.length));

  // Prefer the bracket that actually has a #1 (playoffs over empty groups).
  const bracket =
    [...withStandings].reverse().find((b) =>
      b.finalStandings.some((s) => s.rank === 1 && s.name?.trim()),
    ) ?? withStandings[0];
  if (!bracket) return false;

  const rank1 = bracket.finalStandings.find((s) => s.rank === 1);
  const rank2 = bracket.finalStandings.find((s) => s.rank === 2);
  const champName = rank1?.name?.trim();
  if (!champName) return false;

  const existing = await prisma.tournamentPlacement.findMany({
    where: {
      tournamentId,
      role: { in: ["CHAMPION", "RUNNER_UP"] },
    },
    select: { role: true, userId: true, teamLabel: true },
  });
  const byRole = new Map(existing.map((p) => [p.role, p]));

  const champExisting = byRole.get("CHAMPION");
  const runnerExisting = byRole.get("RUNNER_UP");

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

  let didUpdate = false;

  const champNeedsUpdate =
    !champExisting ||
    (!champExisting.userId && champExisting.teamLabel !== championLabel);

  if (champNeedsUpdate) {
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
      didUpdate = true;
    }
  }

  if (runnerLabel) {
    const runnerNeedsUpdate =
      !runnerExisting ||
      (!runnerExisting.userId && runnerExisting.teamLabel !== runnerLabel);
    if (runnerNeedsUpdate && !runnerExisting?.userId) {
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
      didUpdate = true;
    }
  } else {
    // Final stage has a champion but no runner — drop stale auto runner-up.
    if (runnerExisting && !runnerExisting.userId) {
      const res = await prisma.tournamentPlacement.deleteMany({
        where: { tournamentId, role: "RUNNER_UP", userId: null },
      });
      if (res.count > 0) didUpdate = true;
    }
  }

  return didUpdate;
}
