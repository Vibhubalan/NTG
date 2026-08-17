import type { GameSlug } from "@prisma/client";
import type { ListingPreview } from "@core/contracts/roster-listings";
import type { TournamentRegistrationBanner, TournamentTeamView } from "@core/contracts";
import type { ChampionResult } from "@/lib/tournament-champion";
import type { MvpData } from "@/components/platform/tournament/TournamentFinalResults";
import type { HeroCupPhase } from "@tournaments-leagues/domain/auction-hero-phase";

export type HeroSocialLink = {
  name: string;
  href: string;
  path: string;
};

export type HeroCupStatusClient = {
  slug: string;
  name: string;
  phase: HeroCupPhase;
  countdownEndsAt: string | null;
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

export type HeroStatusSlideData = {
  mode: "status";
  cup: HeroCupStatusClient;
  auctionHref: string | null;
};

export type HeroTournamentSlideData =
  | HeroChampionsSlideData
  | HeroOpenCupSlideData
  | HeroStatusSlideData
  | null;

export type HeroCarouselData = {
  tournament: HeroTournamentSlideData;
  listings: ListingPreview[];
  socials: HeroSocialLink[];
};
