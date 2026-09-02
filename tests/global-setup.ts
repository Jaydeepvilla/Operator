import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';
import { db } from '../src/server/db';
import { users, organizations, memberships, sessions, businessProfiles } from '../src/server/db/schema';
import { hashPassword } from '../src/lib/auth/password';

async function globalSetup(config: FullConfig) {
  console.log('Running deterministic global setup for Playwright test suite...');
  
  const { baseURL } = config.projects[0].use;
  const url = baseURL || 'http://localhost:3000';
  
  const testUserId = 'user_2demo_admin_clerk_test';
  const testEmail = 'demo+clerk_test@example.com';
  const testOrgId = '11111111-1111-1111-1111-111111111111';
  const passwordHash = await hashPassword('Dem0P@ssw0rd!2026_');

  // 1. Seed test organization
  await db.insert(organizations).values({
    id: testOrgId,
    name: 'Demo Test Corporation',
    slug: 'demo-test-corporation',
    industry: 'Technology',
    email: testEmail,
    phone: '15552345678',
    timezone: 'America/New_York',
    verificationStatus: 'verified',
  }).onConflictDoNothing();

  // 2. Seed business profile
  await db.insert(businessProfiles).values({
    id: '22222222-2222-2222-2222-222222222222',
    organizationId: testOrgId,
    description: 'Autonomous AI receptionist and scheduling system test workspace.',
  }).onConflictDoNothing();

  // 3. Seed test user
  await db.insert(users).values({
    id: testUserId,
    email: testEmail,
    name: 'Demo Admin',
    firstName: 'Demo',
    lastName: 'Admin',
    passwordHash,
    isVerified: true,
    status: 'active',
  }).onConflictDoUpdate({
    target: users.id,
    set: { passwordHash, status: 'active', isVerified: true },
  });

  // 4. Seed membership
  await db.insert(memberships).values({
    id: '33333333-3333-3333-3333-333333333333',
    organizationId: testOrgId,
    userId: testUserId,
    role: 'owner',
  }).onConflictDoNothing();

  // 5. Create deterministic session in DB
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await db.insert(sessions).values({
    id: sessionToken,
    userId: testUserId,
    userAgent: 'Playwright Test Runner',
    ipAddress: '127.0.0.1',
    isIdle: false,
    rememberMe: true,
    expiresAt: sessionExpiresAt,
  });

  // 6. Write Playwright auth storage state
  const storageDir = path.join(process.cwd(), 'playwright', '.auth');
  fs.mkdirSync(storageDir, { recursive: true });
  const storagePath = path.join(storageDir, 'user.json');

  const authState = {
    cookies: [
      {
        name: 'session_token',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(sessionExpiresAt.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
      {
        name: 'active_org_id',
        value: testOrgId,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(sessionExpiresAt.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      }
    ],
    origins: [
      {
        origin: url,
        localStorage: [
          { name: 'operator_test_mode', value: 'true' }
        ]
      }
    ]
  };

  fs.writeFileSync(storagePath, JSON.stringify(authState, null, 2), 'utf8');
  console.log(`✅ Seeded test user ${testUserId} and stored session in ${storagePath}`);
}

export default globalSetup;
