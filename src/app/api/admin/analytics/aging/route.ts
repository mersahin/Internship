import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — hiring-funnel aging & SLA (EPIC: HR funnel-aging). Reuses the
// StatusChange audit trail to compute time-in-current-stage per active
// relation, without a separate "stage entered at" column.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const relations = await prisma.mentorshipRelation.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      pipelineStatus: true,
      startDate: true,
      stageDeadline: true,
      mentee: { select: { id: true, fullName: true } },
      statusChanges: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  });

  const items = relations.map((r) => {
    const enteredStageAt = r.statusChanges[0]?.createdAt ?? r.startDate;
    const daysInStage = Math.floor((now - enteredStageAt.getTime()) / (24 * 60 * 60 * 1000));
    return {
      relationId: r.id,
      menteeId: r.mentee.id,
      menteeName: r.mentee.fullName,
      pipelineStatus: r.pipelineStatus,
      daysInStage,
      overdue: !!r.stageDeadline && r.stageDeadline.getTime() < now,
    };
  });

  // Average + median days-in-stage per pipeline status.
  const byStage = new Map<string, number[]>();
  for (const it of items) {
    if (!byStage.has(it.pipelineStatus)) byStage.set(it.pipelineStatus, []);
    byStage.get(it.pipelineStatus)!.push(it.daysInStage);
  }
  const stageAging = Array.from(byStage.entries()).map(([pipelineStatus, days]) => {
    const sorted = [...days].sort((a, b) => a - b);
    const avg = Math.round(days.reduce((s, d) => s + d, 0) / days.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { pipelineStatus, count: days.length, avgDays: avg, medianDays: median };
  }).sort((a, b) => b.avgDays - a.avgDays);

  const oldestStuck = [...items].sort((a, b) => b.daysInStage - a.daysInStage).slice(0, 10);
  const overdue = items.filter((it) => it.overdue).sort((a, b) => b.daysInStage - a.daysInStage);

  return NextResponse.json({ stageAging, oldestStuck, overdue, overdueCount: overdue.length });
}
