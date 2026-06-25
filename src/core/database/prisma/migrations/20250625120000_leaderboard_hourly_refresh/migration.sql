-- AlterEnum
ALTER TYPE "LeaderboardSyncSource" ADD VALUE 'HOURLY_CRON';

-- CreateEnum
CREATE TYPE "LeaderboardRefreshRunStatus" AS ENUM ('RUNNING', 'COMPLETE', 'ERROR', 'SKIPPED');

-- CreateTable
CREATE TABLE "LeaderboardRefreshRun" (
    "id" TEXT NOT NULL,
    "status" "LeaderboardRefreshRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "henrikRequestCount" INTEGER NOT NULL DEFAULT 0,
    "cursorUserId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardRefreshRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderboardRefreshRun_status_startedAt_idx" ON "LeaderboardRefreshRun"("status", "startedAt");
