-- AlterEnum
ALTER TYPE "GameSlug" ADD VALUE 'CLASH_ROYALE';

ALTER TYPE "UserActivityAction" ADD VALUE 'CLASH_ROYALE_LINK';
ALTER TYPE "UserActivityAction" ADD VALUE 'CLASH_ROYALE_UNLINK';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clashRoyaleTag" TEXT,
ADD COLUMN "clashRoyaleName" TEXT,
ADD COLUMN "clashRoyaleLinkedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_clashRoyaleTag_key" ON "User"("clashRoyaleTag");
