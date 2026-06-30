-- AlterEnum
ALTER TYPE "RegistrationParticipantRole" ADD VALUE 'CO_CAPTAIN';

-- AlterTable
ALTER TABLE "TournamentTeam" ADD COLUMN "coCaptainUserId" TEXT;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_coCaptainUserId_fkey" FOREIGN KEY ("coCaptainUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
