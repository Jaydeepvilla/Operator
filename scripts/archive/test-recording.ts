import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";

const ffmpegPath = ffmpegInstaller.path;

async function test() {
  console.log("Testing Playwright recordVideo...");
  const tempDir = path.join(process.cwd(), "temp", "test_record");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: tempDir,
      size: { width: 1920, height: 1080 },
    },
    storageState: fs.existsSync(authPath) ? authPath : undefined,
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Smooth scroll
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(2000);

  // Close page to flush video
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded webm file
  const files = fs.readdirSync(tempDir).filter(f => f.endsWith(".webm"));
  console.log("Recorded video files:", files);

  if (files.length > 0) {
    const webmPath = path.join(tempDir, files[0]);
    const mp4Path = path.join(tempDir, "test.mp4");
    const cmd = `"${ffmpegPath}" -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -r 30 "${mp4Path}"`;
    execSync(cmd, { stdio: "pipe" });
    console.log("Converted to MP4 successfully! Size:", fs.statSync(mp4Path).size, "bytes");
  }
}

test().catch(console.error);

