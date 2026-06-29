import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessUserDocs } from '@/lib/documentAccess';

// GET — download a document (templates: any signed-in user; owned: access-controlled).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!doc.isTemplate) {
    if (!doc.ownerId || !(await canAccessUserDocs(session.user, doc.ownerId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return new NextResponse(Buffer.from(doc.data), {
    headers: {
      'Content-Type': doc.contentType,
      'Content-Disposition': `inline; filename="${doc.filename.replace(/"/g, '')}"`,
      'Content-Length': String(doc.size),
    },
  });
}

// DELETE — remove a document. Templates: admin only. Owned: access-controlled.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (doc.isTemplate) {
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!doc.ownerId || !(await canAccessUserDocs(session.user, doc.ownerId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
