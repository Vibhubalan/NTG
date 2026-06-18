import type { TournamentDetail, TournamentPlacementView } from "@core/contracts";
import type { PlacementRole } from "@prisma/client";

/**
 * When true, missing bracket/teams/placements are filled from STATIC_TOURNAMENT_DETAIL.
 * Set NEXT_PUBLIC_USE_STATIC_TOURNAMENT_DETAIL=0 to rely on DB/admin only.
 */
export const useStaticTournamentDetail =
  process.env.NEXT_PUBLIC_USE_STATIC_TOURNAMENT_DETAIL !== "0";

export type StaticTournamentOverlay = {
  bracketUrl?: string;
  teams?: string[];
  placements?: {
    champion?: string;
    runnerUp?: string;
    mvp?: string;
  };
};

/** Dev/static cup data — replace with admin panel values later. */
export const STATIC_TOURNAMENT_DETAIL: Record<string, StaticTournamentOverlay> = {
  "val-cup-1": {
    bracketUrl: "https://challonge.com/NTG_ValCup1",
    teams: ["Team Phoenix", "Mangalore Five", "Coastal Elite", "Bunts Brigade"],
    placements: { champion: "Team Phoenix", runnerUp: "Mangalore Five", mvp: "rxven" },
  },
  "cs-cup-1": {
    bracketUrl: "https://challonge.com/NTG_CS2",
    teams: ["Coastal CS", "Hostel Heroes", "MLR Five", "Arena Kings"],
    placements: { champion: "Coastal CS", runnerUp: "Hostel Heroes", mvp: "s1mple_mlr" },
  },
  "val-cup-2": {
    bracketUrl: "https://challonge.com/wr0qwd50",
    teams: ["Tulunad Titans", "Bunts Brigade", "Viper Squad", "Coastal Five"],
    placements: { champion: "Tulunad Titans", runnerUp: "Bunts Brigade", mvp: "viperX" },
  },
  "auc-cup-1": {
    bracketUrl: "https://challonge.com/jyln1rx4",
    teams: ["Auction Kings", "Draft Devils", "Bid Squad", "Gavel Gang"],
    placements: { champion: "Auction Kings", runnerUp: "Draft Devils", mvp: "jettMain" },
  },
  "auc-cup-2": {
    bracketUrl: "https://challonge.com/7yp0smt8",
    teams: ["Bid Squad", "Gavel Gang", "Hammer FC", "Lotus Five"],
    placements: { champion: "Bid Squad", runnerUp: "Gavel Gang", mvp: "omenOG" },
  },
  "fc26-cup-1": {
    bracketUrl: "",
    teams: ["MLR United", "Coastal FC", "Hostel XI", "Arena FC"],
  },
  "auc-cup-3": {
    bracketUrl: "",
    teams: ["Evils Ins1de", "Handicapped Hooligans", "Golibaje"],
    placements: { mvp: "TBD — set via admin" },
  },
};

function placementsFromStatic(
  placements: NonNullable<StaticTournamentOverlay["placements"]>,
): TournamentPlacementView[] {
  const rows: { role: PlacementRole; label: string }[] = [];
  if (placements.champion) rows.push({ role: "CHAMPION", label: placements.champion });
  if (placements.runnerUp) rows.push({ role: "RUNNER_UP", label: placements.runnerUp });
  if (placements.mvp) rows.push({ role: "MVP", label: placements.mvp });

  return rows.map(({ role, label }) => ({
    role,
    displayName: label,
    teamLabel: label,
  }));
}

/** Merge DB tournament detail with static overlay when the flag is enabled. */
export function mergeTournamentDetail(detail: TournamentDetail): TournamentDetail {
  if (!useStaticTournamentDetail) return detail;

  const overlay = STATIC_TOURNAMENT_DETAIL[detail.slug];
  if (!overlay) return detail;

  const bracketUrl = detail.bracketUrl ?? overlay.bracketUrl ?? null;
  const teams =
    detail.teams.length > 0 ? detail.teams : (overlay.teams ?? []);

  const isCompleted = detail.status === "COMPLETED";
  const placements =
    detail.placements.length > 0
      ? detail.placements
      : isCompleted && overlay.placements && !bracketUrl
        ? placementsFromStatic(overlay.placements)
        : detail.placements;

  return { ...detail, bracketUrl, teams, placements };
}
