import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("Navigating to forgot-password...");
  await page.goto("http://localhost:3000/forgot-password", { waitUntil: "domcontentloaded" });
  await page.fill("#forgot-email", "jaydeep.chandegara94@gmail.com");
  await page.click("button[type='submit']");
  console.log("Clicked submit on forgot-password, waiting for Check your inbox...");
  await page.waitForSelector("h2:has-text('Check your inbox')", { timeout: 15000 });
  console.log("SUCCESS! 'Check your inbox' heading is visible!");
  const text = await page.innerText("body");
  console.log("Forgot password body text:", text.replace(/\s+/g, " ").substring(0, 300));

  console.log("\nNavigating to dashboard with auth...");
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const authContext = await browser.newContext({
    storageState: fs.existsSync(authPath) ? authPath : undefined,
    viewport: { width: 1920, height: 1080 }
  });
  const dash = await authContext.newPage();
  await dash.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
  await dash.waitForTimeout(2000);
  console.log("Dashboard title:", await dash.title());
  console.log("Dashboard url:", dash.url());
  const dashText = await dash.innerText("body");
  console.log("Dashboard snippet:", dashText.replace(/\s+/g, " ").substring(0, 300));

  await browser.close();
}

check().catch(console.error);
