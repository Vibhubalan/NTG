import LeaderboardHub from "@/components/platform/LeaderboardHub";
import {
  getValorantRankings,
  getValorantTournamentLeaderboard,
} from "@tournaments-leagues/index";

export const revalidate = 60;

export const metadata = {
  title: { absolute: "Leaderboards | NTG Lounge" },
};

export default async function EsportsLeaderboardPage() {
  const [rankings, tournaments] = await Promise.all([
    getValorantRankings(250),
    getValorantTournamentLeaderboard(250),
  ]);

  return <LeaderboardHub ranks={rankings} tournaments={tournaments} />;
}
