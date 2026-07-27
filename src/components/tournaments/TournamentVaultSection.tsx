import { getHomePreviews } from "@/lib/home-previews";
import { toTournamentDisplay } from "@/lib/tournament-display";
import TournamentVault from "@/components/TournamentVault";
import type { TournamentVaultProps } from "@/components/tournaments/types";
import type { TournamentPreview, TournamentRegistrationBanner } from "@core/contracts";
import type { ActiveAuction } from "@tournaments-leagues/index";

type SectionProps = {
  hideHeader?: boolean;
  preloaded?: TournamentVaultProps;
};

export function buildTournamentVaultProps(
  tournaments: TournamentPreview[],
  registration: TournamentRegistrationBanner | null,
  auction?: ActiveAuction | null,
): TournamentVaultProps {
  const sorted = [...tournaments].sort((a, b) => {
    const timeA = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const timeB = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return tournaments.indexOf(b) - tournaments.indexOf(a);
  });

  const limited = sorted.slice(0, 5);

  return {
    tournaments: limited.map((t) => {
      const display = toTournamentDisplay(t);
      return {
        ...display,
        displayNumber: tournaments.indexOf(t) + 1,
      };
    }),
    registration,
    auction: auction ?? null,
  };
}

export default async function TournamentVaultSection({ hideHeader = false, preloaded }: SectionProps) {
  let props: TournamentVaultProps = preloaded ?? { tournaments: [], registration: null };

  if (!preloaded) {
    try {
      const previews = await getHomePreviews();
      props = buildTournamentVaultProps(
        previews.tournaments,
        previews.registration,
        previews.auction,
      );
    } catch {
      props = { tournaments: [], registration: null };
    }
  }

  return <TournamentVault {...props} hideHeader={hideHeader} />;
}
