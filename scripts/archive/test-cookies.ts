import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function testCookies() {
  const browser = await chromium.launch({ headless: true });
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });

  const page = await context.newPage();
  console.log("Navigating to /dashboard...");
  const res = await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  console.log("/dashboard status:", res?.status());
  console.log("Final URL:", page.url());
  const title = await page.title();
  console.log("Title:", title);

  const shot = "temp/dash_shot.png";
  await page.screenshot({ path: shot });
  console.log("Screenshot size:", fs.statSync(shot).size);

  await browser.close();
}

testCookies().then(() => process.exit(0)).catch(console.error);
