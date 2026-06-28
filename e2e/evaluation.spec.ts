import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a mentor can record an evaluation for their mentee', async ({ page }) => {
  const mentorEmail = uniqueEmail('ev-mentor');
  const menteeEmail = uniqueEmail('ev-mentee');
  const mentor = await seedUser(mentorEmail, 'MentorPass123', 'MENTOR', 'Ev Mentor');
  const mentee = await seedUser(menteeEmail, 'x', 'MENTEE', 'Ev Mentee');
  const rel = await prisma.mentorshipRelation.create({ data: { mentorId: mentor.id, menteeId: mentee.id } });

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', mentorEmail);
    await page.fill('input[type="password"]', 'MentorPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/mentor'), { timeout: 20_000 });

    const res = await page.request.post('/api/evaluations', {
      data: { relationId: rel.id, scores: { technical: 4, communication: 5 }, comment: 'Strong start.' },
    });
    expect(res.status()).toBe(201);
    const ev = await prisma.evaluation.findFirst({ where: { relationId: rel.id } });
    expect(ev?.authorId).toBe(mentor.id);
    expect((ev?.scores as Record<string, number>).technical).toBe(4);
  } finally {
    await prisma.mentorshipRelation.deleteMany({ where: { id: rel.id } });
    await cleanupByEmail(menteeEmail);
    await cleanupByEmail(mentorEmail);
  }
});

test('a mentee can self-assess their skill levels', async ({ page }) => {
  const email = uniqueEmail('sl-mentee');
  const mentee = await seedUser(email, 'MenteePass123', 'MENTEE', 'SL Mentee');
  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', 'MenteePass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/portal'), { timeout: 20_000 });

    const res = await page.request.put('/api/profile', {
      data: { skills: ['React', 'Docker'], skillLevels: { React: 4, Docker: 2 } },
    });
    expect(res.ok()).toBeTruthy();
    const u = await prisma.user.findUnique({ where: { id: mentee.id } });
    expect((u?.skillLevels as Record<string, number>).React).toBe(4);
  } finally {
    await cleanupByEmail(email);
  }
});
