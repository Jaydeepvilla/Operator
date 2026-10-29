import { chromium } from "@playwright/test";

async function debugOnboarding() {
  const browser = await chromium.launch({ headless: true });
  const authPath = "playwright/.auth/user.json";
  const context = await browser.newContext({
    storageState: authPath,
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/onboarding?demo=true&reset=true", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("Current URL:", page.url());
  const obUrl = await page.$("#ob-url");
  console.log("Found #ob-url:", !!obUrl);
  await page.waitForTimeout(2000);
  console.log("Current URL:", page.url());
  const body = await page.innerText("body");
  console.log("Body text snippet:", body.replace(/\s+/g, " ").substring(0, 300));

  await browser.close();
}

debugOnboarding().catch(console.error);
