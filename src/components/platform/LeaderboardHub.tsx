"use client";

import { useState } from "react";
import type { LeaderboardPreview } from "@core/contracts";
import ValorantRankingsBoard, {
  type LeaderboardBoardVariant,
} from "@/components/platform/ValorantRankingsBoard";

type Props = {
  ranks: LeaderboardPreview;
  tournaments: LeaderboardPreview;
};

export default function LeaderboardHub({ ranks, tournaments }: Props) {
  const [tab, setTab] = useState<LeaderboardBoardVariant>("ranks");

  return (
    <ValorantRankingsBoard
      data={tab === "ranks" ? ranks : tournaments}
      variant={tab}
      activeTab={tab}
      onTabChange={setTab}
    />
  );
}
