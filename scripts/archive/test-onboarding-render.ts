import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function testRender() {
  const browser = await chromium.launch({ headless: true });
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });

  const page = await context.newPage();
  console.log("Navigating to http://localhost:3000/onboarding?demo=true ...");
  await page.goto("http://localhost:3000/onboarding?demo=true", { waitUntil: "domcontentloaded", timeout: 45000 });

  // Wait for the form element
  console.log("Waiting for input or button on onboarding page...");
  await page.waitForSelector("button, input", { state: "visible", timeout: 30000 });

  const shotPath = "temp/test_onboarding.png";
  await page.screenshot({ path: shotPath });
  console.log("Screenshot taken successfully! Size:", fs.statSync(shotPath).size, "bytes");

  await page.close();
  await context.close();
  await browser.close();
}

testRender().then(() => process.exit(0)).catch((err) => {
  console.error("Test render failed:", err);
  process.exit(1);
});

