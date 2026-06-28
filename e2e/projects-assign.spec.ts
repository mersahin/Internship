import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function adminLogin(page: import('@playwright/test').Page, email: string) {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', 'AdminPass123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith('/admin'), { timeout: 20_000 });
}

test('a mentee can be assigned to a project and filtered by it', async ({ page }) => {
  const adminEmail = uniqueEmail('pa-admin');
  const mentorEmail = uniqueEmail('pa-mentor');
  const menteeEmail = uniqueEmail('pa-mentee');
  await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'PA Admin');
  const mentor = await seedUser(mentorEmail, 'x', 'MENTOR', 'PA Mentor');
  const mentee = await seedUser(menteeEmail, 'x', 'MENTEE', 'PA Mentee');
  const rel = await prisma.mentorshipRelation.create({ data: { mentorId: mentor.id, menteeId: mentee.id } });
  const project = await prisma.project.create({ data: { name: 'Aurora Platform', ownerType: 'MENTOR', ownerUserId: mentor.id } });

  try {
    await adminLogin(page, adminEmail);
    const put = await page.request.put(`/api/mentorship/${rel.id}`, { data: { projectId: project.id } });
    expect(put.ok()).toBeTruthy();
    expect((await prisma.mentorshipRelation.findUnique({ where: { id: rel.id } }))!.projectId).toBe(project.id);

    const res = await page.request.get('/api/candidates?project=Aurora');
    const data = await res.json();
    expect(data.candidates.some((c: { id: string }) => c.id === mentee.id)).toBeTruthy();
  } finally {
    await prisma.mentorshipRelation.deleteMany({ where: { id: rel.id } });
    await prisma.project.deleteMany({ where: { id: project.id } });
    await cleanupByEmail(menteeEmail);
    await cleanupByEmail(mentorEmail);
    await cleanupByEmail(adminEmail);
  }
});

test('an admin can transfer a project to a company (audited)', async ({ page }) => {
  const adminEmail = uniqueEmail('pt-admin');
  const admin = await seedUser(adminEmail, 'AdminPass123', 'ADMIN', 'PT Admin');
  const company = await prisma.company.create({ data: { name: 'Transferee Co' } });
  const project = await prisma.project.create({ data: { name: 'Movable', ownerType: 'ADMIN', ownerUserId: admin.id } });

  try {
    await adminLogin(page, adminEmail);
    const res = await page.request.put(`/api/projects/${project.id}`, {
      data: { ownerType: 'COMPANY', ownerCompanyId: company.id },
    });
    expect(res.ok()).toBeTruthy();
    const after = await prisma.project.findUnique({ where: { id: project.id } });
    expect(after!.ownerType).toBe('COMPANY');
    expect(after!.ownerCompanyId).toBe(company.id);
    await expect.poll(async () =>
      prisma.activityLog.count({ where: { action: 'project.transfer', targetId: project.id } })
    ).toBeGreaterThan(0);
  } finally {
    await prisma.activityLog.deleteMany({ where: { targetId: project.id } });
    await prisma.project.deleteMany({ where: { id: project.id } });
    await prisma.company.deleteMany({ where: { id: company.id } });
    await cleanupByEmail(adminEmail);
  }
});
