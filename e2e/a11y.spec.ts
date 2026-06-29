import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a skip-to-content link targets the main landmark', async ({ page }) => {
  const email = uniqueEmail('a11y');
  await seedUser(email, 'AdminPass123', 'ADMIN', 'A11y Admin');
  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    const skip = page.locator('a[href="#main-content"]');
    await expect(skip).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
    // It becomes visible on keyboard focus.
    await skip.focus();
    await expect(skip).toBeVisible();
  } finally {
    await cleanupByEmail(email);
  }
});
