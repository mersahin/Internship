import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

test.afterAll(async () => {
  await prisma.$disconnect();
});

// EPIC C (#416): impersonating a mentee must really switch the session — land
// on the portal, show the banner, and return cleanly to the admin account.
test('admin impersonates a mentee: lands on portal, shows banner, returns', async ({ page }) => {
  const email = uniqueEmail('imp');
  const name = `Imp Mentee ${Date.now().toString(36)}`;
  await seedUser(email, 'x', 'MENTEE', name);
  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/auth/signin'), { timeout: 20_000 });

    await page.goto('/admin/users');
    // Users-page search (not the admin nav "Filter menu" box).
    await page.getByPlaceholder(/name or email/i).fill(name);

    // The reason prompt is a window.prompt — auto-accept it.
    page.once('dialog', (d) => d.accept('e2e'));
    await page.getByRole('button', { name: /login as/i }).click();

    // Session really switches to the mentee → lands on the portal.
    await page.waitForURL((u) => u.pathname.startsWith('/portal'), { timeout: 20_000 });
    await expect(page.getByText(/viewing the app as/i)).toBeVisible();

    // Return goes back to the admin account.
    await page.getByRole('button', { name: /return to your account/i }).click();
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });
  } finally {
    await cleanupByEmail(email);
  }
});
