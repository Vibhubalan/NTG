-- First kill / first death counts per player appearance (from Henrik kill timeline).

ALTER TABLE "TournamentGamePlayer"
  ADD COLUMN IF NOT EXISTS "firstKills" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TournamentGamePlayer"
  ADD COLUMN IF NOT EXISTS "firstDeaths" INTEGER NOT NULL DEFAULT 0;
