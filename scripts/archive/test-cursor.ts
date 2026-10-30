import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";

const ffmpegPath = ffmpegInstaller.path;

async function testCursor() {
  const tempDir = path.join(process.cwd(), "temp", "test_cursor");
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
  await page.waitForTimeout(1500);

  // Inject cursor
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.id = "demo-mouse-cursor";
    cursor.style.position = "fixed";
    cursor.style.top = "0px";
    cursor.style.left = "0px";
    cursor.style.width = "28px";
    cursor.style.height = "28px";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "99999999";
    cursor.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
    cursor.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <path d="M5.5 3.5L18.5 12L12 13.5L9 19.5L5.5 3.5Z" fill="#6366f1" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div id="demo-click-ripple" style="position:absolute; top:-6px; left:-6px; width:40px; height:40px; border-radius:50%; border:2px solid #818cf8; opacity:0; transform:scale(0.3); transition:all 0.35s ease-out; pointer-events:none;"></div>
    `;
    document.body.appendChild(cursor);
    (window as any).__moveCursor = (x: number, y: number) => {
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    };
    (window as any).__clickCursor = () => {
      const ripple = document.getElementById("demo-click-ripple");
      if (ripple) {
        ripple.style.opacity = "0.9";
        ripple.style.transform = "scale(1)";
        setTimeout(() => {
          ripple.style.opacity = "0";
          ripple.style.transform = "scale(0.3)";
        }, 350);
      }
    };
  });

  // Helper
  const moveTo = async (selector: string) => {
    const el = page.locator(selector).first();
    if (await el.isVisible()) {
      const box = await el.boundingBox();
      if (box) {
        await page.evaluate(({ x, y }) => (window as any).__moveCursor?.(x, y), {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
        });
        await page.waitForTimeout(500);
      }
    }
  };

  const clickOn = async (selector: string) => {
    await moveTo(selector);
    await page.evaluate(() => (window as any).__clickCursor?.());
    await page.waitForTimeout(150);
    const el = page.locator(selector).first();
    if (await el.isVisible()) {
      await el.click();
    }
  };

  // Move around elements
  await moveTo('a[href="/appointments"]');
  await page.waitForTimeout(600);
  await moveTo('a[href="/services"]');
  await page.waitForTimeout(600);
  await moveTo('a[href="/receptionist"]');
  await page.waitForTimeout(600);

  // Smooth scroll
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(1500);

  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter((f) => f.endsWith(".webm"));
  console.log("Cursor test recorded files:", files);
}

testCursor().catch(console.error);

