/**
 * GlobalFooter Component - SPEC-INSTALL-003 Group 5, SPEC-MENU-001 Slice D
 *
 * Consolidated footer that handles:
 * - REQ-INSTALL3-040: "Powered by Rhymix-TS" attribution 렌더
 * - REQ-INSTALL3-041: Terms/Privacy 링크 금지 (페이지 없음)
 * - REQ-INSTALL3-042: 온보딩 해제 상태와 무관하게 항상 렌더
 * - REQ-MENU-030~034: FOOTER 슬롯 메뉴 렌더 (from former Footer.tsx)
 *
 * M1 consolidation: Absorbed Footer.tsx's MenuSlotRenderer responsibility.
 * This is the only footer reaching `/board/[id]` (mounted in ROOT layout).
 */
import { headers } from 'next/headers';
import { MenuSlotRenderer } from './MenuRenderer';

export async function GlobalFooter() {
  const h = await headers();
  const domainIdStr = h.get('x-domain-id');
  const domainId = domainIdStr != null ? Number(domainIdStr) : NaN;

  // MenuSlotRenderer only renders when we have a valid domainId
  // For non-domain contexts (install, error pages), we skip the slot but keep attribution
  const shouldRenderMenuSlot = Number.isFinite(domainId) && domainId > 0;

  return (
    <footer data-testid="global-footer" className="border-t py-6 mt-12">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        {/* SPEC-MENU-001 REQ-MENU-030~034: FOOTER 슬롯 메뉴 렌더 */}
        {shouldRenderMenuSlot && (
          <MenuSlotRenderer slot="FOOTER" domainId={domainId} />
        )}

        {/* REQ-INSTALL3-040: 항상 렌더되는 attribution */}
        <p className="mt-8">Powered by Rhymix-TS</p>
      </div>
    </footer>
  );
}
