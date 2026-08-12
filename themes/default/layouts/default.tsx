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
      {/*
        메인 콘텐츠 영역 — 반응형 컨테이너.
        SPEC-FRONT-PARITY-001 REQ-FP-004: 문서당 <main> 1개 원칙에 따라 <div>를 쓴다.
        시맨틱 <main>은 루트 레이아웃(apps/web/app/layout.tsx)이 소유하며, 이 레이아웃은
        그 안에 렌더되므로 여기서 <main>을 쓰면 중첩된다.
      */}
      <div className="container mx-auto px-4 py-8 min-h-screen flex-1 sm:px-6 md:px-8 lg:px-12">
        {children}
      </div>
    </div>
  );
}
