import { describe, expect, it, vi } from "vitest";

vi.mock("@core/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@core/database/client", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("@core/config/env.server", () => ({
  serverEnv: { databaseUrl: "postgresql://test" },
}));

import { guardResponse } from "@/lib/auth-guard";

describe("guardResponse", () => {
  it("returns null when authorized", () => {
    expect(guardResponse({ ok: true, session: { user: { id: "u1" } }, userId: "u1" })).toBeNull();
  });

  it("returns 401 JSON for missing session", async () => {
    const res = guardResponse({ ok: false, status: 401, error: "Unauthorized" });
    expect(res?.status).toBe(401);
    expect(await res?.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 JSON for non-admin", async () => {
    const res = guardResponse({ ok: false, status: 403, error: "Admin access required" });
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "Admin access required" });
  });
});
