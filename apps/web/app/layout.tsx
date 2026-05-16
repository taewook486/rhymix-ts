import type { Metadata } from 'next';
import './globals.css';

import { AutoLoginRefresher } from '@/components/auth/AutoLoginRefresher';
import { SessionProviderWrapper } from '@/components/auth/SessionProviderWrapper';

export const metadata: Metadata = {
  title: {
    default: 'Rhymix-TS',
    template: '%s | Rhymix-TS',
  },
  description: 'TypeScript + Next.js 16 redesign of Rhymix CMS',
  generator: 'Rhymix-TS',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <SessionProviderWrapper>
          <AutoLoginRefresher />
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
