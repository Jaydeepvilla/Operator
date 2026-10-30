const { chromium } = require('playwright');

async function captureError() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    const hasOverlay = await page.locator('nextjs-portal').count();
    if (hasOverlay > 0) {
      await page.screenshot({ path: 'public/docs-assets/error-overlay.png' });
      console.log('Error overlay screenshot saved to error-overlay.png');
    } else {
      console.log('No error overlay.');
    }
  } catch (e) {
    console.error(e);
  }
  
  await browser.close();
}

captureError().catch(console.error);
