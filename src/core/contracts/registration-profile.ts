export type ValorantRegistrationProfileCard = {
  displayName: string;
  riotGameName: string | null;
  riotId: string | null;
  teamName: string | null;
  valorantRoles: string[];
  riotPlayerCard: string | null;
  riotPlayerCardWide: string | null;
  currentRankTier: string | null;
  currentRankTierId: number | null;
  peakRankTier: string | null;
  peakRankTierId: number | null;
  auctionRankTier: string;
  auctionRankTierId: number | null;
  auctionRankSource: "CURRENT" | "PEAK";
};
