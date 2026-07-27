import type {
  TournamentTeamView,
  TournamentBracketView,
  TournamentPlacementView,
} from "@core/contracts";

export type ChampionResult = {
  championTeam: TournamentTeamView;
  runnerUpTeam?: TournamentTeamView | null;
  matchScore?: string | null;
  stageName?: string | null;
};

/** Normalize team labels for fuzzy matching (Challonge vs cup roster). */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(team|esports|esport|gaming|clan|fc|sc|club|the|org|organisation|organization)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function teamNamesMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  const ta = new Set(na.split(" ").filter((t) => t.length > 1));
  const tb = new Set(nb.split(" ").filter((t) => t.length > 1));
  if (ta.size === 0 || tb.size === 0) return false;
  const [smaller, larger] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  for (const token of smaller) {
    if (!larger.has(token)) return false;
  }
  return true;
}

/** @deprecated Use teamNamesMatch */
export const namesMatch = teamNamesMatch;

export function resolveChampion(
  bracket: TournamentBracketView | null = null,
  teamDetails: TournamentTeamView[] = [],
  teams: string[] = [],
  placements: TournamentPlacementView[] = [],
): ChampionResult | null {
  const fromBracket = resolveFromBracket(bracket, teamDetails, teams);
  if (fromBracket) return fromBracket;
  return resolveFromPlacements(placements, teamDetails, teams);
}

function resolveFromBracket(
  bracket: TournamentBracketView | null,
  teamDetails: TournamentTeamView[],
  teams: string[],
): ChampionResult | null {
  if (!bracket?.finalStandings || bracket.finalStandings.length === 0) return null;

  const rank1 = bracket.finalStandings.find((s) => s.rank === 1);
  const rank2 = bracket.finalStandings.find((s) => s.rank === 2);
  if (!rank1?.name?.trim()) return null;

  const champTeam = findTeamDetail(rank1.name, teamDetails, teams);
  const runnerUpTeam = rank2?.name?.trim()
    ? findTeamDetail(rank2.name, teamDetails, teams)
    : null;
  if (!champTeam) return null;

  return {
    championTeam: champTeam,
    runnerUpTeam,
    matchScore: formatFinalScore(rank1.record),
    stageName: "Grand Finals",
  };
}

function resolveFromPlacements(
  placements: TournamentPlacementView[],
  teamDetails: TournamentTeamView[],
  teams: string[],
): ChampionResult | null {
  const champ = placements.find((p) => p.role === "CHAMPION");
  const runner = placements.find((p) => p.role === "RUNNER_UP");
  const champLabel =
    champ?.teamLabel?.trim() ||
    champ?.user?.username?.trim() ||
    champ?.displayName?.trim() ||
    null;
  if (!champLabel) return null;

  const champTeam = findTeamDetail(champLabel, teamDetails, teams);
  if (!champTeam) return null;

  const runnerLabel = runner?.teamLabel?.trim() || null;
  const runnerUpTeam = runnerLabel
    ? findTeamDetail(runnerLabel, teamDetails, teams)
    : null;

  return {
    championTeam: champTeam,
    runnerUpTeam,
    matchScore: null,
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
  teamLabel: string,
  teamDetails: TournamentTeamView[],
  teams: string[],
): TournamentTeamView | null {
  const label = teamLabel.trim();
  if (!label) return null;

  const exact = teamDetails.find(
    (t) => t.name.trim().toLowerCase() === label.toLowerCase(),
  );
  if (exact) return withRoster(exact, teamDetails, label);

  const fuzzy = teamDetails.find((t) => teamNamesMatch(t.name, label));
  if (fuzzy) return withRoster(fuzzy, teamDetails, label);

  const listedExact = teams.find((t) => t.trim().toLowerCase() === label.toLowerCase());
  if (listedExact) {
    return withRoster(
      {
        id: `team-${listedExact}`,
        name: listedExact,
        seed: null,
        logoUrl: null,
        players: [],
      },
      teamDetails,
      label,
    );
  }

  const listedFuzzy = teams.find((t) => teamNamesMatch(t, label));
  if (listedFuzzy) {
    return withRoster(
      {
        id: `team-${listedFuzzy}`,
        name: listedFuzzy,
        seed: null,
        logoUrl: null,
        players: [],
      },
      teamDetails,
      label,
    );
  }

  return withRoster(
    {
      id: `team-${label}`,
      name: label,
      seed: null,
      logoUrl: null,
      players: [],
    },
    teamDetails,
    label,
  );
}

function withRoster(
  team: TournamentTeamView,
  teamDetails: TournamentTeamView[],
  label: string,
): TournamentTeamView {
  if (team.players.length > 0) return team;
  const donor = teamDetails.find(
    (t) => t.players.length > 0 && teamNamesMatch(t.name, label),
  );
  if (donor) return { ...team, players: donor.players };
  return team;
}
