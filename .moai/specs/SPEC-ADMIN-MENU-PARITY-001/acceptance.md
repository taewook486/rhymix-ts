# SPEC-ADMIN-MENU-PARITY-001 — acceptance

| AC | REQ | 검증 기준 | 기계 검증 명령 |
|----|-----|-----------|------------------|
| AC-AMP-001 | REQ-AMP-001 | `AdminSidebar.tsx`에 정확히 6개 그룹 헤더(사이트 제작/편집, 회원, 콘텐츠, 즐겨찾기, 설정, 고급)가 이 순서로 렌더된다 | `grep -n "section: '" apps/web/components/admin/AdminSidebar.tsx` 순서 확인 + 컴포넌트 렌더 테스트(RTL, 헤더 순서 배열 비교) |
| AC-AMP-002 | REQ-AMP-002 | "사이트 제작/편집" 그룹에 메뉴 편집·디자인 2개 링크만 존재 | RTL 테스트: 해당 섹션 내 `<a href>` 집합이 `{/admin/menu, /admin/site/design}`와 정확히 일치 |
| AC-AMP-003 | REQ-AMP-003 | "콘텐츠" 그룹에 `/admin/widgets` 링크가 없다 | `grep -A20 "section: '콘텐츠'" AdminSidebar.tsx \| grep -c "/admin/widgets"` → 0 |
| AC-AMP-004 | REQ-AMP-004 | "고급" 그룹에 위젯 시스템·내보내기·가져오기·관리자 로그·시스템 헬스·캐시 관리 6개 링크가 존재 | RTL 테스트: href 집합 비교 |
| AC-AMP-005 | REQ-AMP-005 | 즐겨찾기 1개 이상 존재 시, DOM 순서상 콘텐츠 섹션과 설정 섹션 사이에 즐겨찾기 블록이 렌더된다 | RTL 테스트: `container.querySelectorAll('h3')` 순서에서 콘텐츠 다음·설정 이전에 "즐겨찾기" 텍스트 존재 확인 |
| AC-AMP-006 | REQ-AMP-006 | "설정" 그룹에 일반 설정·알림 설정·보안 설정 3개 링크만 존재(메뉴 편집/디자인/내보내기/가져오기 없음) | RTL 테스트: href 집합 정확히 일치 |
| AC-AMP-007 | REQ-AMP-007 | 설치 완료 후 관리자 계정에 `AdminFavorite` 행이 정확히 2건 존재 | `packages/db/src/install/seed.test.ts` 신규 케이스: seed 실행 후 `prisma.adminFavorite.count({where:{memberId}})` === 2 |
| AC-AMP-008 | REQ-AMP-008 | `AddToFavoritesButton`, DnD 순서 변경, 임의 `/admin/` URL 즐겨찾기 기능이 회귀 없이 그대로 동작 | 기존 `AdminSidebar.test.tsx`/`AddToFavoritesButton.test.tsx` 전체 재실행 PASS(회귀 없음) — 신규 테스트 불요, 기존 테스트 통과가 곧 증거 |
| AC-AMP-009 | REQ-AMP-009 | 재배치 전/후 사이드바에 존재하는 전체 href 집합이 동일(추가/삭제 없음, 순서·그룹만 변경) | `grep -oP "href: '\\K[^']+" AdminSidebar.tsx \| sort` 재배치 전후 diff 없음(집합 비교, 순서 무관) |

## Edge Cases

- 즐겨찾기가 0개인 관리자(설치 직후가 아닌 기존 계정으로 로그인) — 즐겨찾기 블록 자체가 렌더되지 않아야 함(기존 `favorites.length > 0` 조건 유지, REQ-AMP-008과 결합 검증).
- REQ-AMP-007의 "알림 센터" 대응 라우트가 불명확한 경우 — plan.md §1 M2에 기록된 대로 manager-develop이 실제 라우트를 재확인하여 반영하고, 불확실성이 남으면 PASS-WITH-DEBT로 기록.
