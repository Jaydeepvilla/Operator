const routes = [
  '/',
  '/onboarding?demo=true',
  '/dashboard',
  '/services',
  '/staff',
  '/receptionist',
  '/widget',
  '/appointments'
];

async function warm() {
  console.log('Warming routes...');
  for (const r of routes) {
    const t0 = Date.now();
    try {
      const res = await fetch(`http://localhost:3000${r}`);
      console.log(`  ✓ ${r} -> ${res.status} (${Date.now() - t0}ms)`);
    } catch (e) {
      console.log(`  ✗ ${r} error:`, e.message);
    }
  }
  console.log('All routes warmed!');
}

warm().catch(console.error);

