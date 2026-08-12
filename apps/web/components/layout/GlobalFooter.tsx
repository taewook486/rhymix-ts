/**
 * GlobalFooter Component — SPEC-INSTALL-003 Group 5 + SPEC-LAYOUT-001 footerText
 *
 * REQ-INSTALL3-040: "Powered by Rhymix-TS" attribution 렌더
 * REQ-INSTALL3-041: Terms/Privacy 링크 금지 (페이지 없음)
 * REQ-INSTALL3-042: 온보딩 해제 상태와 무관하게 항상 렌더
 * REQ-LAYOUT-030~033: footerText가 주어지면 기본 attribution 대신 사용
 *
 * SPEC-FRONT-PARITY-001 M1: 문서당 <footer> 1개 원칙에 따라 이 컴포넌트가
 * 유일한 방문자 푸터다. 루트 레이아웃에 마운트되므로 DefaultLayout을 타지 않는
 * 라우트(`/board/[id]` 등)에도 도달한다.
 *
 * 이 컴포넌트는 의도적으로 **동기 + 무의존성**이다. FOOTER 슬롯 메뉴처럼
 * DB/auth 접근이 필요한 부분은 children으로 주입한다 — prisma/next-auth를
 * 직접 import하면 jsdom 테스트 환경에서 모듈 해석이 깨진다.
 */
import type { ReactNode } from 'react';

const DEFAULT_ATTRIBUTION = 'Powered by Rhymix-TS';

interface GlobalFooterProps {
  /** SPEC-LAYOUT-001 extraVars.footerText — 없으면 기본 attribution 사용 */
  footerText?: string;
  /** FOOTER 슬롯 메뉴 등 비동기 렌더가 필요한 콘텐츠 */
  children?: ReactNode;
}

export function GlobalFooter({ footerText, children }: GlobalFooterProps = {}) {
  return (
    <footer data-testid="global-footer" className="border-t py-6 mt-12">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        {children}
        <p className="mt-8">{footerText || DEFAULT_ATTRIBUTION}</p>
      </div>
    </footer>
  );
}
