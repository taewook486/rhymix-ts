/**
 * 글로벌 푸터 — 도메인의 FOOTER 슬롯 메뉴를 렌더링하는 Server Component.
 * SPEC-MENU-001 Slice D: 다중 슬롯 메뉴 렌더링
 * @MX:SPEC: SPEC-MENU-001 REQ-MENU-030~034
 */
import { headers } from 'next/headers';
import { MenuSlotRenderer } from './MenuRenderer';

export async function Footer() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  if (!Number.isFinite(domainId) || domainId <= 0) return null;

  return (
    <footer className="border-t bg-zinc-50 mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* SPEC-MENU-001 Slice D: FOOTER 슬롯 렌더링 (REQ-MENU-030~034) */}
        <MenuSlotRenderer slot="FOOTER" domainId={domainId} />
        <div className="mt-8 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} Rhymix-TS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
