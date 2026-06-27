"use client";

import { useState } from "react";
import type { LeaderboardPreview } from "@core/contracts";
import type { ClashRoyaleLeaderboardPreview } from "@core/contracts/clash-royale-leaderboard";
import ValorantRankingsBoard from "@/components/platform/ValorantRankingsBoard";
import ClashRoyaleRankingsBoard from "@/components/platform/ClashRoyaleRankingsBoard";
import { gameMetaFor } from "@/lib/tournament-display";
import BrandIcon from "@/components/ui/BrandIcon";

type Props = {
  valorant: LeaderboardPreview;
  clashCurrent: ClashRoyaleLeaderboardPreview;
  clashPeak: ClashRoyaleLeaderboardPreview;
};

export default function LeaderboardHub({ valorant, clashCurrent, clashPeak }: Props) {
  const [game, setGame] = useState<"VALORANT" | "CLASH_ROYALE">("VALORANT");

  const valorantMeta = gameMetaFor("VALORANT");
  const clashMeta = gameMetaFor("CLASH_ROYALE");

  return (
    <div>
      <div className="mx-auto mb-8 flex max-w-6xl flex-wrap gap-2 px-4 sm:px-0">
        <button
          type="button"
          onClick={() => setGame("VALORANT")}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
            game === "VALORANT"
              ? "border-[#ff4655]/40 bg-[#ff4655]/10 text-[#ff9aa3]"
              : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
          }`}
        >
          <BrandIcon path={valorantMeta.iconPath} title="Valorant" className="h-4 w-4" />
          Valorant
        </button>
        <button
          type="button"
          onClick={() => setGame("CLASH_ROYALE")}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
            game === "CLASH_ROYALE"
              ? "border-blue-400/40 bg-blue-500/10 text-blue-200"
              : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
          }`}
        >
          <BrandIcon path={clashMeta.iconPath} title="Clash Royale" className="h-4 w-4" />
          Clash Royale
        </button>
      </div>

      {game === "VALORANT" ? (
        <ValorantRankingsBoard data={valorant} />
      ) : (
        <ClashRoyaleRankingsBoard currentData={clashCurrent} peakData={clashPeak} />
      )}
    </div>
  );
}
