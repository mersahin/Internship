import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

const pdf = (s: string) => ({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 ${s}`) });

test('documents: typed uploads with versioning, templates, and download', async ({ page }) => {
  const adminEmail = uniqueEmail('doc-admin');
  const menteeEmail = uniqueEmail('doc-mentee');
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'Doc Admin');
  const mentee = await seedUser(menteeEmail, 'MenteePass123', 'MENTEE', 'Doc Mentee');

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', adminEmail);
    await page.fill('input[type="password"]', 'AdminPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });

    // Two CONTRACT uploads for the mentee → version bumps to 2.
    const up1 = await page.request.post('/api/documents', {
      multipart: { file: pdf('one'), type: 'CONTRACT', targetUserId: mentee.id },
    });
    expect(up1.status()).toBe(201);
    const up2 = await page.request.post('/api/documents', {
      multipart: { file: pdf('two'), type: 'CONTRACT', targetUserId: mentee.id, title: 'Internship contract' },
    });
    expect(up2.status()).toBe(201);
    expect((await up2.json()).document.version).toBe(2);

    const list = await (await page.request.get(`/api/documents?userId=${mentee.id}`)).json();
    expect(list.documents.length).toBe(2);

    // The latest doc downloads.
    const docId = (await up2.json()).document.id;
    const dl = await page.request.get(`/api/documents/${docId}`);
    expect(dl.ok()).toBeTruthy();
    expect(dl.headers()['content-type']).toContain('application/pdf');

    // Admin publishes a template; it shows up in the shared template list.
    const tpl = await page.request.post('/api/documents', {
      multipart: { file: pdf('tpl'), isTemplate: 'true', title: 'Onboarding form' },
    });
    expect(tpl.status()).toBe(201);
    const templates = await (await page.request.get('/api/documents?templates=1')).json();
    expect(templates.documents.some((d: { title: string }) => d.title === 'Onboarding form')).toBeTruthy();
  } finally {
    await prisma.document.deleteMany({ where: { OR: [{ ownerId: mentee.id }, { isTemplate: true, title: 'Onboarding form' }] } });
    await cleanupByEmail(menteeEmail);
    await cleanupByEmail(adminEmail);
  }
});
