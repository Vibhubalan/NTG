-- AlterEnum: auction lifecycle statuses used by autoManageStatus schedule
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'AUCTION_OPEN';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'AUCTION_LIVE';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'AUCTION_COMPLETED';
