import { defineConfig } from "@playwright/test";
import * as path from "path";

export default defineConfig({
  testDir: "./tests",
  globalSetup: require.resolve("./tests/global-setup"),
  workers: 1,
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.BASE_URL || "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { 
        browserName: "chromium",
        storageState: path.join(process.cwd(), "playwright", ".auth", "user.json")
      },
    },
  ],
});
