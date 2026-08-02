import ValorantRankingsBoard from "@/components/platform/ValorantRankingsBoard";
import { getValorantRankings } from "@tournaments-leagues/index";

export const revalidate = 60;

export const metadata = {
  title: { absolute: "Leaderboards | NTG Lounge" },
};

export default async function EsportsLeaderboardPage() {
  const rankings = await getValorantRankings(250);

  return <ValorantRankingsBoard data={rankings} />;
}
