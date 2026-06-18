import { describe, expect, it } from "vitest";
import { expectLoginRedirect, getPath, smokeAvailable, SMOKE_BASE_URL } from "./helpers";

const online = await smokeAvailable();

describe.runIf(online)("Phase 6 — route protection & mobile-ready pages", () => {
  it(`server reachable at ${SMOKE_BASE_URL}`, () => {
    expect(online).toBe(true);
  });

  describe("admin pages redirect unauthenticated users", () => {
    it("blocks /admin", async () => {
      const { status, location } = await getPath("/admin");
      expectLoginRedirect(status, location, "/admin");
    });

    it("blocks admin sub-routes", async () => {
      for (const path of ["/admin/tournaments", "/admin/members", "/admin/moments"]) {
        const { status, location } = await getPath(path);
        expectLoginRedirect(status, location, "/admin");
      }
    });
  });

  it("profile redirects to login", async () => {
    const { status, location } = await getPath("/profile");
    expectLoginRedirect(status, location, "/profile");
  });

  describe("protected APIs return 401 without session", () => {
    it("admin APIs", async () => {
      for (const path of ["/api/admin/me", "/api/admin/tournaments"]) {
        const { status, body } = await getPath(path);
        expect(status, path).toBe(401);
        expect((body as { error?: string }).error).toBe("Unauthorized");
      }
    });

    it("profile and registration APIs", async () => {
      const profile = await getPath("/api/profile/game-profile");
      expect(profile.status).toBe(401);

      const reg = await fetch(`${SMOKE_BASE_URL}/api/tournaments/fc26-cup-1/register`, {
        method: "POST",
        redirect: "manual",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      expect(reg.status).toBe(401);
    });

    it("admin write APIs", async () => {
      const upload = await fetch(`${SMOKE_BASE_URL}/api/admin/upload`, {
        method: "POST",
        redirect: "manual",
      });
      expect(upload.status).toBe(401);

      const patch = await fetch(`${SMOKE_BASE_URL}/api/admin/tournaments/fc26-cup-1`, {
        method: "PATCH",
        redirect: "manual",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      expect(patch.status).toBe(401);
    });
  });

  describe("mobile viewport meta present", () => {
    it("key pages include viewport meta", async () => {
      for (const path of ["/", "/esports", "/login", "/signup", "/esports/tournaments"]) {
        const { text } = await getPath(path);
        expect(text, path).toMatch(/name=["']viewport["']/i);
      }
    });
  });

  it("admin-access-denied page loads for direct visit", async () => {
    const { status } = await getPath("/admin-access-denied");
    expect(status).toBe(200);
  });
});

describe.skipIf(online)("Phase 6 — route protection (offline)", () => {
  it("skipped — start dev server: npm run dev", () => {});
});
