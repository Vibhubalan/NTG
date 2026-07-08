import type {
  GalleryPreview,
  LeaderboardPreview,
  TournamentPreview,
  TournamentRegistrationBanner,
} from "@core/contracts";
import { getGalleryPreview } from "@socials-gallery/index";
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
  gallery: GalleryPreview;
};

export async function getHomePreviews(): Promise<HomePreviews> {
  const [tournaments, registration, auction, leaderboardValorant, gallery] =
    await Promise.all([
      listTournamentPreviews(),
      getActiveRegistrationBanner(),
      getActiveAuction(),
      getValorantRankings(5),
      getGalleryPreview(3),
    ]);

  return {
    tournaments,
    registration,
    auction,
    leaderboardValorant,
    gallery,
  };
}
