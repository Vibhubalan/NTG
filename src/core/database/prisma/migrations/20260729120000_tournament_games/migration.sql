-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TournamentGameStatus" AS ENUM ('CANDIDATE', 'PUBLISHED', 'HIDDEN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TournamentGameSide" AS ENUM ('Red', 'Blue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TournamentGame" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "henrikMatchId" TEXT NOT NULL,
    "mapName" TEXT,
    "gameLengthSec" INTEGER,
    "startedAt" TIMESTAMP(3),
    "region" TEXT,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "teamARounds" INTEGER NOT NULL DEFAULT 0,
    "teamBRounds" INTEGER NOT NULL DEFAULT 0,
    "winnerSide" "TournamentGameSide",
    "teamAPresent" INTEGER NOT NULL DEFAULT 0,
    "teamBPresent" INTEGER NOT NULL DEFAULT 0,
    "status" "TournamentGameStatus" NOT NULL DEFAULT 'CANDIDATE',
    "payloadJson" JSONB,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TournamentGamePlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "riotGameName" TEXT NOT NULL,
    "riotTagLine" TEXT NOT NULL,
    "side" "TournamentGameSide" NOT NULL,
    "agent" TEXT,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "headshots" INTEGER NOT NULL DEFAULT 0,
    "bodyshots" INTEGER NOT NULL DEFAULT 0,
    "legshots" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TournamentGamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentGame_tournamentId_henrikMatchId_key" ON "TournamentGame"("tournamentId", "henrikMatchId");
CREATE INDEX IF NOT EXISTS "TournamentGame_tournamentId_status_idx" ON "TournamentGame"("tournamentId", "status");
CREATE INDEX IF NOT EXISTS "TournamentGame_teamAId_idx" ON "TournamentGame"("teamAId");
CREATE INDEX IF NOT EXISTS "TournamentGame_teamBId_idx" ON "TournamentGame"("teamBId");
CREATE INDEX IF NOT EXISTS "TournamentGamePlayer_gameId_idx" ON "TournamentGamePlayer"("gameId");
CREATE INDEX IF NOT EXISTS "TournamentGamePlayer_puuid_idx" ON "TournamentGamePlayer"("puuid");
CREATE INDEX IF NOT EXISTS "TournamentGamePlayer_userId_idx" ON "TournamentGamePlayer"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentGamePlayer_gameId_puuid_key" ON "TournamentGamePlayer"("gameId", "puuid");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TournamentGamePlayer" ADD CONSTRAINT "TournamentGamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "TournamentGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TournamentGamePlayer" ADD CONSTRAINT "TournamentGamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
