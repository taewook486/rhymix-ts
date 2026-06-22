/**
 * GlobalFooter Component - SPEC-INSTALL-003 Group 5
 *
 * REQ-INSTALL3-040: "Powered by Rhymix-TS" attribution 렌더
 * REQ-INSTALL3-041: Terms/Privacy 링크 금지 (페이지 없음)
 * REQ-INSTALL3-042: 온보딩 해제 상태와 무관하게 항상 렌더
 */

export function GlobalFooter(): JSX.Element {
  return (
    <footer data-testid="global-footer" className="border-t py-6 mt-12">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>Powered by Rhymix-TS</p>
      </div>
    </footer>
  );
}
