import { getHomePreviews } from "@/lib/home-previews";
import { toTournamentDisplay } from "@/lib/tournament-display";
import TournamentVault from "@/components/TournamentVault";
import type { TournamentVaultProps } from "@/components/tournaments/types";

export default async function TournamentVaultSection() {
  let props: TournamentVaultProps = { tournaments: [], registration: null };

  try {
    const previews = await getHomePreviews();

    // Sort tournaments by startsAt descending (newest first).
    // Swap the order of equal-date tournaments so:
    // - cs-cup-1 precedes val-cup-1
    // - auc-cup-1 precedes val-cup-2
    // We achieve this by reversing the original database index order for ties.
    const sorted = [...previews.tournaments].sort((a, b) => {
      const timeA = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const timeB = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return previews.tournaments.indexOf(b) - previews.tournaments.indexOf(a);
    });

    // Only show the recent 5 tournaments
    const limited = sorted.slice(0, 5);

    props = {
      tournaments: limited.map((t) => {
        const display = toTournamentDisplay(t);
        return {
          ...display,
          displayNumber: previews.tournaments.indexOf(t) + 1,
        };
      }),
      registration: previews.registration,
      auction: previews.auction,
    };
  } catch {
    props = { tournaments: [], registration: null };
  }

  return <TournamentVault {...props} />;
}
