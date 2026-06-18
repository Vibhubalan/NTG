import { getHomePreviews } from "@landing-home/index";
import {
  tournaments as staticTournaments,
  tournamentRegistration,
  isStaticRegistrationBannerLive,
} from "@/lib/data";
import { toTournamentDisplay } from "@/lib/tournament-display";
import TournamentVault from "@/components/TournamentVault";
import type { TournamentVaultProps } from "@/components/tournaments/types";

function staticFallback(): TournamentVaultProps {
  return {
    tournaments: staticTournaments.map((t) => ({
      id: t.id,
      slug: t.id,
      name: t.name,
      game: t.game,
      season: t.season,
      date: t.date,
      status: t.status === "Hosted" ? "Hosted" : "Soon",
      iconPath: t.iconPath,
      hex: t.hex,
    })),
    registration: isStaticRegistrationBannerLive()
      ? {
          active: true,
          tournamentSlug: tournamentRegistration.cupId,
          title: tournamentRegistration.title,
          detail: tournamentRegistration.detail,
          message: tournamentRegistration.message,
          href: tournamentRegistration.href,
          hideAfter: tournamentRegistration.hideAfter ?? null,
          hubBannerUrl: null,
          hubCarouselImages: [],
        }
      : null,
  };
}

export default async function TournamentVaultSection() {
  let props: TournamentVaultProps;

  try {
    const previews = await getHomePreviews();
    if (previews.tournaments.length > 0) {
      props = {
        tournaments: previews.tournaments.map(toTournamentDisplay),
        registration: previews.registration,
      };
    } else {
      props = staticFallback();
    }
  } catch {
    props = staticFallback();
  }

  return <TournamentVault {...props} />;
}
