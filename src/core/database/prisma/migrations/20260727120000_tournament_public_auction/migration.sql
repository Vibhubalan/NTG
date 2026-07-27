-- Persist admin toggle for public "Enter Live Auction" visibility (used with auto-manage override).
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "publicAuction" BOOLEAN NOT NULL DEFAULT false;
