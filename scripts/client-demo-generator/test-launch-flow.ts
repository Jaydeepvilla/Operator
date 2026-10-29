import { chromium } from "@playwright/test";

async function testLaunchFlow() {
  const authPath = "playwright/.auth/user.json";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authPath,
    viewport: { width: 1920, height: 1080 }
  });
  await context.addInitScript(() => {
    localStorage.clear();
  });
  const page = await context.newPage();

  console.log("Navigating to onboarding...");
  await page.goto("http://localhost:3000/onboarding?demo=true", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  console.log("URL:", page.url());
  console.log("Body text snippet:\n", (await page.innerText("body")).substring(0, 400));
  await page.click("button:has-text('Set Up Operator')");
  console.log("Waiting for verify screen...");
  await page.waitForSelector("#vfy-name", { timeout: 15000 });

  // Click Next to Services
  await page.click("button:has-text('Next')");
  await page.waitForTimeout(1000);

  // Click Next to Greeting
  await page.click("button:has-text('Next')");
  await page.waitForTimeout(1000);

  // Click Launch Operator
  console.log("Clicking Launch Operator...");
  await page.click("button:has-text('Launch Operator')");
  
  // Wait 4-5s for Launching screen to finish
  await page.waitForTimeout(5000);
  console.log("Current body after launch:\n", (await page.innerText("body")).substring(0, 300));

  await browser.close();
}

testLaunchFlow().catch(console.error);
