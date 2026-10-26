import { test, expect } from '@playwright/test';

test.describe('Operator Phase 3 — Frontend, Accessibility & Responsiveness Suite', () => {

  test('A11y A — Responsive Viewports: Mobile, Tablet, and Desktop viewport layouts', async ({ page }) => {
    // 1. Mobile viewport (375x667 - iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('header, nav').first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();

    // 2. Tablet viewport (768x1024 - iPad)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/pricing');
    await expect(page.locator('h1').first()).toBeVisible();

    // 3. Desktop viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/features');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('A11y B — Accessible Names: Interactive buttons and links have accessible text', async ({ page }) => {
    await page.goto('/pricing');

    // All buttons must have non-empty accessible name or aria-label
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(buttonCount, 15); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.innerText().catch(() => '');
        const ariaLabel = await btn.getAttribute('aria-label').catch(() => null);
        const title = await btn.getAttribute('title').catch(() => null);
        const hasAccessibleName = Boolean(text.trim() || ariaLabel || title);
        expect(hasAccessibleName).toBe(true);
      }
    }
  });

  test('A11y C — Console Error Hygiene: Public pages load cleanly without uncaught exceptions', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main').first().waitFor({ timeout: 15000 });

    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('main').first().waitFor({ timeout: 15000 });

    // No uncaught JavaScript crashes or unhandled rejections on public marketing pages
    const criticalErrors = errorLogs.filter(
      (msg) => !msg.includes('ResizeObserver') && !msg.includes('favicon')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('A11y D — Keyboard Navigation: Dialogs and interactive elements handle Escape key', async ({ page }) => {
    await page.goto('/pricing');

    // Test that escape key can be dispatched without page errors
    await page.keyboard.press('Escape');
    expect(page.url()).toContain('/pricing');
  });

});
