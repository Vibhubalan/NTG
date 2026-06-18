import { getHomePreviews } from "@landing-home/index";
import { toTournamentDisplay } from "@/lib/tournament-display";
import TournamentVault from "@/components/TournamentVault";
import type { TournamentVaultProps } from "@/components/tournaments/types";

export default async function TournamentVaultSection() {
  let props: TournamentVaultProps = { tournaments: [], registration: null };

  try {
    const previews = await getHomePreviews();
    props = {
      tournaments: previews.tournaments.map(toTournamentDisplay),
      registration: previews.registration,
    };
  } catch {
    props = { tournaments: [], registration: null };
  }

  return <TournamentVault {...props} />;
}
