DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TournamentTeamMembershipKind') THEN
    CREATE TYPE "TournamentTeamMembershipKind" AS ENUM ('PRIMARY', 'POACH');
  END IF;
END
$$;

ALTER TABLE "TournamentTeamPlayer"
  ADD COLUMN IF NOT EXISTS "membershipKind" "TournamentTeamMembershipKind" NOT NULL DEFAULT 'PRIMARY',
  ADD COLUMN IF NOT EXISTS "poachedFromTeamId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TournamentTeamPlayer_poachedFromTeamId_fkey'
  ) THEN
    ALTER TABLE "TournamentTeamPlayer"
      ADD CONSTRAINT "TournamentTeamPlayer_poachedFromTeamId_fkey"
      FOREIGN KEY ("poachedFromTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "TournamentTeamPlayer_poachedFromTeamId_idx" ON "TournamentTeamPlayer"("poachedFromTeamId");

DELETE FROM "TournamentTeamPlayer" a
USING "TournamentTeamPlayer" b
WHERE a."userId" IS NOT NULL
  AND a."userId" = b."userId"
  AND a."teamId" = b."teamId"
  AND a."id" < b."id";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TournamentTeamPlayer_teamId_userId_key'
  ) THEN
    ALTER TABLE "TournamentTeamPlayer"
      ADD CONSTRAINT "TournamentTeamPlayer_teamId_userId_key" UNIQUE ("teamId", "userId");
  END IF;
END
$$;
