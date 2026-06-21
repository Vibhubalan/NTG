import type { GameSlug, PlacementRole, TournamentStatus } from "@prisma/client";

export type TournamentPlacementView = {
  role: PlacementRole;
  displayName: string;
  teamLabel: string | null;
};

export type TournamentMatchView = {
  id: string;
  roundNumber: number;
  positionInRound: number;
  status: string;
  scoreSummary: string | null;
  participants: { slot: number; label: string }[];
};

export type TournamentDetail = {
  id: string;
  slug: string;
  name: string;
  game: GameSlug;
  gameLabel: string | null;
  seasonLabel: string | null;
  status: TournamentStatus;
  description: string | null;
  posterUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  prizePool: string | null;
  prizeNotes: string | null;
  prizeSplit: PrizeSplitRow[] | null;
  registrationOpen: boolean;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  bracketUrl: string | null;
  rulebookUrl: string | null;
  teams: string[];
  teamDetails: TournamentTeamView[];
  placements: TournamentPlacementView[];
  matches: TournamentMatchView[];
  registrationCount: number;
  userRegistered: boolean;
};

export type PrizeSplitRow = {
  place: number;
  label: string;
  amount: number;
};

export type TournamentTeamPlayerView = {
  id: string;
  displayName: string;
  riotId: string | null;
  olympusId?: string | null;
  participantRole?: "CAPTAIN" | "PLAYER";
};

export type TournamentTeamView = {
  id: string;
  name: string;
  seed: number | null;
  logoUrl: string | null;
  players: TournamentTeamPlayerView[];
};
