-- Custom badges are global (one holder per iconKey), not per tournament.
DROP INDEX IF EXISTS "PlayerBadge_custom_tournament_icon_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "PlayerBadge_custom_icon_unique"
ON "PlayerBadge" ("iconKey")
WHERE "kind" = 'CUSTOM' AND "iconKey" IS NOT NULL;
