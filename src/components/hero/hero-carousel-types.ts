import type { GameSlug } from "@prisma/client";
import type { ListingPreview } from "@core/contracts/roster-listings";
import type { TournamentRegistrationBanner, TournamentTeamView } from "@core/contracts";
import type { ChampionResult } from "@/lib/tournament-champion";
import type { MvpData } from "@/components/platform/tournament/TournamentFinalResults";
import type { HeroCupStatusClient } from "@/components/HeroCupStatusBanner";

export type HeroSocialLink = {
  name: string;
  href: string;
  path: string;
};

export type HeroChampionsSlideData = {
  mode: "champions";
  tournamentName: string;
  tournamentSlug: string;
  game: GameSlug;
  accentHex: string;
  championData: ChampionResult;
  mvp: MvpData | null;
  allTeams: TournamentTeamView[];
};

export type HeroOpenCupSlideData = {
  mode: "open";
  banner: TournamentRegistrationBanner;
};

export type HeroTournamentSlideData = HeroChampionsSlideData | HeroOpenCupSlideData | null;

export type HeroCarouselData = {
  homeCup: HeroCupStatusClient | null;
  auctionHref: string | null;
  tournament: HeroTournamentSlideData;
  listings: ListingPreview[];
  socials: HeroSocialLink[];
};
