import type {
  TournamentTeamView,
  TournamentBracketView,
} from "@core/contracts";

export type ChampionResult = {
  championTeam: TournamentTeamView;
  runnerUpTeam?: TournamentTeamView | null;
  matchScore?: string | null;
  stageName?: string | null;
};

export function resolveChampion(
  bracket: TournamentBracketView | null = null,
  teamDetails: TournamentTeamView[] = [],
  teams: string[] = [],
): ChampionResult | null {
  if (!bracket?.finalStandings || bracket.finalStandings.length === 0) return null;

  const rank1 = bracket.finalStandings.find((s) => s.rank === 1);
  const rank2 = bracket.finalStandings.find((s) => s.rank === 2);
  if (!rank1) return null;

  const champTeam = findTeamDetail(null, rank1.name, teamDetails, teams);
  const runnerUpTeam = rank2
    ? findTeamDetail(null, rank2.name, teamDetails, teams)
    : null;
  if (!champTeam) return null;

  return {
    championTeam: champTeam,
    runnerUpTeam,
    matchScore: formatFinalScore(rank1.record),
    stageName: "Grand Finals",
  };
}

function formatFinalScore(record: string | null | undefined): string | null {
  if (!record?.trim()) return null;
  const cleaned = record.trim().replace(/\s+/g, " ");
  const scoreMatch = cleaned.match(/^(\d+)\s*[-–:]\s*(\d+)$/);
  if (scoreMatch) return `${scoreMatch[1]} - ${scoreMatch[2]}`;
  return cleaned;
}

function findTeamDetail(
  teamId: string | null | undefined,
  teamLabel: string | null | undefined,
  teamDetails: TournamentTeamView[],
  teams: string[],
): TournamentTeamView | null {
  if (teamId) {
    const found = teamDetails.find((t) => t.id === teamId);
    if (found) return found;
  }
  if (teamLabel) {
    const norm = teamLabel.trim().toLowerCase();
    const found = teamDetails.find((t) => t.name.trim().toLowerCase() === norm);
    if (found) return found;
    const listed = teams.find((t) => t.trim().toLowerCase() === norm);
    return {
      id: teamId ?? `team-${teamLabel}`,
      name: listed ?? teamLabel,
      seed: null,
      logoUrl: null,
      players: [],
    };
  }
  return null;
}
