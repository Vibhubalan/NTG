-- Drop the orphaned in-app auction tables from the abandoned "integrated auction"
-- experiment (commits c12abe5 / 7f34a8b). The auction now lives in the standalone
-- Auction-Arena app with its own auction_sessions/auction_teams/auction_players
-- tables (lowercase, unrelated) — nothing in this codebase reads these anymore.

DROP TABLE IF EXISTS "AuctionEvent" CASCADE;
DROP TABLE IF EXISTS "AuctionSale" CASCADE;
DROP TABLE IF EXISTS "AuctionPlayer" CASCADE;
DROP TABLE IF EXISTS "AuctionTeam" CASCADE;
DROP TABLE IF EXISTS "AuctionSession" CASCADE;

DROP TYPE IF EXISTS "AuctionSessionStatus";
DROP TYPE IF EXISTS "AuctionPlayerStatus";
