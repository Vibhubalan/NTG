-- Integrated auction tables (shared with standalone auction app)

DO $$ BEGIN
  CREATE TYPE "AuctionSessionStatus" AS ENUM ('IDLE', 'SHOWCASE', 'LIVE', 'PAUSED', 'COMPLETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuctionPlayerStatus" AS ENUM ('POOL', 'ON_AUCTION', 'SOLD', 'UNSOLD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RegistrationGameIntent" AS ENUM ('VALORANT', 'CS2', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TournamentRegistration" ADD COLUMN IF NOT EXISTS "gameIntent" "RegistrationGameIntent";
ALTER TABLE "TournamentRegistration" ADD COLUMN IF NOT EXISTS "snapshotRiotRegion" TEXT;
ALTER TABLE "TournamentRegistration" ADD COLUMN IF NOT EXISTS "snapshotAuctionFloor" INTEGER;

CREATE TABLE IF NOT EXISTS "AuctionSession" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "status" "AuctionSessionStatus" NOT NULL DEFAULT 'IDLE',
  "pass" INTEGER NOT NULL DEFAULT 1,
  "startingBudget" INTEGER NOT NULL DEFAULT 150,
  "rosterSize" INTEGER NOT NULL DEFAULT 3,
  "timerSeconds" INTEGER NOT NULL DEFAULT 15,
  "minBidIncrement" INTEGER NOT NULL DEFAULT 1,
  "rankTable" JSONB,
  "currentRegistrationId" TEXT,
  "currentPrice" INTEGER NOT NULL DEFAULT 0,
  "highestBidderTeamId" TEXT,
  "highestBidderName" TEXT,
  "timerEndsAt" TIMESTAMP(3),
  "pausedRemainingMs" INTEGER,
  "bidHistory" JSONB,
  "lastSaleId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuctionTeam" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "captainUserId" TEXT NOT NULL,
  "captainRegistrationId" TEXT NOT NULL,
  "startingBudget" INTEGER NOT NULL,
  "currentBudget" INTEGER NOT NULL,
  "coreDeduction" INTEGER NOT NULL DEFAULT 0,
  "slotsFilled" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuctionPlayer" (
  "sessionId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "floorPrice" INTEGER NOT NULL,
  "status" "AuctionPlayerStatus" NOT NULL DEFAULT 'POOL',
  "soldPrice" INTEGER,
  "teamId" TEXT,
  "soldAt" TIMESTAMP(3),
  "nominationOrder" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionPlayer_pkey" PRIMARY KEY ("sessionId","registrationId")
);

CREATE TABLE IF NOT EXISTS "AuctionSale" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "undoneAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuctionEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuctionSession_tournamentId_key" ON "AuctionSession"("tournamentId");
CREATE INDEX IF NOT EXISTS "AuctionSession_status_timerEndsAt_idx" ON "AuctionSession"("status", "timerEndsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AuctionTeam_sessionId_captainRegistrationId_key" ON "AuctionTeam"("sessionId", "captainRegistrationId");
CREATE INDEX IF NOT EXISTS "AuctionTeam_sessionId_idx" ON "AuctionTeam"("sessionId");
CREATE INDEX IF NOT EXISTS "AuctionPlayer_sessionId_status_idx" ON "AuctionPlayer"("sessionId", "status");
CREATE INDEX IF NOT EXISTS "AuctionPlayer_teamId_idx" ON "AuctionPlayer"("teamId");
CREATE INDEX IF NOT EXISTS "AuctionSale_sessionId_createdAt_idx" ON "AuctionSale"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuctionEvent_sessionId_createdAt_idx" ON "AuctionEvent"("sessionId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AuctionSession" ADD CONSTRAINT "AuctionSession_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSession" ADD CONSTRAINT "AuctionSession_currentRegistrationId_fkey" FOREIGN KEY ("currentRegistrationId") REFERENCES "TournamentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionTeam" ADD CONSTRAINT "AuctionTeam_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuctionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionTeam" ADD CONSTRAINT "AuctionTeam_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionTeam" ADD CONSTRAINT "AuctionTeam_captainRegistrationId_fkey" FOREIGN KEY ("captainRegistrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionPlayer" ADD CONSTRAINT "AuctionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuctionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionPlayer" ADD CONSTRAINT "AuctionPlayer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionPlayer" ADD CONSTRAINT "AuctionPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "AuctionTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuctionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "TournamentRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "AuctionTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionEvent" ADD CONSTRAINT "AuctionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuctionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSession" ADD CONSTRAINT "AuctionSession_highestBidderTeamId_fkey" FOREIGN KEY ("highestBidderTeamId") REFERENCES "AuctionTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSession" ADD CONSTRAINT "AuctionSession_lastSaleId_fkey" FOREIGN KEY ("lastSaleId") REFERENCES "AuctionSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AuctionSession" ADD CONSTRAINT "AuctionSession_lastSaleId_key" UNIQUE ("lastSaleId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
