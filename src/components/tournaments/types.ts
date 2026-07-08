import type { TournamentRegistrationBanner } from "@core/contracts";
import type { TournamentDisplay } from "@/lib/tournament-display";

export type ActiveAuctionBanner = { slug: string; name: string; endsAt: string | null };

export type TournamentVaultProps = {
  tournaments: TournamentDisplay[];
  registration: TournamentRegistrationBanner | null;
  auction?: ActiveAuctionBanner | null;
  hideHeader?: boolean;
};
