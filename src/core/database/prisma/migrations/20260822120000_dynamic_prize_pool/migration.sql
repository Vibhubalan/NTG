-- Additive only. Safe to re-run if the enum or columns already exist.
DO $$ BEGIN
  CREATE TYPE "PrizePoolMode" AS ENUM ('MANUAL', 'DYNAMIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "prizePoolMode" "PrizePoolMode" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "prizePerPlayer" DECIMAL(10,2);
