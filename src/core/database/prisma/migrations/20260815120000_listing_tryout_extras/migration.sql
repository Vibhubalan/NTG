-- Optional tryout extras: past experience + resume.
ALTER TABLE "ListingApplication" ADD COLUMN IF NOT EXISTS "pastExperience" TEXT;
ALTER TABLE "ListingApplication" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT;
