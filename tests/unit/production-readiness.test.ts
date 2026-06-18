import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

describe("production readiness artifacts", () => {
  it("has CI workflow with unit tests", () => {
    const ci = readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("npm run test:unit");
    expect(ci).toContain("npm audit");
  });

  it("has production and ADR docs", () => {
    expect(existsSync(path.join(ROOT, "docs/PRODUCTION.md"))).toBe(true);
    expect(existsSync(path.join(ROOT, "docs/ADR-001-architecture.md"))).toBe(true);
  });

  it("has privacy page and account deletion API", () => {
    expect(existsSync(path.join(ROOT, "src/app/privacy/page.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/app/api/profile/account/route.ts"))).toBe(true);
  });

  it("has admin audit helper", () => {
    expect(existsSync(path.join(ROOT, "src/lib/admin-audit.ts"))).toBe(true);
  });
});
