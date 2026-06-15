import { test, expect } from "@playwright/test";

/**
 * End-to-end flows for the live production landing page (main branch only).
 * Does not cover feature-branch routes (/gallery, /signup, /esports, etc.).
 */

test.describe("Production landing user flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("navbar shows lounge branding and section links", async ({ page }) => {
    await expect(page.getByLabel("NTG Lounge home")).toBeVisible();
    const nav = page.locator("[data-site-nav]");
    await expect(nav.getByRole("link", { name: "Arena", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Games", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Trophies", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Visit", exact: true })).toBeVisible();
  });

  test("visitor can jump to tournament vault from nav", async ({ page }) => {
    await page.locator("[data-site-nav]").getByRole("link", { name: "Trophies", exact: true }).click();
    const vault = page.locator("#vault");
    await expect(vault).toBeInViewport();
    await expect(vault.getByText(/tournament vault/i)).toBeVisible();
  });

  test("visitor can jump to visit section from nav", async ({ page }) => {
    await page.locator("[data-site-nav]").getByRole("link", { name: "Visit", exact: true }).click();
    const visit = page.locator("#visit");
    await expect(visit).toBeInViewport();
  });

  test("footer shows lounge address", async ({ page }) => {
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByText(/Lotus Paradise Elite/i)).toBeVisible();
    await expect(footer.getByText(/Mangaluru, Karnataka 575003/i)).toBeVisible();
  });

  test("WhatsApp inquiry CTA opens external chat link", async ({ page }) => {
    const cta = page.getByRole("link", { name: /Inquire Now/i });
    await expect(cta).toHaveAttribute("href", /wa\.me|whatsapp/i);
    await expect(cta).toHaveAttribute("target", "_blank");
  });
});

test.describe("Production reviews API", () => {
  test("reviews endpoint returns a reviews array", async ({ request }) => {
    const res = await request.get("/api/reviews");
    expect(res.ok()).toBeTruthy();

    const body = (await res.json()) as { reviews: unknown[] };
    expect(Array.isArray(body.reviews)).toBeTruthy();
  });
});
