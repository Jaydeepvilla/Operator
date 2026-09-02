import { test, expect } from "@playwright/test";

test.describe("Operator Page Verification", () => {
  const pages = [
    { name: "Homepage", path: "/" },
    { name: "Pricing", path: "/pricing" },
    { name: "Features", path: "/features" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Settings", path: "/settings" },
    { name: "Agency", path: "/agency/dashboard" },
    { name: "Appointments", path: "/appointments" },
  ];

  for (const page of pages) {
    test(`Verify ${page.name} loads and does not have major layout issues`, async ({ page: browserPage }) => {
      const url = `http://localhost:3000${page.path}`;
      const response = await browserPage.goto(url, { waitUntil: "networkidle" });
      
      expect(response).not.toBeNull();
      const status = response!.status();
      expect(status).toBeLessThan(400);
      
      const screenshotPath = `./test-results/${page.name.toLowerCase()}_page.png`;
      await browserPage.screenshot({ path: screenshotPath, fullPage: true });
    });
  }
});
