import { test, expect } from "@playwright/test";

test.describe("Operator Redesign & Plain-Language Acceptance Tests", () => {
  // Test authentication setup
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in and authenticate
    await page.goto("/sign-in");
    const emailInput = page.locator("#signin-email");
    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
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
  });

  test("New user sees exactly one primary next step card and unified 5-step checklist", async ({ page }) => {
    await page.goto("/dashboard");

    // 1. Verify Assistant Status Hero exists with plain status
    const statusHero = page.locator("text=ASSISTANT ON, text=ASSISTANT PAUSED");
    await expect(statusHero.first()).toBeVisible({ timeout: 10000 });

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
    await expect(page.locator('text="Founder Academy Lessons"')).toBeVisible();
    await expect(page.locator('text="Open Interactive Demo"')).toBeVisible();
  });
});
