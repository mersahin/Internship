import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EVAL_CRITERIA } from '@/lib/evaluation';

// GET ?relationId= — evaluations for a relation (participants/admin).
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const relationId = new URL(request.url).searchParams.get('relationId') || '';

  const rel = await prisma.mentorshipRelation.findUnique({ where: { id: relationId } });
  if (!rel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = session.user.role === 'ADMIN' || rel.mentorId === session.user.id || rel.menteeId === session.user.id;
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const evaluations = await prisma.evaluation.findMany({ where: { relationId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ evaluations });
}

const scoreSchema = z.record(z.enum(EVAL_CRITERIA), z.number().int().min(1).max(5));
const schema = z.object({
  relationId: z.string().min(1),
  scores: scoreSchema,
  comment: z.string().max(2000).optional().nullable(),
});

// POST — the mentor (or an admin) records an evaluation for the mentee.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });

  const rel = await prisma.mentorshipRelation.findUnique({ where: { id: parsed.data.relationId } });
  if (!rel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && rel.mentorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const evaluation = await prisma.evaluation.create({
    data: { relationId: rel.id, authorId: session.user.id, scores: parsed.data.scores, comment: parsed.data.comment || null },
  });
  return NextResponse.json({ evaluation }, { status: 201 });
}
