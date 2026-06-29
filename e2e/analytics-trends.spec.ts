import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('analytics returns a 6-month trend series', async ({ page }) => {
  const email = uniqueEmail('at-admin');
  await seedUser(email, 'AdminPass123', 'ADMIN', 'AT Admin');

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    const data = await (await page.request.get('/api/admin/analytics')).json();
    expect(data.trends).toBeTruthy();
    expect(data.trends.months).toHaveLength(6);
    expect(data.trends.newRelations).toHaveLength(6);
    expect(data.trends.interactions).toHaveLength(6);

    await page.goto('/admin/analytics');
    await expect(page.getByText(/Trends|Trendler/i).first()).toBeVisible({ timeout: 10_000 });
  } finally {
    await cleanupByEmail(email);
  }
});
