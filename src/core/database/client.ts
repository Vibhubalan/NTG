import { PrismaClient } from "@prisma/client";
import {
  isRetryablePrismaError,
  withPrismaPoolerParams,
} from "./transient-error";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const RETRY_DELAYS_MS = [200, 400];

function withConnectionRetry(client: PrismaClient): PrismaClient {
  let connecting: Promise<void> | null = null;

  async function ensureEngine() {
    if (!connecting) {
      connecting = client.$connect().finally(() => {
        connecting = null;
      });
    }
    await connecting;
  }

  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;
        const attempts = RETRY_DELAYS_MS.length + 1;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          try {
            if (attempt > 0) await ensureEngine();
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isRetryablePrismaError(error) || attempt === attempts - 1) {
              throw error;
            }
            console.warn(
              `[prisma] retrying after a dropped database connection (attempt ${attempt + 1})`,
            );
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAYS_MS[attempt] ?? 400),
            );
          }
        }
        throw lastError;
      },
    },
  }) as unknown as PrismaClient;
}

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

  const databaseUrl = process.env.DATABASE_URL
    ? withPrismaPoolerParams(process.env.DATABASE_URL)
    : undefined;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
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

  return withConnectionRetry(client);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
