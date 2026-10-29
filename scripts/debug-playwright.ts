import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function debugNav() {
  const browser = await chromium.launch({ headless: true });
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });

  const page = await context.newPage();

  page.on("request", (req) => {
    if (req.resourceType() === "document") {
      console.log(`REQ [${req.method()}]: ${req.url()}`);
    }
  });

  page.on("response", (res) => {
    if (res.request().resourceType() === "document") {
      console.log(`RES [${res.status()}]: ${res.url()} -> ${res.headers()["location"] || ""}`);
    }
  });

  console.log("Navigating to http://localhost:3000/onboarding?demo=true ...");
  await page.goto("http://localhost:3000/onboarding?demo=true", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("Final Page URL:", page.url());

  const shot = "temp/debug_shot.png";
  await page.screenshot({ path: shot });
  console.log("Screenshot saved:", shot, fs.statSync(shot).size, "bytes");

  await page.close();
  await context.close();
  await browser.close();
}

debugNav().then(() => process.exit(0)).catch((e) => {
  console.error("DEBUG ERROR:", e);
  process.exit(1);
});

