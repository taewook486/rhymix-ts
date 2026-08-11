# SPEC-ADMIN-MENU-PARITY-001 — acceptance

각 AC는 대응 REQ의 GEARS 패턴(Ubiquitous/State-Driven/Event-Driven/Unwanted)을 그대로
반영한다. 검증은 렌더 결과(RTL) 또는 정적 소스 검사(grep) 중 실제로 위반을 탐지할 수 있는
방식을 사용한다(plan-auditor 1차 감사 D3/D4 지적 반영 — 배열 존재 여부가 아닌 렌더 결과 기준).

| AC | REQ | GEARS 검증 기준 | 기계 검증 명령 |
|----|-----|------------------|------------------|
| AC-AMP-001 | REQ-AMP-001 | **The** 사이드바 렌더 결과에서 "사이트 제작/편집", "회원", "콘텐츠", "설정", "고급" 5개 그룹 헤더(`<h3>`)가 **shall** 이 순서로 나타난다(즐겨찾기·대시보드 헤더는 순서 판정에서 제외). | RTL: `container.querySelectorAll('h3')`의 textContent 배열에서 5개 라벨만 필터링한 부분수열이 `['사이트 제작/편집','회원','콘텐츠','설정','고급']`과 정확히 일치하는지 `toEqual`로 검증 |
| AC-AMP-002 | REQ-AMP-002 | **The** "사이트 제작/편집" 그룹 **shall** 정확히 `/admin/menu`, `/admin/site/design` 2개 링크만 포함한다. | RTL: 해당 `<h3>` 다음 `<ul>` 내 모든 `<a href>` 집합이 `{'/admin/menu','/admin/site/design'}`과 정확히 일치 |
| AC-AMP-003 | REQ-AMP-003 | **The** "고급" 그룹 **shall** `/admin/settings/export`, `/admin/settings/import`, `/admin/logs`, `/admin/system`, `/admin/system/cache` 5개 링크를 포함하고, **shall not** `/admin/widgets`를 포함한다. | RTL: href 집합이 정확히 5개 세트와 일치 + `/admin/widgets` 미포함(`not.toContain`) |
| AC-AMP-004 | REQ-AMP-004 | **While** 현재 관리자에게 즐겨찾기가 1건 이상 있으면 **the system shall** "콘텐츠" 헤더와 "설정" 헤더 사이(DOM 순서)에 "즐겨찾기" 헤더를 렌더한다. **While** 즐겨찾기가 0건이면 **the system shall not** 즐겨찾기 섹션을 렌더한다. | RTL 테스트 2건: (a) mock favorites 1건 이상 → `h3` 배열에서 "즐겨찾기" 인덱스가 "콘텐츠"보다 크고 "설정"보다 작음. (b) mock favorites 0건 → `screen.queryByText('즐겨찾기')`가 null |
| AC-AMP-005 | REQ-AMP-005 | **The** "설정" 그룹 **shall** 정확히 `/admin/settings/site`, `/admin/settings/notification`, `/admin/settings/security` 3개 링크만 포함한다. | RTL: href 집합 정확히 일치(메뉴 편집·디자인·내보내기·가져오기 미포함 확인 포함) |
| AC-AMP-006 | REQ-AMP-006 | **When** 설치 마법사가 완료되면 **the system shall** 신규 관리자의 `AdminFavorite`를 정확히 2건 생성하며, 각 행의 `label`/`href`/`listOrder`가 REQ-AMP-006에 명시된 값과 일치한다. | `seed.test.ts` 신규 케이스: seed 실행 후 `prisma.adminFavorite.findMany({where:{memberId},orderBy:{listOrder:'asc'}})` 결과가 `[{label:'메일·SMS·알림 발송 설정', listOrder:0, href: expect.stringMatching(/^\/admin\//)}, {label:'알림 센터', listOrder:1, href: expect.stringMatching(/^\/admin\//)}]`와 일치(`href` 정확값은 구현 시점 재확인 대상 — plan.md M2 참고, 정확 매치 대신 `/admin/` 프리픽스 검증으로 완화하여 PASS-WITH-DEBT 여지를 남김) |
| AC-AMP-007 | REQ-AMP-007 | **The system shall not** `AddToFavoritesButton`, DnD 순서 변경, 임의 `/admin/` URL 즐겨찾기 기능을 제거·은닉·회귀시킨다. | 기존 `AdminSidebar.test.tsx`/`AddToFavoritesButton.test.tsx` 전체 재실행 PASS(회귀 없음) — 신규 테스트 불요, 기존 테스트 통과가 곧 증거 |
| AC-AMP-008 | REQ-AMP-008 | **The** 재배치 전/후 사이드바에 존재하는 전체 href 집합이 **shall** 동일하다(추가/삭제 없음, 순서·그룹만 변경). | `grep -oP "href: '\K[^']+" AdminSidebar.tsx \| sort` 재배치 전후 diff 없음(집합 비교, 순서 무관) — `/admin/widgets` 포함 확인 |

## Edge Cases

- 즐겨찾기가 0개인 관리자(설치 직후가 아닌 기존 계정으로 로그인) — AC-AMP-004(b)로 커버.
- REQ-AMP-006의 "알림 센터" 대응 라우트가 불명확한 경우 — plan.md §1 M2에 기록된 대로
  manager-develop이 실제 라우트를 재확인하여 반영하고, AC-AMP-006의 검증 완화(href 정확값
  대신 프리픽스 검증)로 불확실성을 흡수한다. 남으면 PASS-WITH-DEBT로 기록.
