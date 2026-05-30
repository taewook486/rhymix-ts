// SPEC-LAYOUT-001 Slice C — 기본 레이아웃 컴포넌트 (React Server Component)
// REQ-LAYOUT-030, REQ-LAYOUT-031, REQ-LAYOUT-032, REQ-LAYOUT-033

import type { ReactNode } from 'react';
import type { ParsedExtraVars } from '@rhymix-ts/core';

/**
 * DefaultLayout Props.
 * REQ-LAYOUT-031: children과 extraVars를 받는다.
 */
interface DefaultLayoutProps {
  children: ReactNode;
  extraVars: ParsedExtraVars;
}

/**
 * 기본 레이아웃 컴포넌트 (비동기 Server Component).
 *
 * - header를 렌더하지 않음 (REQ-LAYOUT-032: GlobalHeader는 apps/web/app/layout.tsx에 있음)
 * - Tailwind 유틸리티 클래스만 사용 (별도 CSS 파일 없음)
 * - 반응형: 320px ~ 1920px 뷰포트 지원 (REQ-LAYOUT-033)
 *
 * REQ-LAYOUT-031
 */
// @MX:ANCHOR: [AUTO] DefaultLayout — 기본 레이아웃 RSC 진입점
// @MX:REASON: registry.ts 등록 후 renderModuleWithLayout, install.ts, 테스트에서 참조됨 (fan_in >= 3)
export default async function DefaultLayout({ children, extraVars }: DefaultLayoutProps) {
  return (
    <div
      data-rhymix-layout="default"
      data-layout-type={extraVars.layoutType}
      className="min-h-screen flex flex-col"
    >
      {/* 메인 콘텐츠 영역 — 반응형 컨테이너 */}
      <main className="container mx-auto px-4 py-8 min-h-screen flex-1 sm:px-6 md:px-8 lg:px-12">
        {children}
      </main>

      {/* 푸터 — extraVars.footerText 또는 기본 텍스트 */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground sm:py-6">
        {extraVars.footerText ?? 'Powered by Rhymix-TS'}
      </footer>
    </div>
  );
}
