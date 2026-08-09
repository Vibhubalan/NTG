import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  if (process.env.NODE_ENV === "development") {
    // Surface which DB the process actually uses. Shell-exported DATABASE_URL
    // overrides .env.local and is a common cause of mixed prod/dev data.
    const raw = process.env.DATABASE_URL ?? "";
    const host =
      raw.match(/@([^/?]+)/)?.[1] ??
      (raw ? "(unparsed DATABASE_URL)" : "(no DATABASE_URL)");
    console.info(`[prisma] DATABASE host: ${host}`);
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Fail fast when the dev server was not restarted after a schema change.
  // Without this, pages crash deep inside queries with opaque "Unknown field" errors.
  if (
    process.env.NODE_ENV === "development" &&
    !("pendingSignup" in client)
  ) {
    throw new Error(
      "Prisma client is out of date (missing PendingSignup). Stop the dev server, run npm run db:generate, then npm run dev again.",
    );
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
