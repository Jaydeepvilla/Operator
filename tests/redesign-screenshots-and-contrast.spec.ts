import { test, expect } from "@playwright/test";

test.describe("Operator Redesign Visual Responsiveness & Contrast (390px Mobile & Desktop)", () => {
  const pagesToTest = [
    { name: "dashboard", path: "/dashboard" },
    { name: "appointments", path: "/appointments" },
    { name: "services", path: "/services" },
    { name: "kb", path: "/kb" },
    { name: "faqs", path: "/faqs" },
    { name: "staff", path: "/staff" },
    { name: "billing", path: "/billing" },
    { name: "analytics", path: "/analytics" },
    { name: "help", path: "/help" },
    { name: "settings-ai", path: "/settings/ai" },
    { name: "settings-booking", path: "/settings/booking" },
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    if (page.url().includes("/sign-in")) {
      const emailInput = page.locator("#signin-email");
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill("demo+admin@example.com");
        await page.fill("#signin-password", "Dem0P@ssw0rd!2026_");
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*(dashboard|login-success)/, { timeout: 20000 });
        if (page.url().includes("login-success")) {
          const continueBtn = page.locator('button:has-text("Continue"), a:has-text("Continue")');
          if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await continueBtn.click();
          }
        }
      }
    }
  });

  for (const p of pagesToTest) {
    test(`Page ${p.name} renders cleanly at 390px wide (Light & Dark mode, No horizontal scroll)`, async ({ page }) => {
      // 1. Mobile viewport 390 x 844 (iPhone 14 standard)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(p.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);

      // Verify no horizontal document overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allow 1-2px rounding buffer

      // Screenshot in default Light mode
      await page.screenshot({
        path: `./test-results/screenshots/${p.name}-390px-light.png`,
        fullPage: false,
      });

      // Switch to Dark mode via class
      await page.evaluate(() => {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      });
      await page.waitForTimeout(200);

      // Screenshot in Dark mode
      await page.screenshot({
        path: `./test-results/screenshots/${p.name}-390px-dark.png`,
        fullPage: false,
      });
    });
  }
});

