import {
  floorForRegistration,
  normalizeRankConfig,
  type AuctionRankConfig,
  type RegistrationRanks,
} from "./rank-pricing";

export type CaptainRegistrationRanks = RegistrationRanks & {
  id: string;
  userId: string;
};

export function computeTeamCoreDeduction(
  game: string,
  captain: CaptainRegistrationRanks,
  coCaptain: RegistrationRanks | null,
  rankConfig: AuctionRankConfig,
): { coreDeduction: number; captainCore: number; coCaptainCore: number } {
  const cfg = normalizeRankConfig(rankConfig, game);
  const captainCore = floorForRegistration(game, captain, cfg);
  const coCaptainCore = coCaptain ? floorForRegistration(game, coCaptain, cfg) : 0;
  return {
    coreDeduction: captainCore + coCaptainCore,
    captainCore,
    coCaptainCore,
  };
}
