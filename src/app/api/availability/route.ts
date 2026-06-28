import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET — availability slots. Mentors see their own; ?mentorId= returns a
// mentor's slots (for booking).
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const mentorId = new URL(request.url).searchParams.get('mentorId') || (session.user.role === 'MENTOR' ? session.user.id : null);
  if (!mentorId) return NextResponse.json({ slots: [] });
  const slots = await prisma.availabilitySlot.findMany({ where: { mentorId }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] });
  return NextResponse.json({ slots });
}

const schema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME),
  endTime: z.string().regex(TIME),
});

// POST — add a slot to the current mentor's availability.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'MENTOR' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  if (parsed.data.endTime <= parsed.data.startTime) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }
  const slot = await prisma.availabilitySlot.create({ data: { mentorId: session.user.id, ...parsed.data } });
  return NextResponse.json({ slot }, { status: 201 });
}

// DELETE ?id= — remove one of the current mentor's slots.
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') || '';
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (slot.mentorId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.availabilitySlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
