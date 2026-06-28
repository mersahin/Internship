import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a public profile shows safe fields but not PII; a private one 404s', async ({ page }) => {
  const pubEmail = uniqueEmail('pubprofile');
  const privEmail = uniqueEmail('privprofile');
  const pub = await seedUser(pubEmail, 'Pass123!', 'MENTEE', 'Public Person');
  const priv = await seedUser(privEmail, 'Pass123!', 'MENTEE', 'Private Person');
  await prisma.user.update({
    where: { id: pub.id },
    data: { publicProfile: true, university: 'TH Köln', phone: '+49 111 222', skills: ['React', 'Python'] },
  });

  try {
    // Public profile is visible without auth and shows safe fields only.
    await page.goto(`/p/${pub.id}`);
    await expect(page.getByRole('heading', { name: 'Public Person' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('TH Köln')).toBeVisible();
    await expect(page.getByText('React')).toBeVisible();
    // PII must NOT be exposed.
    await expect(page.getByText(pubEmail)).toHaveCount(0);
    await expect(page.getByText('+49 111 222')).toHaveCount(0);

    // A non-public profile is not found.
    const resp = await page.goto(`/p/${priv.id}`);
    expect(resp?.status()).toBe(404);
  } finally {
    await cleanupByEmail(pubEmail);
    await cleanupByEmail(privEmail);
  }
});
