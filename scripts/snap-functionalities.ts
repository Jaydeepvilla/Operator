import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function snapPages() {
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });
  const page = await context.newPage();

  const outDir = path.join(process.cwd(), "temp", "functionality_snaps");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const routes = [
    { name: "01_dashboard", url: "http://localhost:3000/dashboard" },
    { name: "02_appointments", url: "http://localhost:3000/appointments" },
    { name: "03_inbox", url: "http://localhost:3000/inbox" },
    { name: "04_voice", url: "http://localhost:3000/voice/dashboard" },
    { name: "05_kb", url: "http://localhost:3000/kb" },
    { name: "06_services", url: "http://localhost:3000/services" },
    { name: "07_staff", url: "http://localhost:3000/staff" },
    { name: "08_widget", url: "http://localhost:3000/widget" },
    { name: "09_ai_settings", url: "http://localhost:3000/settings/ai" },
  ];

  for (const r of routes) {
    try {
      console.log("Navigating to", r.name, r.url);
      await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2500);
      const snapPath = path.join(outDir, `${r.name}.png`);
      await page.screenshot({ path: snapPath });
      const size = fs.statSync(snapPath).size;
      console.log(`Saved ${r.name}.png (${(size / 1024).toFixed(1)} KB)`);
    } catch (e: any) {
      console.error(`Failed ${r.name}:`, e.message);
    }
  }

  await browser.close();
}

snapPages().catch(console.error);

