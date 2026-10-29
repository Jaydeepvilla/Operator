import { chromium, Browser, BrowserContext } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { ClientDemoChapter } from "./chapters";

export class ClientDemoRecorder {
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

  async captureChapter(chapter: ClientDemoChapter, outputDir: string): Promise<string[]> {
    const page = await this.context.newPage();
    const framePaths: string[] = [];

    try {
      const url = `http://localhost:3000${chapter.route}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2500);

      // If chapter 12, render high-impact closing card
      if (chapter.chapterNumber === 12) {
        await page.evaluate(() => {
          const overlay = document.createElement("div");
          overlay.id = "closing-card-overlay";
          overlay.style.position = "fixed";
          overlay.style.inset = "0";
          overlay.style.zIndex = "9999999";
          overlay.style.background = "linear-gradient(135deg, #090e1a 0%, #111827 50%, #1e1b4b 100%)";
          overlay.style.display = "flex";
          overlay.style.flexDirection = "column";
          overlay.style.alignItems = "center";
          overlay.style.justifyContent = "center";
          overlay.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          overlay.style.color = "#ffffff";
          overlay.style.padding = "40px";
          overlay.style.textAlign = "center";

          overlay.innerHTML = `
            <div style="display:inline-flex; align-items:center; gap:10px; padding:8px 18px; border-radius:9999px; background:rgba(99, 102, 241, 0.15); border:1px solid rgba(139, 92, 246, 0.35); margin-bottom:24px;">
              <span style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;"></span>
              <span style="font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#c084fc;">AUTONOMOUS AI RECEPTIONIST</span>
            </div>
            
            <h1 style="font-size:56px; font-weight:800; letter-spacing:-0.03em; margin:0 0 16px 0; background:linear-gradient(to right, #ffffff, #cbd5e1); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
              Transform Your Business Operations
            </h1>
            
            <p style="font-size:22px; color:#94a3b8; max-width:800px; line-height:1.5; margin:0 0 36px 0;">
              Never miss a client enquiry. Automate bookings, capture every lead, and deliver 24/7 personalized customer care.
            </p>
            
            <div style="background:rgba(255, 255, 255, 0.04); border:1px solid rgba(255, 255, 255, 0.1); border-radius:20px; padding:28px 48px; backdrop-filter:blur(20px); box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.5); margin-bottom:32px;">
              <div style="font-size:14px; text-transform:uppercase; letter-spacing:0.12em; color:#818cf8; font-weight:700; margin-bottom:12px;">
                PARTNER WITH NEXXTECHNOLOGIES
              </div>
              <div style="font-size:30px; font-weight:700; color:#ffffff; margin-bottom:8px;">
                hello@nexxtechnologies.com
              </div>
              <div style="font-size:18px; color:#38bdf8; font-weight:600;">
                https://nexxtechnologies.com
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:24px; font-size:14px; color:#64748b;">
              <span>✓ 24/7 AI Receptionist</span>
              <span>•</span>
              <span>✓ Real-Time Calendar Sync</span>
              <span>•</span>
              <span>✓ Multichannel Intake</span>
              <span>•</span>
              <span>✓ Zero Missed Appointments</span>
            </div>
          `;
          document.body.appendChild(overlay);
        });
      } else {
        // Inject lower-third HUD banner for chapters 1-11
        await page.evaluate(({ num, title, subtitle }) => {
          const hud = document.createElement("div");
          hud.id = "operator-client-demo-hud";
          hud.style.position = "fixed";
          hud.style.bottom = "36px";
          hud.style.left = "44px";
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
                <span style="font-size:11px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:#c084fc;">OPERATOR AI • SCENE ${num}</span>
                <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
                <span style="font-size:11px; color:#10b981; font-weight:700; letter-spacing:0.04em;">CLIENT PRODUCT DEMO</span>
              </div>
              <div style="font-size:20px; font-weight:700; letter-spacing:-0.02em; color:#ffffff;">${title}</div>
              <div style="font-size:13px; color:#94a3b8; margin-top:2px;">${subtitle}</div>
            </div>
          `;
          document.body.appendChild(hud);
        }, { num: chapter.chapterNumber, title: chapter.title, subtitle: chapter.subtitle });
      }

      // Frame 1: Initial state
      const frame1Path = path.join(outputDir, `scene_${chapter.chapterNumber}_frame_1.png`);
      await page.screenshot({ path: frame1Path });
      framePaths.push(frame1Path);

      // Perform interactive setup actions
      if (chapter.setupActions) {
        await chapter.setupActions(page);
      }

      // Frame 2: Engaged / active state
      const frame2Path = path.join(outputDir, `scene_${chapter.chapterNumber}_frame_2.png`);
      await page.screenshot({ path: frame2Path });
      framePaths.push(frame2Path);

      return framePaths;
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
}
