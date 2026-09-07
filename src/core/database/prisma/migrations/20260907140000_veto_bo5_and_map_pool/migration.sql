-- BO5 veto support, plus an admin-editable map pool per cup.

ALTER TYPE "VetoFormat" ADD VALUE IF NOT EXISTS 'BO5';

ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "vetoMapPool" JSONB;
