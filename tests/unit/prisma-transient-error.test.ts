import { describe, expect, it } from "vitest";
import {
  isRetryablePrismaError,
  isTransientPrismaConnectionError,
  withPrismaPoolerParams,
} from "@/core/database/transient-error";

describe("isTransientPrismaConnectionError", () => {
  it("matches Prisma connection codes", () => {
    expect(isTransientPrismaConnectionError({ code: "P1001" })).toBe(true);
    expect(isTransientPrismaConnectionError({ code: "P1017" })).toBe(true);
    expect(isTransientPrismaConnectionError({ code: "P2024" })).toBe(true);
  });

  it("matches the overlay message from a dropped pooler connection", () => {
    expect(
      isTransientPrismaConnectionError({
        name: "PrismaClientKnownRequestError",
        message:
          "Can't reach database server at `aws-0-ap-southeast-2.pooler.supabase.com:6543`",
      }),
    ).toBe(true);
  });

  it("matches PrismaClientInitializationError pool timeouts", () => {
    expect(
      isTransientPrismaConnectionError({
        name: "PrismaClientInitializationError",
        errorCode: "P2024",
        message:
          "Timed out fetching a new connection from the connection pool. (Current connection pool timeout: 10, connection limit: 1)",
      }),
    ).toBe(true);
  });

  it("does not treat unique conflicts as connection errors", () => {
    expect(isTransientPrismaConnectionError({ code: "P2002" })).toBe(false);
    expect(isTransientPrismaConnectionError({ message: "Unknown arg" })).toBe(
      false,
    );
    expect(isTransientPrismaConnectionError(null)).toBe(false);
  });

  it("retries Prisma query-engine crashes from Turbopack HMR", () => {
    expect(
      isTransientPrismaConnectionError({
        name: "PrismaClientUnknownRequestError",
        message: "Response from the Engine was empty",
      }),
    ).toBe(true);
    expect(
      isTransientPrismaConnectionError({
        name: "PrismaClientUnknownRequestError",
        message:
          "Invalid `prisma.platformSetting.findUnique()` invocation in\nEngine is not yet connected.",
      }),
    ).toBe(true);
    expect(
      isTransientPrismaConnectionError({
        name: "PrismaClientRustPanicError",
        message: "Response from the Engine was empty",
      }),
    ).toBe(true);
  });

  it("does not retry pool timeouts (they starve the rest of the app)", () => {
    expect(
      isRetryablePrismaError({
        name: "PrismaClientInitializationError",
        errorCode: "P2024",
        message:
          "Timed out fetching a new connection from the connection pool. (Current connection pool timeout: 10, connection limit: 1)",
      }),
    ).toBe(false);
    expect(isRetryablePrismaError({ code: "P2024" })).toBe(false);
  });

  it("retries dropped sockets and query-engine crashes, not unique conflicts", () => {
    expect(isRetryablePrismaError({ code: "P1001" })).toBe(true);
    expect(
      isRetryablePrismaError({
        name: "PrismaClientUnknownRequestError",
        message: "Response from the Engine was empty",
      }),
    ).toBe(true);
    expect(isRetryablePrismaError({ code: "P2002" })).toBe(false);
  });

  it("adds pooler-safe Prisma params without dropping existing query flags", () => {
    const withPg = withPrismaPoolerParams(
      "postgresql://u:p@host:6543/postgres?pgbouncer=true",
    );
    expect(withPg).toContain("pgbouncer=true");
    expect(withPg).toContain("connect_timeout=10");
    expect(withPg).toContain("connection_limit=8");
    expect(withPg).toContain("pool_timeout=10");
    expect(
      withPrismaPoolerParams(
        "postgresql://u:p@host:6543/postgres?pgbouncer=true&connect_timeout=5&connection_limit=3&pool_timeout=8",
      ),
    ).toBe(
      "postgresql://u:p@host:6543/postgres?pgbouncer=true&connect_timeout=5&connection_limit=3&pool_timeout=8",
    );
  });

  it("adds pgbouncer=true for transaction pooler URLs that omitted it", () => {
    expect(
      withPrismaPoolerParams("postgresql://u:p@db.pooler.supabase.com:6543/postgres"),
    ).toContain("pgbouncer=true");
    expect(
      withPrismaPoolerParams(
        "postgresql://u:p@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require",
      ),
    ).toContain("pgbouncer=true");
  });
});
