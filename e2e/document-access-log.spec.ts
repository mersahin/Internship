import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('downloading a document records an access-log entry', async ({ page }) => {
  const adminEmail = uniqueEmail('dal-admin');
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'DAL Admin');
  let docId = '';

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    const up = await page.request.post('/api/documents', {
      multipart: { file: { name: 'g.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 x') }, isTemplate: 'true', title: 'Guide' },
    });
    expect(up.status()).toBe(201);
    docId = (await up.json()).document.id;

    const dl = await page.request.get(`/api/documents/${docId}`);
    expect(dl.ok()).toBeTruthy();

    await expect.poll(async () =>
      prisma.activityLog.count({ where: { action: 'document.download', targetId: docId } })
    , { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  } finally {
    await prisma.activityLog.deleteMany({ where: { targetId: docId } });
    await prisma.document.deleteMany({ where: { id: docId } });
    await cleanupByEmail(adminEmail);
  }
});
