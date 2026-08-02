import type {
  LeaderboardPreview,
  TournamentPreview,
  TournamentRegistrationBanner,
} from "@core/contracts";
import {
  getActiveRegistrationBanner,
  getActiveAuction,
  getValorantRankings,
  listTournamentPreviews,
  type ActiveAuction,
} from "@tournaments-leagues/index";

export type HomePreviews = {
  tournaments: TournamentPreview[];
  registration: TournamentRegistrationBanner | null;
  auction: ActiveAuction | null;
  leaderboardValorant: LeaderboardPreview;
};

export async function getHomePreviews(): Promise<HomePreviews> {
  const [tournaments, registration, auction, leaderboardValorant] =
    await Promise.all([
      listTournamentPreviews(),
      getActiveRegistrationBanner(),
      getActiveAuction(),
      getValorantRankings(5),
    ]);

  return {
    tournaments,
    registration,
    auction,
    leaderboardValorant,
  };
}
