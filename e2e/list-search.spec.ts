import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('admin users list supports search to narrow results', async ({ page }) => {
  const adminEmail = uniqueEmail('ls-admin');
  const needleName = `Zephyr Findme ${Date.now()}`;
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'LS Admin');
  const target = await seedUser(uniqueEmail('ls-needle'), 'x', 'MENTOR', needleName);
  // A few extra users so the list isn't trivially small.
  for (let i = 0; i < 3; i++) await seedUser(uniqueEmail(`ls-noise-${i}`), 'x', 'MENTEE', `Noise ${i}`);

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    await page.goto('/admin/users');
    await expect(page.getByTestId(`user-row-${target.id}`)).toBeVisible({ timeout: 10_000 });

    // Search narrows to the matching user.
    await page.getByPlaceholder(/Search by name or email/i).fill('Zephyr Findme');
    await expect(page.getByTestId(`user-row-${target.id}`)).toBeVisible();
    const rows = page.locator('[data-testid^="user-row-"]');
    await expect(rows).toHaveCount(1);
  } finally {
    // Cleanup noise + targets by listing emails we created.
    const created = await prisma.user.findMany({ where: { fullName: { contains: 'Noise ' } }, select: { email: true } });
    for (const u of created) await cleanupByEmail(u.email);
    await cleanupByEmail(target.email);
    await cleanupByEmail(adminEmail);
  }
});
