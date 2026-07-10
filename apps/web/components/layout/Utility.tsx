/**
 * 유틸리티 바 — 도메인의 UTILITY 슬롯 메뉴를 렌더링하는 Server Component.
 * SPEC-MENU-001 Slice D: 다중 슬롯 메뉴 렌더링
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-030~034
 */
import { headers } from 'next/headers';
import { MenuSlotRenderer } from './MenuRenderer';

export async function Utility() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  if (!Number.isFinite(domainId) || domainId <= 0) return null;

  return (
    <div className="border-b bg-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-2">
        {/* SPEC-MENU-001 Slice D: UTILITY 슬롯 렌더링 (REQ-MENU-030~034) */}
        <MenuSlotRenderer slot="UTILITY" domainId={domainId} />
      </div>
    </div>
  );
}
