/**
 * FooterMenuSlot — 도메인의 FOOTER 슬롯 메뉴를 렌더링하는 Server Component.
 *
 * SPEC-MENU-001 Slice D REQ-MENU-030~034 이행 (구 Footer.tsx의 책임을 승계).
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-030~034
 *
 * SPEC-FRONT-PARITY-001 M1: 구 Footer.tsx가 자체 <footer>를 렌더해 문서당 푸터가
 * 중복됐다. 이 컴포넌트는 <footer> 태그를 소유하지 않고 슬롯 내용만 렌더하며,
 * GlobalFooter의 children으로 합성된다.
 *
 * 이 파일이 prisma/next-auth 의존(MenuRenderer 경유)을 격리하는 경계다 —
 * GlobalFooter는 동기·무의존 상태로 유지되어야 테스트 가능하다.
 */
import { headers } from 'next/headers';
import { MenuSlotRenderer } from './MenuRenderer';

export async function FooterMenuSlot() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  // 도메인 컨텍스트가 없는 라우트(install, 에러 페이지)에서는 슬롯을 건너뛴다.
  if (!Number.isFinite(domainId) || domainId <= 0) return null;

  return <MenuSlotRenderer slot="FOOTER" domainId={domainId} />;
}
