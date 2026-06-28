import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('public project showcase shows public projects only', async ({ page }) => {
  const ownerEmail = uniqueEmail('show-mentor');
  const owner = await seedUser(ownerEmail, 'x', 'MENTOR', 'Showcase Mentor');
  const pub = await prisma.project.create({
    data: { name: 'Aurora Showcase', isPublic: true, ownerType: 'MENTOR', ownerUserId: owner.id, technologies: ['React'] },
  });
  const priv = await prisma.project.create({
    data: { name: 'Hidden Secret', isPublic: false, ownerType: 'MENTOR', ownerUserId: owner.id },
  });

  try {
    // Anonymous visitor sees the public one, not the private one.
    await page.goto('/projects');
    await expect(page.getByText('Aurora Showcase')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Hidden Secret')).toHaveCount(0);

    // Public detail renders.
    await page.goto(`/projects/${pub.id}`);
    await expect(page.getByRole('heading', { name: 'Aurora Showcase' })).toBeVisible();

    // Private detail is not exposed (404).
    const res = await page.goto(`/projects/${priv.id}`);
    expect(res?.status()).toBe(404);
  } finally {
    await prisma.project.deleteMany({ where: { ownerUserId: owner.id } });
    await cleanupByEmail(ownerEmail);
  }
});
