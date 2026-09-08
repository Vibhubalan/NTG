-- Add DYNAMIC registration format (solo signup, admin groups into teams later).
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'DYNAMIC';
