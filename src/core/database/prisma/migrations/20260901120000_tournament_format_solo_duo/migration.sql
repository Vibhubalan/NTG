-- Add 1v1 / 2v2 registration formats (schema already lists SOLO + DUO; DB enum was AUCTION | STANDARD only).
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'SOLO';
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'DUO';
