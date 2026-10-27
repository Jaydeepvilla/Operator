import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { BRAND_CONFIG } from "../src/lib/constants/brand";

test.describe("Production Domain Migration & Zero-Legacy Reference Suite", () => {
  const rootDir = process.cwd();

  test("CANONICAL-001: .env.production specifies operator.nexxtechnologies.com", () => {
    const envProdPath = path.join(rootDir, ".env.production");
    expect(fs.existsSync(envProdPath)).toBe(true);

    const content = fs.readFileSync(envProdPath, "utf-8");
    expect(content).toContain('NEXT_PUBLIC_APP_URL="https://operator.nexxtechnologies.com"');
    expect(content).not.toContain("apps.nexxtechnologies.com");
    expect(content).not.toContain("apps.nexxtechnolgoies.com");
  });

  test("CANONICAL-002: robots.txt and sitemap.xml point to operator.nexxtechnologies.com", () => {
    const robotsPath = path.join(rootDir, "public", "robots.txt");
    const sitemapPath = path.join(rootDir, "public", "sitemap.xml");

    expect(fs.existsSync(robotsPath)).toBe(true);
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const robots = fs.readFileSync(robotsPath, "utf-8");
    expect(robots).toContain("Host: https://operator.nexxtechnologies.com");
    expect(robots).toContain("Sitemap: https://operator.nexxtechnologies.com/sitemap.xml");
    expect(robots).not.toContain("apps.nexxtechnologies.com");

    const sitemap = fs.readFileSync(sitemapPath, "utf-8");
    expect(sitemap).toContain("<loc>https://operator.nexxtechnologies.com/</loc>");
    expect(sitemap).not.toContain("nexx-receptionist.ai");
    expect(sitemap).not.toContain("apps.nexxtechnologies.com");
    expect(sitemap).not.toContain("apps.nexxtechnolgoies.com");
  });

  test("CANONICAL-003: Brand config reflects the canonical production app URL", () => {
    expect(BRAND_CONFIG.defaultAppUrl).toBe("https://operator.nexxtechnologies.com");
  });

  test("CANONICAL-004: next.config.ts defines permanent redirects for legacy domains", () => {
    const nextConfigPath = path.join(rootDir, "next.config.ts");
    const content = fs.readFileSync(nextConfigPath, "utf-8");

    // Must permanently redirect old domains to operator.nexxtechnologies.com
    expect(content).toContain('value: "apps.nexxtechnologies.com"');
    expect(content).toContain('value: "apps.nexxtechnolgoies.com"');
    expect(content).toContain('destination: "https://operator.nexxtechnologies.com/:path*"');
  });

  test("CANONICAL-005: Zero active legacy production domain occurrences in active source code", () => {
    const filesToInspect = [
      "src/lib/constants/brand.ts",
      "src/lib/auth/google-config.ts",
      "src/components/confidence-bridge/channel-activation-hub.tsx",
      "src/server/services/voice/campaign.ts",
      "src/app/api/voice/twiml/route.ts",
      "src/app/api/webhooks/voice/inbound/route.ts",
      "src/app/api/webhooks/voice/recording/route.ts",
      "src/app/api/webhooks/voice/turn/route.ts",
      "SECURITY.md",
      "README.md",
    ];

    for (const relPath of filesToInspect) {
      const fullPath = path.join(rootDir, relPath);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf-8");
        expect(text).not.toContain("apps.nexxtechnologies.com");
        expect(text).not.toContain("apps.nexxtechnolgoies.com");
      }
    }
  });
});
