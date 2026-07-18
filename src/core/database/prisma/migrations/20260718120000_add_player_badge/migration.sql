CREATE TABLE "PlayerBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tournamentId" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedBy" TEXT,

    CONSTRAINT "PlayerBadge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerBadge_userId_idx" ON "PlayerBadge"("userId");

CREATE UNIQUE INDEX "PlayerBadge_userId_tournamentId_label_key" ON "PlayerBadge"("userId", "tournamentId", "label");

ALTER TABLE "PlayerBadge" ADD CONSTRAINT "PlayerBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge" ADD CONSTRAINT "PlayerBadge_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
