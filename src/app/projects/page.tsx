import Link from 'next/link';
import { GraduationCap, Github, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerDictionary } from '@/i18n/server';

export const dynamic = 'force-dynamic';

// Public showcase of community/company projects opted into visibility.
export default async function PublicProjectsPage() {
  const { t } = await getServerDictionary();
  const projects = await prisma.project.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true, technologies: true, repoUrl: true, demoUrl: true,
      ownerType: true, ownerUser: { select: { fullName: true } }, ownerCompany: { select: { name: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-600" />
            <span className="font-bold text-gray-900">InternshipCRM</span>
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">{t.projects.showcaseTitle}</h1>
        <p className="text-gray-500 mt-2 mb-8">{t.projects.showcaseSubtitle}</p>
        {projects.length === 0 ? (
          <p className="text-gray-400">{t.projects.noPublic}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => {
              const tech = Array.isArray(p.technologies) ? (p.technologies as string[]) : [];
              const owner = p.ownerType === 'COMPANY' ? p.ownerCompany?.name : p.ownerUser?.fullName;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                  <Link href={`/projects/${p.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">{p.name}</Link>
                  {owner && <p className="text-xs text-gray-500 mt-0.5">{t.projects.by} {owner}</p>}
                  {p.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{p.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tech.map((x) => <span key={x} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">{x}</span>)}
                  </div>
                  <div className="flex gap-3 mt-3 text-xs">
                    {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600"><Github className="h-3.5 w-3.5" />{t.projects.repo}</a>}
                    {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600"><ExternalLink className="h-3.5 w-3.5" />{t.projects.demo}</a>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
