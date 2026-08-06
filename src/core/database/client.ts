import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function isTransientConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "P1017" || e.code === "P1001" || e.code === "P1002") return true;
  const msg = e.message ?? "";
  return (
    /Server has closed the connection/i.test(msg) ||
    /Connection reset/i.test(msg) ||
    /Can't reach database server/i.test(msg) ||
    /Connection terminated/i.test(msg)
  );
}

function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Supabase / PgBouncer idle sockets get reset (esp. long-lived `npm run dev`).
  // One reconnect + retry avoids turning a pooler blip into a cup-page 500.
  const client = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isTransientConnectionError(error)) throw error;
          try {
            await base.$disconnect();
          } catch {
            // ignore disconnect races
          }
          await base.$connect();
          return query(args);
        }
      },
    },
  }) as unknown as PrismaClient;

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
