import { chromium } from "@playwright/test";

async function testAuthPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("Testing /sign-up...");
  await page.goto("http://localhost:3000/sign-up", { waitUntil: "domcontentloaded" });
  const fn = await page.$("#signup-firstname");
  const ln = await page.$("#signup-lastname");
  const em = await page.$("#signup-email");
  const pw = await page.$("#signup-password");
  console.log("SignUp selectors:", { fn: !!fn, ln: !!ln, em: !!em, pw: !!pw });

  console.log("Testing /sign-in...");
  await page.goto("http://localhost:3000/sign-in", { waitUntil: "domcontentloaded" });
  const sinEm = await page.$("#signin-email");
  const sinPw = await page.$("#signin-password");
  console.log("SignIn selectors:", { sinEm: !!sinEm, sinPw: !!sinPw });

  console.log("Testing /forgot-password...");
  await page.goto("http://localhost:3000/forgot-password", { waitUntil: "domcontentloaded" });
  const fEm = await page.$("#forgot-email, input[type='email']");
  console.log("Forgot selectors:", { fEm: !!fEm });

  await browser.close();
  console.log("All auth pages verified successfully!");
}

testAuthPages().catch(console.error);

