import ValorantRankingsBoard from "@/components/platform/ValorantRankingsBoard";
import { getValorantRankings } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Rankings | NTG Esports" },
};

export default async function EsportsLeaderboardPage() {
  const rankings = await getValorantRankings(250);

  return <ValorantRankingsBoard data={rankings} />;
}
