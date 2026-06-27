import ValorantRankingsBoard from "@/components/platform/ValorantRankingsBoard";
import LeaderboardHub from "@/components/platform/LeaderboardHub";
import { getValorantRankings, getClashRoyaleRankings } from "@tournaments-leagues/index";
import { showClashRoyaleLeaderboard } from "@/lib/env";
import { serverEnv } from "@core/config/env.server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Rankings | NTG Esports" },
};

export default async function EsportsLeaderboardPage() {
  const valorant = await getValorantRankings(250);

  const clashEnabled =
    showClashRoyaleLeaderboard && serverEnv.clashRoyaleLeaderboardEnabled;

  if (clashEnabled) {
    const [clashCurrent, clashPeak] = await Promise.all([
      getClashRoyaleRankings("current", 250),
      getClashRoyaleRankings("peak", 250),
    ]);

    return (
      <LeaderboardHub
        valorant={valorant}
        clashCurrent={clashCurrent}
        clashPeak={clashPeak}
      />
    );
  }

  return <ValorantRankingsBoard data={valorant} />;
}
