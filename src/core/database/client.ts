import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Fail fast when the dev server was not restarted after a schema change.
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
