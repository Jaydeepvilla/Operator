import { chromium } from "@playwright/test";
import * as path from "path";

export async function generateThumbnail(outputPath: string): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1920px;
            height: 1080px;
            background: radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.25) 0%, transparent 60%),
                        radial-gradient(circle at 10% 80%, rgba(147, 51, 234, 0.25) 0%, transparent 60%),
                        #090e1a;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 90px 120px;
            position: relative;
            overflow: hidden;
          }
          
          /* Ambient grid lines */
          .grid {
            position: absolute;
            inset: 0;
            background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 60px 60px;
            pointer-events: none;
          }

          .header {
            display: flex;
            align-items: center;
            gap: 20px;
            z-index: 10;
          }

          .logo-mark {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: linear-gradient(135deg, #6366f1, #9333ea);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 800;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.5);
          }

          .brand-title {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.02em;
          }

          .badge {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.4);
            color: #34d399;
            padding: 6px 16px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .badge-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #34d399;
            box-shadow: 0 0 10px #34d399;
          }

          .content {
            z-index: 10;
            max-width: 1300px;
          }

          .headline {
            font-size: 82px;
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: -0.04em;
            margin-bottom: 24px;
            background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .highlight {
            background: linear-gradient(135deg, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .subheadline {
            font-size: 30px;
            color: #94a3b8;
            line-height: 1.4;
            max-width: 1000px;
            margin-bottom: 40px;
          }

          .pills {
            display: flex;
            gap: 16px;
          }

          .pill {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            color: #e2e8f0;
            backdrop-filter: blur(12px);
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 30px;
            z-index: 10;
          }

          .footer-left {
            font-size: 18px;
            color: #64748b;
          }

          .footer-right {
            font-size: 18px;
            color: #818cf8;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="grid"></div>

        <div class="header">
          <div class="logo-mark">⚡</div>
          <div>
            <div class="brand-title">Operator AI Receptionist</div>
          </div>
          <div class="badge">
            <span class="badge-dot"></span>
            Official Client Demonstration
          </div>
        </div>

        <div class="content">
          <h1 class="headline">
            Never Miss Another Inquiry.<br />
            Meet <span class="highlight">Operator AI.</span>
          </h1>
          <p class="subheadline">
            Autonomous 24/7 customer receptionist that answers inquiries, verifies live availability, and books confirmed appointments into your business calendar.
          </p>
          <div class="pills">
            <div class="pill">✨ 24/7 Autonomous Booking</div>
            <div class="pill">📅 Real-Time Calendar Sync</div>
            <div class="pill">🎙️ Natural Voice & Web Concierge</div>
            <div class="pill">🏢 Operator Demo Salon Showcase</div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            Full-HD 1080p Product Demonstration • NexxTechnologies
          </div>
          <div class="footer-right">
            https://nexxtechnologies.com
          </div>
        </div>
      </body>
    </html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: outputPath });
  await browser.close();
}

