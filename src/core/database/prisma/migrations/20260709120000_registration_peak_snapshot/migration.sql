ALTER TABLE "TournamentRegistration" ADD COLUMN IF NOT EXISTS "snapshotPeakRankTier" TEXT;
ALTER TABLE "TournamentRegistration" ADD COLUMN IF NOT EXISTS "snapshotPeakRankTierId" INTEGER;
ALTER TABLE "TournamentRegistration" ADD COLUMN IF NOT EXISTS "snapshotPeakAct" TEXT;
