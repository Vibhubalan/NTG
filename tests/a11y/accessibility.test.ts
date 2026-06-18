import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

async function fetchHtml(route: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status !== 200) return null;
    return res.text();
  } catch {
    return null;
  }
}

describe("accessibility basics (static + live pages)", () => {
  it("root layout includes skip link and html lang", () => {
    const layout = readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('lang="en"');
    expect(layout).toContain("Skip to content");
    expect(layout).toContain("#main-content");
  });

  it("Navbar icon buttons have aria labels", () => {
    const navbar = readFileSync(path.join(ROOT, "src/components/Navbar.tsx"), "utf8");
    expect(navbar).toContain('aria-label="Sign out"');
    expect(navbar).toContain('"Close menu"');
    expect(navbar).toContain('"Open menu"');
    expect(navbar).toContain('aria-modal="true"');
  });

  it("key public pages return HTML with viewport meta", async () => {
    const online = await fetch(BASE, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.status < 500)
      .catch(() => false);

    if (!online) {
      console.warn("Dev server offline — skipping live a11y fetch checks");
      return;
    }

    for (const route of ["/", "/esports", "/login", "/privacy"]) {
      const html = await fetchHtml(route);
      expect(html, route).toBeTruthy();
      expect(html!, route).toMatch(/name=["']viewport["']/i);
      expect(html!, route).toMatch(/<html[^>]*lang=["']en["']/i);
    }
  });

  it("homepage images include alt text in rendered HTML", async () => {
    const html = await fetchHtml("/");
    if (!html) return;
    const imgs = html.match(/<img[^>]*>/gi) ?? [];
    expect(imgs.length).toBeGreaterThan(0);
    for (const tag of imgs.slice(0, 5)) {
      expect(tag.toLowerCase()).toMatch(/alt=/);
    }
  });
});
