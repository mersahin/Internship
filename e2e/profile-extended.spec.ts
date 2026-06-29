import { test, expect } from '@playwright/test';
import { prisma, seedUser, cleanupByEmail, uniqueEmail } from './helpers/db';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('a mentee fills extended profile fields and they appear on the public profile', async ({ page }) => {
  const email = uniqueEmail('prof-mentee');
  const mentee = await seedUser(email, 'MenteePass123', 'MENTEE', 'Prof Mentee');

  try {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', 'MenteePass123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith('/portal'), { timeout: 20_000 });

    // Save extended profile fields via the API the form uses.
    const put = await page.request.put('/api/profile', {
      data: {
        displayName: 'Prof the Builder',
        bio: 'I build delightful web apps.',
        country: 'Germany',
        targetPosition: 'Frontend Developer',
        linkedinUrl: 'https://linkedin.com/in/prof',
        githubUrl: 'https://github.com/prof',
        publicProfile: true,
      },
    });
    expect(put.ok()).toBeTruthy();

    // The fields round-trip on read.
    const me = await (await page.request.get('/api/profile')).json();
    expect(me.user.displayName).toBe('Prof the Builder');
    expect(me.user.targetPosition).toBe('Frontend Developer');

    // Public profile renders the chosen display name, bio and target position.
    await page.goto(`/p/${mentee.id}`);
    await expect(page.getByRole('heading', { name: 'Prof the Builder' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('I build delightful web apps.')).toBeVisible();
    await expect(page.getByText('Frontend Developer')).toBeVisible();
    await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  } finally {
    await cleanupByEmail(email);
  }
});
