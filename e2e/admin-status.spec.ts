import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('admin can move a completed mentee back to an earlier stage; history is appended', async ({ page }) => {
  const mentorEmail = uniqueEmail('mentor');
  const menteeEmail = uniqueEmail('mentee');
  const mentor = await seedUser(mentorEmail, 'Pass1234!', 'MENTOR', 'Status Mentor');
  const mentee = await seedUser(menteeEmail, 'Pass1234!', 'MENTEE', 'Status Mentee');
  const relation = await prisma.mentorshipRelation.create({
    data: { mentorId: mentor.id, menteeId: mentee.id, pipelineStatus: 'EMPLOYED_700' },
  });
  // Pre-existing history that must be preserved
  await prisma.statusChange.create({
    data: { relationId: relation.id, fromStatus: 'APPLICATION_100', toStatus: 'EMPLOYED_700', changedById: mentor.id },
  });

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/auth/signin'), { timeout: 20_000 });

    await page.goto(`/admin/candidates/${mentee.id}`);
    await expect(page.getByLabel('Stage')).toBeVisible();
    // Move backward 700 -> 220, waiting for the PUT to complete
    const putDone = page.waitForResponse(
      (r) => r.url().includes(`/api/mentorship/${relation.id}`) && r.request().method() === 'PUT'
    );
    await page.getByLabel('Stage').selectOption('APPROVAL_PENDING_220');
    await putDone;
    await page.waitForTimeout(600);

    const updated = await prisma.mentorshipRelation.findUnique({ where: { id: relation.id } });
    expect(updated?.pipelineStatus).toBe('APPROVAL_PENDING_220');

    // Old history preserved + new entry appended (2 total)
    const changes = await prisma.statusChange.findMany({ where: { relationId: relation.id } });
    expect(changes.length).toBe(2);
    expect(changes.some((c) => c.fromStatus === 'EMPLOYED_700' && c.toStatus === 'APPROVAL_PENDING_220')).toBe(true);
    expect(changes.some((c) => c.fromStatus === 'APPLICATION_100' && c.toStatus === 'EMPLOYED_700')).toBe(true);
  } finally {
    await cleanupByEmail(mentorEmail);
    await cleanupByEmail(menteeEmail);
  }
});
