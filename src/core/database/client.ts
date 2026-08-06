import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRecover: Promise<void> | null | undefined;
};

function isRetryableConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "P1017" || e.code === "P1001" || e.code === "P1002") return true;
  const msg = e.message ?? "";
  return (
    /Server has closed the connection/i.test(msg) ||
    /Engine is not yet connected/i.test(msg) ||
    /Connection reset/i.test(msg) ||
    /Can't reach database server/i.test(msg) ||
    /Connection terminated/i.test(msg)
  );
}

/**
 * Single-flight soft reconnect for the shared Prisma singleton.
 * Do not $disconnect() here — that races parallel RSC queries and surfaces
 * "Engine is not yet connected" on the rest of the cup page.
 */
function recoverConnection(base: PrismaClient): Promise<void> {
  if (!globalForPrisma.prismaRecover) {
    globalForPrisma.prismaRecover = (async () => {
      try {
        await base.$connect();
      } finally {
        globalForPrisma.prismaRecover = null;
      }
    })();
  }
  return globalForPrisma.prismaRecover;
}

function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Supabase / PgBouncer idle sockets get reset (esp. long-lived `npm run dev`).
  // Soft reconnect + one retry avoids cup-page 500s without racing other queries.
  const client = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isRetryableConnectionError(error)) throw error;
          await recoverConnection(base);
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
