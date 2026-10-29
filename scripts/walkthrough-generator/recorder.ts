import { chromium, Browser, BrowserContext } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { ChapterDefinition } from "./chapters";

export class WalkthroughRecorder {
  private browser!: Browser;
  private context!: BrowserContext;

  async init() {
    this.browser = await chromium.launch({ headless: true });
    const authPath = path.join(process.cwd(), "playwright", ".auth", "user.json");
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: fs.existsSync(authPath) ? authPath : undefined,
      deviceScaleFactor: 1,
    });
  }

  async captureChapter(chapter: ChapterDefinition, outputDir: string): Promise<string[]> {
    const page = await this.context.newPage();
    const framePaths: string[] = [];

    try {
      const url = `http://localhost:3000${chapter.route}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 35000 });

      // Inject lower-third HUD banner
      await page.evaluate(({ num, title, subtitle }) => {
        const hud = document.createElement("div");
        hud.id = "operator-walkthrough-hud";
        hud.style.position = "fixed";
        hud.style.bottom = "40px";
        hud.style.left = "48px";
        hud.style.zIndex = "999999";
        hud.style.background = "rgba(9, 14, 26, 0.94)";
        hud.style.backdropFilter = "blur(18px)";
        hud.style.border = "1px solid rgba(139, 92, 246, 0.4)";
        hud.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(139, 92, 246, 0.25)";
        hud.style.borderRadius = "14px";
        hud.style.padding = "16px 26px";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.gap = "20px";
        hud.style.fontFamily = "system-ui, -apple-system, sans-serif";
        hud.style.color = "#ffffff";
        hud.style.maxWidth = "850px";

        hud.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:12px; background:linear-gradient(135deg, #6366f1, #9333ea); font-weight:800; font-size:22px; color:#fff; box-shadow:0 4px 16px rgba(99, 102, 241, 0.45);">
            ${num}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
              <span style="font-size:11px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:#c084fc;">OPERATOR AI • CHAPTER ${num}</span>
              <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
              <span style="font-size:11px; color:#10b981; font-weight:700; letter-spacing:0.04em;">AUTONOMOUS OPERATING SYSTEM</span>
            </div>
            <div style="font-size:20px; font-weight:700; letter-spacing:-0.02em; color:#ffffff;">${title}</div>
            <div style="font-size:13px; color:#94a3b8; margin-top:2px;">${subtitle}</div>
          </div>
        `;
        document.body.appendChild(hud);
      }, { num: chapter.chapterNumber, title: chapter.title, subtitle: chapter.subtitle });

      // Frame 1: Initial view
      const frame1Path = path.join(outputDir, `ch_${chapter.chapterNumber}_frame_1.png`);
      await page.screenshot({ path: frame1Path });
      framePaths.push(frame1Path);

      // Setup actions
      if (chapter.setupActions) {
        await chapter.setupActions(page);
      }

      // Frame 2: Engaged/scrolled view
      const frame2Path = path.join(outputDir, `ch_${chapter.chapterNumber}_frame_2.png`);
      await page.screenshot({ path: frame2Path });
      framePaths.push(frame2Path);

    } finally {
      await page.close();
    }

    return framePaths;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

