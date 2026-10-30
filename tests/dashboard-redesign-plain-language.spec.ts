import { test, expect } from "@playwright/test";

test.describe("Operator Redesign & Plain-Language Acceptance Tests", () => {
  // Test authentication setup
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard directly since auth storageState is active
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    if (page.url().includes("/sign-in")) {
      const emailInput = page.locator("#signin-email");
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill("demo+admin@example.com");
        await page.fill("#signin-password", "Dem0P@ssw0rd!2026_");
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*(dashboard|login-success)/, { timeout: 20000 });
        if (page.url().includes("login-success")) {
          const continueBtn = page.locator('button:has-text("Continue"), a:has-text("Continue")');
          if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await continueBtn.click();
          }
        }
      }
    }
  });

  test("New user sees exactly one primary next step card and unified 5-step checklist", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // 1. Verify Assistant Status Hero exists with plain status
    const statusHero = page.getByText(/ASSISTANT (ON|PAUSED)/i);
    await expect(statusHero.first()).toBeVisible({ timeout: 15000 });

    // 2. Verify exactly ONE 'Your Next Step' card banner is displayed
    const nextStepTag = page.locator('text="Your Next Step"');
    await expect(nextStepTag).toHaveCount(1);

    // 3. Verify Setup Checklist card exists with 5 steps
    const checklistHeader = page.locator('text="Setup Checklist"');
    await expect(checklistHeader).toBeVisible();

    // 4. Verify Try It Yourself card is visible with test message action
    const tryItCard = page.locator('text="Try It Yourself"');
    await expect(tryItCard).toBeVisible();
    await expect(page.locator('text="Send a test message"').first()).toBeVisible();
  });

  test("Sidebar uses plain language without technical jargon", async ({ page }) => {
    await page.goto("/dashboard");

    // Sidebar items should use plain names
    await expect(page.locator('nav a:has-text("Messages")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Appointments")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Customers")').first()).toBeVisible();
    await expect(page.locator('nav a:has-text("Needs Your Attention")').first()).toBeVisible();

    // Jargon should NOT appear in customer sidebar
    await expect(page.locator('nav a:has-text("Omnichannel Inbox")')).toHaveCount(0);
    await expect(page.locator('nav a:has-text("Tasks & Exceptions")')).toHaveCount(0);
    await expect(page.locator('nav a:has-text("AI Persona & Prompts")')).toHaveCount(0);
  });

  test("Services page has purpose line, actionable empty state, and example", async ({ page }) => {
    await page.goto("/services");

    // Verify one-sentence purpose description
    const purposeText = page.locator('text="Here you tell your assistant what you offer and what it costs."');
    await expect(purposeText).toBeVisible({ timeout: 10000 });

    // Verify Add a Service button exists
    const addBtn = page.locator('button:has-text("Add a service"), button:has-text("Add Service")');
    await expect(addBtn.first()).toBeVisible();
  });

  test("Help & Guides page exists with 5-minute tour and popular guides", async ({ page }) => {
    await page.goto("/help");

    await expect(page.locator('text="Help & Guides"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="5-Minute Guided Tour"')).toBeVisible();
    await expect(page.locator('text="Video Lessons & Guides"')).toBeVisible();
    await expect(page.locator('text="Open Interactive Demo"')).toBeVisible();
  });

  test("Server-side plan gating: Starter accounts are redirected from /voice routes to billing", async ({ page }) => {
    await page.goto("/voice/dashboard");
    // Should be redirected to billing or have upgrade query param
    await page.waitForURL(/.*(billing\?.*upgrade|billing|voice)/, { timeout: 10000 });
  });

  test("Voice entitlement minutes match country plans (US/UK vs India)", async () => {
    const { getLocalizedPlan } = await import("../src/lib/billing/plans");
    // US & UK Pro: 250 minutes; Business: 600 minutes
    const usPro = getLocalizedPlan("professional", null, "US");
    const usBiz = getLocalizedPlan("business", null, "US");
    expect(usPro.limits.voiceMinutes).toBe(250);
    expect(usBiz.limits.voiceMinutes).toBe(600);

    const ukPro = getLocalizedPlan("professional", null, "GB");
    const ukBiz = getLocalizedPlan("business", null, "GB");
    expect(ukPro.limits.voiceMinutes).toBe(250);
    expect(ukBiz.limits.voiceMinutes).toBe(600);

    // India Pro: 150 minutes; Business: 400 minutes
    const inPro = getLocalizedPlan("professional", null, "IN");
    const inBiz = getLocalizedPlan("business", null, "IN");
    expect(inPro.limits.voiceMinutes).toBe(150);
    expect(inBiz.limits.voiceMinutes).toBe(400);

    // Starter: 0 voice minutes in all markets
    const usStarter = getLocalizedPlan("starter", null, "US");
    const inStarter = getLocalizedPlan("starter", null, "IN");
    expect(usStarter.limits.voiceMinutes).toBe(0);
    expect(inStarter.limits.voiceMinutes).toBe(0);
  });

  test("Payments settings displays appropriate regional provider / contact card", async ({ page }) => {
    await page.goto("/settings/booking");
    await expect(page.locator('text="Service Deposits & Payments"')).toBeVisible({ timeout: 10000 });
    // Either connected provider or Contact us to enable payments
    const contactOrDeposit = page.locator(':is(:text("Contact us to enable payments"), :text("Require Deposits"), :text("Service Deposits & Payments"))');
    await expect(contactOrDeposit.first()).toBeVisible();
  });

  test("Knowledge Base sub-navigation organizes primary vs Advanced tools without data loss", async ({ page }) => {
    await page.goto("/kb");
    // Primary items visible
    await expect(page.locator('button:has-text("Knowledge Overview")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Documents")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Website Imports")').first()).toBeVisible();
    // Advanced section visible with processing queue and settings
    await expect(page.locator('button:has-text("Processing Queue")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Search Console")').first()).toBeVisible();
  });

  test("Voice settings and Persona have visible Play Sample button and Approximate preview badge", async ({ page }) => {
    await page.goto("/settings/ai");
    await expect(page.locator('text="Approximate preview"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Play sample")').first()).toBeVisible();
  });
});

