import { chromium } from "@playwright/test";

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to forgot-password...");
  await page.goto("http://localhost:3000/forgot-password", { waitUntil: "networkidle" });
  
  await page.waitForTimeout(1000);
  console.log("Typing email...");
  await page.focus("#forgot-email");
  await page.keyboard.type("jaydeep.chandegara94@gmail.com", { delay: 50 });

  console.log("Clicking submit...");
  await page.click("button[type='submit']");

  console.log("Waiting 6s...");
  await page.waitForTimeout(6000);

  const text = await page.innerText("body");
  console.log("Body text snippet:\n", text.replace(/\s+/g, " ").substring(0, 400));

  await browser.close();
}

check().catch(console.error);

