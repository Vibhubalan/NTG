-- Series length per cup stage, set in the admin Veto tab. NULL means the
-- defaults: group BO1, early playoffs BO1, semis BO3, final BO5.
ALTER TABLE "Tournament" ADD COLUMN "vetoFormats" JSONB;
