import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateRelationSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
  companyId: z.string().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const relation = await prisma.mentorshipRelation.findUnique({
      where: { id: params.id },
      include: {
        mentor: { select: { id: true, fullName: true, email: true, department: true } },
        mentee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            university: true,
            graduationYear: true,
            skills: true,
            phone: true,
            cvUrl: true,
          },
        },
        company: true,
        interactions: { orderBy: { date: 'desc' } },
      },
    });

    if (!relation) {
      return NextResponse.json({ error: 'Relation not found' }, { status: 404 });
    }

    const isAuthorized =
      session.user.role === 'ADMIN' ||
      relation.mentorId === session.user.id ||
      relation.menteeId === session.user.id;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ relation });
  } catch (error) {
    console.error('Get mentorship error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const relation = await prisma.mentorshipRelation.findUnique({
      where: { id: params.id },
    });

    if (!relation) {
      return NextResponse.json({ error: 'Relation not found' }, { status: 404 });
    }

    const isAuthorized =
      session.user.role === 'ADMIN' || relation.mentorId === session.user.id;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateRelationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.mentorshipRelation.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        mentor: { select: { id: true, fullName: true, email: true } },
        mentee: { select: { id: true, fullName: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ relation: updated });
  } catch (error) {
    console.error('Update mentorship error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
