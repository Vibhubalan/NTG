-- Keep prod DB in sync: column may already exist from an earlier stages deploy.
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "yourGamesEnabled" BOOLEAN NOT NULL DEFAULT true;
