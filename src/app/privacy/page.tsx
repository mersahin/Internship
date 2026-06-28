import Link from 'next/link';
import { getServerDictionary } from '@/i18n/server';

// Public privacy & data-retention notice.
export default async function PrivacyPage() {
  const { t } = await getServerDictionary();
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.privacy.title}</h1>
        <div className="space-y-3 text-sm text-gray-600">
          <p>{t.privacy.intro}</p>
          <p>{t.privacy.use}</p>
          <p>{t.privacy.retention}</p>
          <p>{t.privacy.rights}</p>
        </div>
        <Link href="/" className="inline-block mt-6 text-sm text-blue-600 hover:underline">
          ← {t.privacy.back}
        </Link>
      </div>
    </div>
  );
}
