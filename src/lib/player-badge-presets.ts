export type PlayerBadgeKind = "PLACEMENT" | "CUSTOM";
export type PlacementBadgeType = "WINNER" | "RUNNER_UP";

export type CustomBadgePreset = {
  key: string;
  label: string;
  /** Short blurb for admin UI. */
  blurb: string;
  /** Accent used in UI (CSS color). */
  accent: string;
};

/** Unique custom badges — only one holder per key per tournament. */
export const CUSTOM_BADGE_PRESETS: CustomBadgePreset[] = [
  {
    key: "best_initiator",
    label: "Best Initiator",
    blurb: "Opened rounds and made space",
    accent: "#38bdf8",
  },
  {
    key: "best_controller",
    label: "Best Controller",
    blurb: "Smokes, tempo, and map control",
    accent: "#a78bfa",
  },
  {
    key: "best_duelist",
    label: "Best Duelist",
    blurb: "First contact, highest impact",
    accent: "#f43f5e",
  },
  {
    key: "best_sentinel",
    label: "Best Sentinel",
    blurb: "Locks sites and shuts down lurks",
    accent: "#34d399",
  },
  {
    key: "best_igl",
    label: "Best IGL",
    blurb: "Called the win",
    accent: "#fbbf24",
  },
  {
    key: "best_flex",
    label: "Best Flex",
    blurb: "Any role, any agent, still impact",
    accent: "#2dd4bf",
  },
  {
    key: "clutch_king",
    label: "Clutch King",
    blurb: "Owned the impossible rounds",
    accent: "#fb923c",
  },
  {
    key: "entry_fragger",
    label: "Entry Fragger",
    blurb: "First through the door",
    accent: "#ef4444",
  },
  {
    key: "support_star",
    label: "Support Star",
    blurb: "Made teammates look cracked",
    accent: "#22d3ee",
  },
  {
    key: "lurk_lord",
    label: "Lurk Lord",
    blurb: "Timing from the shadows",
    accent: "#94a3b8",
  },
  {
    key: "ace_machine",
    label: "Ace Machine",
    blurb: "Full-team wipe energy",
    accent: "#e879f9",
  },
];

/** Global Best-* role awards shown on the tournament podium / leaderboard. */
export const BEST_ROLE_BADGE_KEYS = [
  "best_initiator",
  "best_duelist",
  "best_flex",
  "best_sentinel",
  "best_controller",
] as const;

export type BestRoleBadgeKey = (typeof BEST_ROLE_BADGE_KEYS)[number];

export function isBestRoleBadgeKey(
  key: string | null | undefined,
): key is BestRoleBadgeKey {
  return Boolean(key && (BEST_ROLE_BADGE_KEYS as readonly string[]).includes(key));
}

export function getCustomBadgePreset(key: string): CustomBadgePreset | null {
  return CUSTOM_BADGE_PRESETS.find((p) => p.key === key) ?? null;
}

export function placementBadgeLabel(tournamentName: string, type: PlacementBadgeType): string {
  return `${tournamentName} ${type === "WINNER" ? "WINNER" : "RUNNER-UP"}`;
}

export function isPlacementWinnerLabel(label: string): boolean {
  return /\sWINNER$/i.test(label);
}

export function isPlacementRunnerUpLabel(label: string): boolean {
  return /RUNNER-UP$/i.test(label);
}
