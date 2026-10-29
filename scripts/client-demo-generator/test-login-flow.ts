import { chromium } from "@playwright/test";

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto("http://localhost:3000/sign-in", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  await page.fill("#signin-email", "jaydeep.chandegara94@gmail.com");
  await page.fill("#signin-password", "SecureOperator2026!");
  await page.click("button[type='submit']");
  console.log("Waiting 7s...");
  await page.waitForTimeout(7000);
  console.log("URL:", page.url());
  const errorBanner = await page.$("[role='alert'], .text-state-error-text, [data-error]");
  if (errorBanner) {
    console.log("Found error element text:", await errorBanner.innerText());
  }
  const btn = await page.$("button[type='submit']");
  if (btn) {
    console.log("Submit button text:", await btn.innerText());
  }

  await browser.close();
}

testLogin().catch(console.error);
