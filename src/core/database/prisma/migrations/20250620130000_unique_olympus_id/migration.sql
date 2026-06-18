-- Case-insensitive unique Olympus ID across accounts and pending signups.

ALTER TABLE "User" ADD COLUMN "olympusIdKey" TEXT;

UPDATE "User"
SET "olympusIdKey" = lower(trim("olympusId"))
WHERE "olympusId" IS NOT NULL AND trim("olympusId") <> '';

WITH ranked AS (
  SELECT
    id,
    "olympusIdKey" AS base_key,
    row_number() OVER (
      PARTITION BY "olympusIdKey"
      ORDER BY "createdAt"
    ) AS rn
  FROM "User"
  WHERE "olympusIdKey" IS NOT NULL
)
UPDATE "User" u
SET "olympusIdKey" = CASE
  WHEN r.rn = 1 THEN r.base_key
  ELSE r.base_key || '-' || substring(u.id FROM 1 FOR 6)
END
FROM ranked r
WHERE u.id = r.id;

CREATE UNIQUE INDEX "User_olympusIdKey_key" ON "User"("olympusIdKey");

ALTER TABLE "PendingSignup" ADD COLUMN "olympusIdKey" TEXT;

UPDATE "PendingSignup"
SET "olympusIdKey" = lower(trim("olympusId"));

WITH ranked AS (
  SELECT
    id,
    "olympusIdKey" AS base_key,
    row_number() OVER (
      PARTITION BY "olympusIdKey"
      ORDER BY "createdAt"
    ) AS rn
  FROM "PendingSignup"
  WHERE "olympusIdKey" IS NOT NULL
)
UPDATE "PendingSignup" p
SET "olympusIdKey" = CASE
  WHEN r.rn = 1 THEN r.base_key
  ELSE r.base_key || '-' || substring(p.id FROM 1 FOR 6)
END
FROM ranked r
WHERE p.id = r.id;

ALTER TABLE "PendingSignup" ALTER COLUMN "olympusIdKey" SET NOT NULL;
CREATE UNIQUE INDEX "PendingSignup_olympusIdKey_key" ON "PendingSignup"("olympusIdKey");
