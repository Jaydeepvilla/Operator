const { chromium } = require('playwright');
const fs = require('fs');

async function getError() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    const hasOverlay = await page.locator('nextjs-portal').count();
    if (hasOverlay > 0) {
      const errorText = await page.locator('nextjs-portal').textContent();
      console.log('Error text:', errorText.substring(0, 1000));
    } else {
      console.log('No error overlay.');
    }
  } catch (e) {
    console.error(e);
  }
  
  await browser.close();
}

getError().catch(console.error);
