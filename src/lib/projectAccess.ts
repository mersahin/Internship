import { prisma } from '@/lib/prisma';

interface SessionUser {
  id: string;
  role: string;
  companyId?: string | null;
}

type ProjectOwner = {
  ownerType: 'ADMIN' | 'MENTOR' | 'COMPANY';
  ownerUserId: string | null;
  ownerCompanyId: string | null;
};

// Who can see a project: admins (all), the owning mentor/admin, the owning
// company's users, or anyone if it's public.
export function canViewProject(user: SessionUser, p: ProjectOwner & { isPublic?: boolean }) {
  if (user.role === 'ADMIN') return true;
  if (p.isPublic) return true;
  if (p.ownerUserId && p.ownerUserId === user.id) return true;
  if (p.ownerCompanyId && user.companyId && p.ownerCompanyId === user.companyId) return true;
  return false;
}

// Who can edit/delete/transfer: admins, or the owning mentor/admin user.
// Companies are read-only.
export function canManageProject(user: SessionUser, p: ProjectOwner) {
  if (user.role === 'ADMIN') return true;
  if (p.ownerType !== 'COMPANY' && p.ownerUserId === user.id) return true;
  return false;
}

// Validate + normalise an owner triplet so exactly one target is set and it
// matches ownerType, and the referenced entity exists. Returns null if invalid.
export async function resolveOwner(input: {
  ownerType?: string;
  ownerUserId?: string | null;
  ownerCompanyId?: string | null;
}): Promise<ProjectOwner | null> {
  const t = input.ownerType;
  if (t === 'ADMIN' || t === 'MENTOR') {
    if (!input.ownerUserId) return null;
    const u = await prisma.user.findUnique({ where: { id: input.ownerUserId }, select: { role: true } });
    if (!u) return null;
    if (t === 'ADMIN' && u.role !== 'ADMIN') return null;
    if (t === 'MENTOR' && u.role !== 'MENTOR') return null;
    return { ownerType: t, ownerUserId: input.ownerUserId, ownerCompanyId: null };
  }
  if (t === 'COMPANY') {
    if (!input.ownerCompanyId) return null;
    const c = await prisma.company.findUnique({ where: { id: input.ownerCompanyId }, select: { id: true } });
    if (!c) return null;
    return { ownerType: 'COMPANY', ownerUserId: null, ownerCompanyId: input.ownerCompanyId };
  }
  return null;
}
