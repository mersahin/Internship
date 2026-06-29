'use client';

import { DocumentsManager } from '@/components/DocumentsManager';
import { useT } from '@/i18n/client';

export default function AdminDocumentsPage() {
  const t = useT();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.documents.templates}</h1>
        <p className="text-gray-500 mt-1">{t.documents.templatesSubtitle}</p>
      </div>
      <div className="max-w-2xl">
        <DocumentsManager templates canUpload canDelete />
      </div>
    </div>
  );
}
