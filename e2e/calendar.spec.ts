import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a mentor can add and list availability slots', async ({ page }) => {
  const email = uniqueEmail('av-mentor');
  const mentor = await seedUser(email, 'MentorPass123', 'MENTOR', 'Av Mentor');
  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', 'MentorPass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/mentor'), { timeout: 20_000 });

    const res = await page.request.post('/api/availability', { data: { weekday: 1, startTime: '09:00', endTime: '10:00' } });
    expect(res.status()).toBe(201);
    expect(await prisma.availabilitySlot.count({ where: { mentorId: mentor.id } })).toBeGreaterThan(0);
  } finally {
    await prisma.availabilitySlot.deleteMany({ where: { mentorId: mentor.id } });
    await cleanupByEmail(email);
  }
});

test('a meeting exposes a public .ics calendar file', async ({ page }) => {
  const mentorEmail = uniqueEmail('ics-mentor');
  const menteeEmail = uniqueEmail('ics-mentee');
  const mentor = await seedUser(mentorEmail, 'x', 'MENTOR', 'Ics Mentor');
  const mentee = await seedUser(menteeEmail, 'x', 'MENTEE', 'Ics Mentee');
  const rel = await prisma.mentorshipRelation.create({ data: { mentorId: mentor.id, menteeId: mentee.id } });
  const token = randomBytes(12).toString('hex');
  await prisma.meeting.create({
    data: { relationId: rel.id, title: 'Kickoff Call', scheduledAt: new Date(Date.now() + 86400000), rsvpToken: token, createdById: mentor.id },
  });

  try {
    const res = await page.request.get(`/api/calendar/${token}`);
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('text/calendar');
    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('Kickoff Call');
  } finally {
    await prisma.mentorshipRelation.deleteMany({ where: { id: rel.id } });
    await cleanupByEmail(menteeEmail);
    await cleanupByEmail(mentorEmail);
  }
});
