import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey } from '@/lib/apiKey';
import { enforceRateLimit } from '@/lib/rateLimit';

// Public, read-only programmatic API authenticated with a Bearer API key.
// Returns a candidate (mentee) summary — no contact PII.
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 'v1', { limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;

  const key = await authenticateApiKey(request);
  if (!key) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  const mentees = await prisma.user.findMany({
    where: { role: 'MENTEE' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      fullName: true,
      university: true,
      department: true,
      graduationYear: true,
      skills: true,
      menteeRelations: { where: { status: 'ACTIVE' }, take: 1, select: { pipelineStatus: true } },
    },
  });

  const data = mentees.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    university: m.university,
    department: m.department,
    graduationYear: m.graduationYear,
    skills: m.skills,
    stage: m.menteeRelations[0]?.pipelineStatus ?? null,
  }));
  return NextResponse.json({ candidates: data });
}
