import { prisma } from "@core/database/client";
import { isMissingListingApplicationExtrasColumn } from "../domain/listing-application-extras";

let ensured = false;

/** Additive only — never drops or rewrites existing listing application rows. */
export async function ensureListingApplicationExtraColumns(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ListingApplication" ADD COLUMN IF NOT EXISTS "pastExperience" TEXT`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ListingApplication" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT`,
  );
  ensured = true;
}

export async function withListingApplicationExtras<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isMissingListingApplicationExtrasColumn(error)) throw error;
    await ensureListingApplicationExtraColumns();
    return run();
  }
}
