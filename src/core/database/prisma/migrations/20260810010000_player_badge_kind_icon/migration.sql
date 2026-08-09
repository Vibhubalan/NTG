-- AlterTable
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'PLACEMENT';
ALTER TABLE "PlayerBadge" ADD COLUMN IF NOT EXISTS "iconKey" TEXT;

-- CreateIndex: one holder per custom badge key per tournament
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerBadge_custom_tournament_icon_unique"
ON "PlayerBadge" ("tournamentId", "iconKey")
WHERE "kind" = 'CUSTOM' AND "tournamentId" IS NOT NULL AND "iconKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PlayerBadge_kind_iconKey_idx" ON "PlayerBadge" ("kind", "iconKey");
