import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleMsgs: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error" || msg.text().toLowerCase().includes("error")) {
      consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  const routes = ["/", "/pricing", "/about", "/contact", "/features", "/dashboard"];
  for (const r of routes) {
    console.log(`Checking ${r}...`);
    await page.goto(`http://localhost:3033${r}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
  }

  console.log("Recorded Console Errors:", consoleMsgs);
  await browser.close();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
