import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a mentor-owned project can be transferred back to the admin without error', async ({ page }) => {
  const adminEmail = uniqueEmail('pt-admin');
  const mentorEmail = uniqueEmail('pt-mentor');
  const admin = await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'PT Admin');
  const mentor = await seedUser(mentorEmail, 'x', 'MENTOR', 'PT Mentor');
  const project = await prisma.project.create({
    data: { name: 'Transfer Me', ownerType: 'MENTOR', ownerUserId: mentor.id },
  });

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    // Transfer mentor-owned -> admin, omitting ownerUserId (as the UI does for
    // "Admin (me)"). Must succeed, not 400 "Invalid owner".
    const res = await page.request.put(`/api/projects/${project.id}`, { data: { ownerType: 'ADMIN' } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.project.ownerType).toBe('ADMIN');
    expect(body.project.ownerUserId).toBe(admin.id);
  } finally {
    await prisma.project.deleteMany({ where: { id: project.id } });
    await cleanupByEmail(mentorEmail);
    await cleanupByEmail(adminEmail);
  }
});
