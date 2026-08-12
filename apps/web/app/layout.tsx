import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

import { AutoLoginRefresher } from '@/components/auth/AutoLoginRefresher';
import { SessionProviderWrapper } from '@/components/auth/SessionProviderWrapper';
import { TRPCProvider } from '@/providers/TRPCProvider';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { GlobalFooter } from '@/components/layout/GlobalFooter';
import { Utility } from '@/components/layout/Utility';
import { ColorSchemeProvider } from '@/components/theme/ColorSchemeProvider';
import { colorSchemeScript } from '@/lib/theme/color-scheme-script';
import { prisma } from '@/lib/db/prisma';
import { getSeoSettings } from '@rhymix-ts/admin';

// SPEC-SEO-001 REQ-SEO-001, AC-SEO-005: 관리자 SEO 설정의 기본 설명이
// 변경되면 홈페이지 meta description에 반영되어야 하므로, 정적 객체 대신
// generateMetadata()로 매 요청마다 admin 설정을 읽는다.
export async function generateMetadata(): Promise<Metadata> {
  const { defaultMetaDescription } = await getSeoSettings({ prisma });

  return {
    title: {
      default: 'Rhymix-TS',
      template: '%s | Rhymix-TS',
    },
    description: defaultMetaDescription || 'TypeScript + Next.js 16 redesign of Rhymix CMS',
    generator: 'Rhymix-TS',
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // SPEC-SEO-001 REQ-SEO-006, AC-SEO-006: Google Analytics ID 설정 시 전 페이지에 스크립트 삽입
  const { googleAnalyticsId, naverSiteVerificationCode } = await getSeoSettings({ prisma });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* REQ-THEME-POLISH-033: FOIT 방지 — React hydration 전에 다크모드 클래스 주입 */}
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
        {/* SPEC-SEO-001 REQ-SEO-006: Naver 사이트 인증 코드 설정 시 전 페이지에 삽입 */}
        {naverSiteVerificationCode && (
          <meta name="naver-site-verification" content={naverSiteVerificationCode} />
        )}
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');`}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-screen antialiased">
        <ColorSchemeProvider>
          <TRPCProvider>
            <SessionProviderWrapper>
              <AutoLoginRefresher />
              <Utility />
              <GlobalHeader />
              <main>{children}</main>
              <GlobalFooter />
            </SessionProviderWrapper>
          </TRPCProvider>
        </ColorSchemeProvider>
      </body>
    </html>
  );
}
