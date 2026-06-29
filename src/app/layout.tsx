import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getLocale } from '@/i18n/server';
import { getDictionary } from '@/i18n/dictionaries';

export const metadata: Metadata = {
  title: 'Internship CRM - Mentor-Mentee Management',
  description: 'A comprehensive CRM for managing mentor-mentee relationships and internship programs',
  applicationName: 'Internship CRM',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'InternshipCRM' },
};

export const viewport: Viewport = {
  themeColor: '#1D4ED8',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return (
    <html lang={locale}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
        >
          {dict.a11y.skipToContent}
        </a>
        <Providers locale={locale} dict={dict}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
