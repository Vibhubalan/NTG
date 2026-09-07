-- Map veto fixtures. Rows are created on demand when someone starts a veto for
-- a Challonge bracket match; there is no fixture sync.

CREATE TYPE "VetoFormat" AS ENUM ('BO1', 'BO3');
CREATE TYPE "VetoStatus" AS ENUM ('VETO_LIVE', 'VETO_COMPLETE');

CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "challongeMatchId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "format" "VetoFormat" NOT NULL DEFAULT 'BO1',
    "status" "VetoStatus" NOT NULL DEFAULT 'VETO_LIVE',
    "vetoResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentMatch_tournamentId_challongeMatchId_key"
    ON "TournamentMatch"("tournamentId", "challongeMatchId");

CREATE INDEX "TournamentMatch_tournamentId_status_idx"
    ON "TournamentMatch"("tournamentId", "status");

ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_teamAId_fkey"
    FOREIGN KEY ("teamAId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_teamBId_fkey"
    FOREIGN KEY ("teamBId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Match the deny-all RLS posture applied to every other table: Prisma (owner)
-- bypasses it, PostgREST anon/authenticated get nothing.
ALTER TABLE "TournamentMatch" ENABLE ROW LEVEL SECURITY;
