import { chromium } from "@playwright/test";

async function testOnboardingFlow() {
  const browser = await chromium.launch({ headless: true });
  const authPath = "playwright/.auth/user.json";
  const context = await browser.newContext({
    storageState: authPath,
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log("1. Navigating to /onboarding?demo=true...");
  await page.goto("http://localhost:3000/onboarding?demo=true", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Check if we are on URL screen or verify screen
  const urlInput = await page.$("#ob-url");
  console.log("URL input found:", !!urlInput);

  if (urlInput) {
    console.log("Filling website URL...");
    await page.fill("#ob-url", "operatordemosalon.com");
    await page.click("button:has-text('Set Up Operator')");
    console.log("Clicked Set Up Operator, waiting for AI console to complete...");
    await page.waitForSelector("#vfy-name", { timeout: 15000 });
    console.log("SUCCESS! Verify screen loaded!");
  }

  // Check if verify screen is active
  const vfyName = await page.$("#vfy-name");
  console.log("Verify Business Name input found:", !!vfyName);

  if (vfyName) {
    const val = await vfyName.inputValue();
    console.log("Current Business Name:", val);

    // Click Next to go to services
    const nextBtn = await page.$("button:has-text('Next')");
    console.log("Next button found:", !!nextBtn);
    if (nextBtn) {
      await nextBtn.click();
      console.log("Clicked Next to Services!");
      await page.waitForTimeout(1500);

      // Check Services screen
      const addServiceBtn = await page.$("button:has-text('Add a service')");
      console.log("Add a service button found:", !!addServiceBtn);

      if (addServiceBtn) {
        await addServiceBtn.click();
        await page.waitForTimeout(500);
        await page.fill("input[placeholder*='Service name']", "Express Blowout");
        await page.click("button:has-text('Add Service')");
        console.log("Added Express Blowout service!");
        await page.waitForTimeout(1000);
      }

      // Click Next to Greeting
      const nextToGreetingBtn = await page.$("button:has-text('Next')");
      if (nextToGreetingBtn) {
        await nextToGreetingBtn.click();
        console.log("Clicked Next to Greeting!");
        await page.waitForTimeout(1500);

        const greetingText = await page.$("#vfy-greeting");
        console.log("Greeting textarea found:", !!greetingText);

        const launchBtn = await page.$("button:has-text('Launch Operator')");
        console.log("Launch Operator button found:", !!launchBtn);
      }
    }
  }

  await browser.close();
  console.log("Onboarding flow test completed!");
}

testOnboardingFlow().catch(console.error);
