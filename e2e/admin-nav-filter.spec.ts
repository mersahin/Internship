import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('admin sidebar nav can be filtered by typing', async ({ page }) => {
  const adminEmail = uniqueEmail('nav-admin');
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'Nav Admin');

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Companies', exact: true })).toBeVisible();

    // Filtering hides non-matching links.
    await page.getByPlaceholder(/Filter menu/i).fill('analy');
    await expect(nav.getByRole('link', { name: 'Analytics', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Companies', exact: true })).toHaveCount(0);

    // Clearing restores them.
    await page.getByPlaceholder(/Filter menu/i).fill('');
    await expect(nav.getByRole('link', { name: 'Companies', exact: true })).toBeVisible();
  } finally {
    await cleanupByEmail(adminEmail);
  }
});
