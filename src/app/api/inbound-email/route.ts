import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyReplyToken, extractReplyToken } from '@/lib/replyToken';
import { notify } from '@/lib/notify';
import { logger } from '@/lib/logger';

const schema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  text: z.string().max(20000).optional().default(''),
});

const emailOf = (s: string) => (s.match(/[^<>\s]+@[^<>\s]+/)?.[0] || s).trim().toLowerCase();

// Strip a quoted reply history (best-effort) so only the new text is kept.
function stripQuoted(text: string): string {
  const cut = text.search(/^\s*(On .+ wrote:|-{2,} ?Original Message|>)/m);
  return (cut > 0 ? text.slice(0, cut) : text).trim();
}

function secretOk(request: Request): boolean {
  const expected = process.env.INBOUND_SECRET;
  if (!expected) return true; // not configured (dev/CI) — rely on the HMAC token gate
  const got = request.headers.get('x-inbound-secret') || '';
  try {
    return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST — receive a parsed inbound email from the mail bridge (IMAP poller or
// provider webhook). Routes it to a thread only when the HMAC reply token
// verifies AND the sender is a participant of that thread.
export async function POST(request: Request) {
  if (!secretOk(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const token = extractReplyToken(parsed.data.to);
  const relationId = token && verifyReplyToken(token);
  if (!relationId) return NextResponse.json({ error: 'No valid reply token' }, { status: 400 });

  const rel = await prisma.mentorshipRelation.findUnique({
    where: { id: relationId },
    include: { mentor: { select: { id: true, email: true } }, mentee: { select: { id: true, email: true } } },
  });
  if (!rel) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

  // The sender must be a participant of this thread.
  const from = emailOf(parsed.data.from);
  const senderId = from === rel.mentor.email.toLowerCase() ? rel.mentor.id
    : from === rel.mentee.email.toLowerCase() ? rel.mentee.id
    : null;
  if (!senderId) {
    logger.warning('Inbound email from non-participant rejected', { relationId, from });
    return NextResponse.json({ error: 'Sender is not a participant' }, { status: 403 });
  }

  const body = stripQuoted(parsed.data.text) || '(empty message)';
  await prisma.message.create({ data: { relationId, senderId, channel: 'EMAIL', body } });
  const recipient = senderId === rel.mentor.id ? rel.mentee.id : rel.mentor.id;
  await notify(recipient, 'message', 'New message (by email).', `/messages/${relationId}`);

  return NextResponse.json({ ok: true, created: true });
}
