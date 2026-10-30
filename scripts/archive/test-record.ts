import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function testVideo() {
  const videoDir = path.join(process.cwd(), "temp", "test-video");
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  console.log("Navigating to homepage...");
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log("Homepage loaded!");

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    console.log("Video saved at:", videoPath, fs.statSync(videoPath).size, "bytes");
  }
}

testVideo()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

