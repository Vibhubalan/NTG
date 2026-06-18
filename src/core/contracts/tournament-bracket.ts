export type BracketMatchSlot = {
  seed: number | null;
  name: string;
  score: string;
  isWinner: boolean;
};

export type BracketMatchView = {
  id: string;
  matchNumber: number | null;
  slots: [BracketMatchSlot, BracketMatchSlot];
  state: "pending" | "open" | "complete";
  player1PrereqMatchId?: string | null;
  player2PrereqMatchId?: string | null;
};

export type BracketRoundView = {
  id: string;
  label: string;
  side: "winners" | "losers" | "final";
  roundNumber: number;
  matches: BracketMatchView[];
};

export type FinalStandingView = {
  rank: number;
  name: string;
  record: string;
};

export type TournamentBracketView = {
  tournamentName: string;
  tournamentType: string;
  rounds: BracketRoundView[];
  participants: string[];
  finalStandings: FinalStandingView[];
  mvp: string | null;
  sourceUrl: string | null;
  fetchedAt: string;
};
