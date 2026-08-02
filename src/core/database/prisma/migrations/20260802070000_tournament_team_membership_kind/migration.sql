-- Team membership kind (PRIMARY / POACH) used by tournament stats scoping.

DO $$ BEGIN
  CREATE TYPE "TournamentTeamMembershipKind" AS ENUM ('PRIMARY', 'POACH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TournamentTeamPlayer"
  ADD COLUMN IF NOT EXISTS "membershipKind" "TournamentTeamMembershipKind" NOT NULL DEFAULT 'PRIMARY';

ALTER TABLE "TournamentTeamPlayer"
  ADD COLUMN IF NOT EXISTS "poachedFromTeamId" TEXT;

DO $$ BEGIN
  ALTER TABLE "TournamentTeamPlayer"
    ADD CONSTRAINT "TournamentTeamPlayer_poachedFromTeamId_fkey"
    FOREIGN KEY ("poachedFromTeamId") REFERENCES "TournamentTeam"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "TournamentTeamPlayer_poachedFromTeamId_idx"
  ON "TournamentTeamPlayer"("poachedFromTeamId");
