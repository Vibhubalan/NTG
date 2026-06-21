import type { GameSlug, TournamentStatus } from "@prisma/client";

export type TournamentPreview = {
  id: string;
  slug: string;
  name: string;
  game: GameSlug;
  gameLabel: string | null;
  registrationFormat: string | null;
  status: TournamentStatus;
  startsAt: string | null;
  registrationUrl: string | null;
  championName?: string | null;
  bracketUrl?: string | null;
};

export type TournamentRegistrationBanner = {
  active: boolean;
  tournamentSlug: string;
  title: string;
  detail: string;
  message: string;
  href: string;
  hideAfter: string | null;
  hubBannerUrl: string | null;
  hubCarouselImages: string[];
};
