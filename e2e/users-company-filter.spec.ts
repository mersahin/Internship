import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('admin users page can filter by the Company role', async ({ page }) => {
  const adminEmail = uniqueEmail('usradmin');
  const companyEmail = uniqueEmail('usrcompany');
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'Users Admin');
  await seedUser(companyEmail, 'x', 'COMPANY', 'Acme Company Login');

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    await page.goto('/admin/users');
    const companyTab = page.getByRole('button', { name: 'Company', exact: true });
    await expect(companyTab).toBeVisible({ timeout: 10_000 });
    await companyTab.click();
    await expect(page.getByText('Acme Company Login')).toBeVisible({ timeout: 10_000 });
  } finally {
    await cleanupByEmail(companyEmail);
    await cleanupByEmail(adminEmail);
  }
});
