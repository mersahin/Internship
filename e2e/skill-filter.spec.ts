import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('skill filter matches a partial, case-insensitive term', async ({ page }) => {
  const adminEmail = uniqueEmail('skf-admin');
  const menteeEmail = uniqueEmail('skf-mentee');
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'Skf Admin');
  const mentee = await seedUser(menteeEmail, 'x', 'MENTEE', 'Docker Person');
  await prisma.user.update({ where: { id: mentee.id }, data: { skills: ['Docker', 'Linux'] } });

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    // Partial term via the API the page uses.
    const res = await page.request.get('/api/candidates?skills=docke');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.candidates.some((c: { id: string }) => c.id === mentee.id)).toBeTruthy();
  } finally {
    await cleanupByEmail(menteeEmail);
    await cleanupByEmail(adminEmail);
  }
});
