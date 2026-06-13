import type { Metadata } from 'next';
import './globals.css';

import { AutoLoginRefresher } from '@/components/auth/AutoLoginRefresher';
import { SessionProviderWrapper } from '@/components/auth/SessionProviderWrapper';
import { TRPCProvider } from '@/providers/TRPCProvider';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { ColorSchemeProvider } from '@/components/theme/ColorSchemeProvider';
import { colorSchemeScript } from '@/lib/theme/color-scheme-script';

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
      <head>
        {/* REQ-THEME-POLISH-033: FOIT 방지 — React hydration 전에 다크모드 클래스 주입 */}
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ColorSchemeProvider>
          <TRPCProvider>
            <SessionProviderWrapper>
              <AutoLoginRefresher />
              <GlobalHeader />
              <main>{children}</main>
            </SessionProviderWrapper>
          </TRPCProvider>
        </ColorSchemeProvider>
      </body>
    </html>
  );
}
