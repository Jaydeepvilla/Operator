const { chromium } = require('playwright');
const fs = require('fs');

const SCREENS = [
  { name: 'Dashboard', route: '/dashboard' },
  { name: 'Setup Wizard', route: '/setup' },
  { name: 'Business Profile', route: '/settings/business' },
  { name: 'Knowledge Base', route: '/knowledge-base' },
  { name: 'Services', route: '/services' },
  { name: 'Appointments', route: '/appointments' },
  { name: 'Calendar', route: '/calendar' },
  { name: 'Inbox', route: '/inbox' },
  { name: 'Conversations', route: '/conversations' },
  { name: 'Channels', route: '/channels' },
  { name: 'WhatsApp', route: '/settings/whatsapp' },
  { name: 'SMS', route: '/settings/sms' },
  { name: 'Email', route: '/settings/email' },
  { name: 'Instagram', route: '/settings/instagram' },
  { name: 'AI Settings', route: '/settings/ai' },
  { name: 'Receptionist', route: '/settings/receptionist' },
  { name: 'Website Widget', route: '/settings/widget' },
  { name: 'Analytics', route: '/analytics' },
  { name: 'Users', route: '/settings/users' },
  { name: 'Billing', route: '/settings/billing' },
  { name: 'Settings', route: '/settings' },
  { name: 'Security', route: '/settings/security' },
  { name: 'Notifications', route: '/settings/notifications' },
];

async function verifyRoutes() {
  console.log('Starting route verification...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'playwright/.auth/user.json'
  });
  const page = await context.newPage();

  const failedRoutes = [];
  const successfulRoutes = [];

  for (const screen of SCREENS) {
    console.log(`Checking ${screen.name} (${screen.route})...`);
    try {
      await page.goto(`http://localhost:3000${screen.route}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Check for Next.js error overlay
      const errorOverlay = await page.locator('nextjs-portal').count();
      if (errorOverlay > 0) {
        console.error(`❌ ERROR: Next.js error overlay found on ${screen.name}`);
        failedRoutes.push(screen.name);
      } else {
        // Check if page title contains "Error" or "Unhandled"
        const title = await page.title();
        if (title.includes('Error') || title.includes('Unhandled Runtime Error')) {
          console.error(`❌ ERROR: Error title found on ${screen.name}`);
          failedRoutes.push(screen.name);
        } else {
          console.log(`✅ SUCCESS: ${screen.name} rendered correctly.`);
          successfulRoutes.push(screen.name);
        }
      }
    } catch (e) {
      console.error(`❌ ERROR: Failed to load ${screen.name} (${screen.route}): ${e.message}`);
      failedRoutes.push(screen.name);
    }
  }

  await browser.close();
  
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Total Routes: ${SCREENS.length}`);
  console.log(`Successful: ${successfulRoutes.length}`);
  console.log(`Failed: ${failedRoutes.length}`);
  
  if (failedRoutes.length > 0) {
    console.log('\nFailed Routes:');
    failedRoutes.forEach(r => console.log(`- ${r}`));
  }
}

verifyRoutes().catch(console.error);
