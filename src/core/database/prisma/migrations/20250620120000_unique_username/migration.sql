-- Unique username key for player profiles; partner lookup by username for FIFA.
ALTER TABLE "PlayerProfile" ADD COLUMN "usernameKey" TEXT;

UPDATE "PlayerProfile"
SET "usernameKey" = lower(trim("displayName"));

WITH ranked AS (
  SELECT
    id,
    lower(trim("displayName")) AS base_key,
    row_number() OVER (
      PARTITION BY lower(trim("displayName"))
      ORDER BY "createdAt"
    ) AS rn
  FROM "PlayerProfile"
)
UPDATE "PlayerProfile" p
SET "usernameKey" = CASE
  WHEN r.rn = 1 THEN r.base_key
  ELSE r.base_key || '-' || substring(p.id FROM 1 FOR 6)
END
FROM ranked r
WHERE p.id = r.id;

ALTER TABLE "PlayerProfile" ALTER COLUMN "usernameKey" SET NOT NULL;
CREATE UNIQUE INDEX "PlayerProfile_usernameKey_key" ON "PlayerProfile"("usernameKey");

ALTER TABLE "TournamentRegistration" RENAME COLUMN "snapshotPartnerAccountId" TO "snapshotPartnerUsername";

-- Backfill partner username snapshots from legacy NTG account IDs where possible.
UPDATE "TournamentRegistration" tr
SET "snapshotPartnerUsername" = pp."displayName"
FROM "User" u
JOIN "PlayerProfile" pp ON pp."userId" = u.id
WHERE tr."snapshotPartnerUsername" = u."accountId"
  AND u."accountId" IS NOT NULL
  AND tr."snapshotPartnerUsername" ~ '^NTG[0-9]{4}$';
