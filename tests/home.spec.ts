import { test, expect } from "@playwright/test";

test.describe("Production homepage", () => {
  test("homepage loads with correct title", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/NTG Lounge/i);
    await expect(page).toHaveTitle(/Namma Tulunad Gaming/i);
  });

  test("hero and brand content are visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Namma Tulunad/i })).toBeVisible();
    await expect(page.locator("#top").getByText("Gaming", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Inquire Now/i }),
    ).toBeVisible();
  });
});
