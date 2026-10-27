import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function captureScreenshots(stage: "before" | "after") {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.join(process.cwd(), "docs", "audits", "screenshots", stage);
  fs.mkdirSync(outDir, { recursive: true });

  const authFile = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const context = await browser.newContext({
    storageState: fs.existsSync(authFile) ? authFile : undefined,
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const routes = [
    { url: "http://localhost:3033/dashboard", name: "dashboard" },
    { url: "http://localhost:3033/appointments", name: "appointments" },
    { url: "http://localhost:3033/voice", name: "voice" },
    { url: "http://localhost:3033/kb", name: "kb" },
    { url: "http://localhost:3033/inbox", name: "inbox" },
    { url: "http://localhost:3033/pricing", name: "pricing" },
    { url: "http://localhost:3033/checkout-demo", name: "checkout-demo" },
  ];

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(2000);
      const filePath = path.join(outDir, `${r.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot to ${filePath}`);
    } catch (err: any) {
      console.error(`Failed capturing ${r.name}:`, err.message);
    }
  }

  await browser.close();
}

const stage = (process.argv[2] as "before" | "after") || "before";
captureScreenshots(stage)
  .then(() => console.log(`Finished capturing ${stage} screenshots.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
