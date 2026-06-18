import { describe, expect, it } from "vitest";
import { getPath, smokeAvailable, SMOKE_BASE_URL } from "./helpers";

const online = await smokeAvailable();

describe.runIf(online)("Phase 5 — content & public pages", () => {
  it(`server reachable at ${SMOKE_BASE_URL}`, () => {
    expect(online).toBe(true);
  });

  it("homepage loads with tournament content", async () => {
    const { status, text } = await getPath("/");
    expect(status).toBe(200);
    expect(text).toMatch(/tournament|cup|Cup/i);
  });

  it("esports hub and gallery load", async () => {
    for (const path of ["/esports", "/gallery"]) {
      const { status } = await getPath(path);
      expect(status, path).toBe(200);
    }
  });

  it("tournament list includes FC26 cup", async () => {
    const { status, text } = await getPath("/esports/tournaments");
    expect(status).toBe(200);
    expect(text).toMatch(/fc26|FC26|FIFA/i);
  });

  it("FC26 tournament detail loads", async () => {
    const { status } = await getPath("/esports/tournaments/fc26-cup-1");
    expect(status).toBe(200);
  });

  it("tournament API returns DB slug", async () => {
    const { status, body } = await getPath("/api/tournaments/fc26-cup-1");
    expect(status).toBe(200);
    expect((body as { tournament?: { slug?: string } }).tournament?.slug).toBe("fc26-cup-1");
  });

  it("login and signup pages load", async () => {
    for (const path of ["/login", "/signup"]) {
      const { status } = await getPath(path);
      expect(status, path).toBe(200);
    }
  });
});

describe.skipIf(online)("Phase 5 — content & public pages (offline)", () => {
  it("skipped — start dev server: npm run dev", () => {});
});
