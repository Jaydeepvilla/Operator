import { Page } from "@playwright/test";

export async function injectCursor(page: Page) {
  await page.evaluate(() => {
    // Remove if already exists
    const existing = document.getElementById("demo-mouse-cursor");
    if (existing) existing.remove();

    const cursor = document.createElement("div");
    cursor.id = "demo-mouse-cursor";
    cursor.style.position = "fixed";
    cursor.style.top = "0px";
    cursor.style.left = "0px";
    cursor.style.width = "26px";
    cursor.style.height = "26px";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "99999999";
    cursor.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
    cursor.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));">
        <path d="M5.5 3.5L18.5 12L12 13.5L9 19.5L5.5 3.5Z" fill="#6366f1" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div id="demo-click-ripple" style="position:absolute; top:-7px; left:-7px; width:40px; height:40px; border-radius:50%; border:2px solid #818cf8; opacity:0; transform:scale(0.3); transition:all 0.35s ease-out; pointer-events:none;"></div>
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
}

export async function smoothMove(page: Page, selector: string, delayAfter = 400) {
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      const box = await el.boundingBox();
      if (box) {
        const x = Math.round(box.x + box.width / 2);
        const y = Math.round(box.y + box.height / 2);
        await page.evaluate(({ x, y }) => (window as any).__moveCursor?.(x, y), { x, y });
        await page.waitForTimeout(delayAfter);
        return true;
      }
    }
  } catch {}
  return false;
}

export async function smoothMoveToCoords(page: Page, x: number, y: number, delayAfter = 400) {
  await page.evaluate(({ x, y }) => (window as any).__moveCursor?.(x, y), { x, y });
  await page.waitForTimeout(delayAfter);
}

export async function smoothClick(page: Page, selector: string, delayAfter = 500) {
  const moved = await smoothMove(page, selector, 300);
  await page.evaluate(() => (window as any).__clickCursor?.());
  await page.waitForTimeout(150);
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click().catch(() => {});
    }
  } catch {}
  await page.waitForTimeout(delayAfter);
}

export async function humanType(page: Page, selector: string, text: string) {
  await smoothClick(page, selector, 200);
  try {
    const el = page.locator(selector).first();
    await el.fill("");
    for (const char of text) {
      await el.pressSequentially(char, { delay: 35 + Math.floor(Math.random() * 30) });
    }
  } catch {}
  await page.waitForTimeout(300);
}

export async function smoothScroll(page: Page, yOffset: number, delayAfter = 1000) {
  await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), yOffset);
  await page.waitForTimeout(delayAfter);
}

