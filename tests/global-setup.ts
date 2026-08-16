import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('Running global setup to seed authenticated session...');
  
  const { baseURL } = config.projects[0].use;
  const url = baseURL || 'http://localhost:3000';
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${url}/sign-in`);
    
    // Wait for form input to be rendered
    await page.waitForSelector('#signin-email', { state: 'visible', timeout: 15000 });
    
    // Fill in the seed user credentials
    await page.fill('#signin-email', 'demo+clerk_test@example.com');
    await page.fill('#signin-password', 'Dem0P@ssw0rd!2026_');
    
    // Click the submit button (it should be the primary button in the form)
    await page.click('button[type="submit"]');
    
    // Wait for the navigation to dashboard to complete, indicating successful login
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Ensure the dashboard is somewhat loaded
    await page.waitForTimeout(2000);
    
    // Save the context state
    const storagePath = path.join(process.cwd(), 'playwright', '.auth', 'user.json');
    
    // Ensure directory exists
    const fs = require('fs');
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    
    await context.storageState({ path: storagePath });
    console.log(`Saved authentication state to ${storagePath}`);
    
  } catch (error) {
    console.error('Failed to login and save session state during global setup:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
