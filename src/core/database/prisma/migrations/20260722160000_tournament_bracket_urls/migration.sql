-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "bracketUrls" JSONB;

-- Backfill from single bracketUrl
UPDATE "Tournament"
SET "bracketUrls" = jsonb_build_array("bracketUrl")
WHERE "bracketUrl" IS NOT NULL
  AND ("bracketUrls" IS NULL OR "bracketUrls" = 'null'::jsonb OR "bracketUrls" = '[]'::jsonb);
