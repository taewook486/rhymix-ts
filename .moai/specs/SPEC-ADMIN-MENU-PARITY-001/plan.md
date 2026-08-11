# SPEC-ADMIN-MENU-PARITY-001 — plan

## §0. 설계 요약

`AdminSidebar.tsx`의 `NAV` 배열 순서·귀속만 재구성하는 작업(신규 컴포넌트 없음). 데이터 모델
변경 없음(`AdminFavorite`는 이미 존재). 유일한 백엔드 변경은 설치 시드 로직 1건 추가.

## §1. 파일별 변경 계획

### M1 — 사이드바 NAV 배열 재구성 (REQ-AMP-001~004, 006, 009)

파일: `apps/web/components/admin/AdminSidebar.tsx`

- `NAV` 배열을 6그룹 순서로 재작성: `사이트 제작/편집`, `회원`, `콘텐츠`, `설정`, `고급`
  (즐겨찾기는 이미 별도 렌더링 블록이라 배열에 없음 — 위치만 확인).
  - `사이트 제작/편집`: `/admin/menu`(메뉴 편집), `/admin/site/design`(디자인) — 기존
    "사이트 설정" 섹션에서 이동.
  - `회원`: 기존 항목 그대로(회원 관리/그룹/등록/설정, 포인트) — 순서만 이동.
  - `콘텐츠`: 기존 항목에서 `위젯 시스템` 제거(고급으로 이동), 나머지 그대로.
  - `설정`: 일반 설정/알림 설정/보안 설정만 남김(메뉴 편집·디자인·내보내기·가져오기 제거).
  - `고급`: 위젯 시스템, 내보내기, 가져오기, 관리자 로그, 시스템 헬스, 캐시 관리 — 신설
    (기존 "시스템" 섹션 3항목 + 콘텐츠에서 옮긴 위젯 + 설정에서 옮긴 내보내기/가져오기).
  - "대시보드" 섹션은 유지(그룹 목록과 별도).
- href 값은 전부 그대로 유지 — `label`/`icon`도 변경하지 않음(순서·소속 그룹만 변경, REQ-AMP-009).
- 즐겨찾기 렌더링 블록(현재 `NAV.map` 앞) 위치를 콘텐츠 섹션과 설정 섹션 "사이" — 즉
  콘텐츠 그룹 렌더링 이후 & 설정 그룹 렌더링 이전으로 이동(현재는 전체 NAV보다 앞에 렌더링됨,
  REQ-AMP-005). `NAV` 배열을 그룹 배열로 유지하되, `콘텐츠` 이후 인덱스에서 즐겨찾기 블록을
  삽입하도록 렌더 로직만 조정(배열 자체를 쪼갤 필요는 없음 — `NAV.map` 중간에 조건부 렌더 삽입).

### M2 — 설치 시 즐겨찾기 기본 시딩 (REQ-AMP-007)

파일: `packages/db/src/install/seed.ts`

- 설치 트랜잭션에 관리자 계정 생성 직후, `AdminFavorite` 2건 생성 로직 추가:
  - `{ label: '메일·SMS·알림 발송 설정', href: '/admin/settings/notification', listOrder: 0 }`
  - `{ label: '알림 센터', href: '/admin/settings/notification', listOrder: 1 }` — **주의**:
    research.md에서 레거시의 "알림 센터"(`dispNcenterliteAdminConfig`)에 대응하는 뉴버전 화면이
    명확하지 않음(§3 언급). manager-develop이 구현 시점에 실제 라우트를 재확인하여 정확한
    href로 채운다(현재 알려진 후보: `/admin/settings/notification` 동일 화면 재사용 —
    구분되는 별도 화면이 없다면 두 번째 항목은 라벨만 다르게 하거나, 실제 대응 화면을
    찾아 반영). 이 불확실성은 REQ-AMP-007을 PASS-WITH-DEBT로 마감할 수 있는 사유로 인정.
- `AddToFavoritesButton`이 이미 `admin.favorite.add` mutation을 사용 중이므로, 시드 로직은
  동일 tRPC service 계층(`packages/db` 또는 admin favorite router의 서비스 함수)을 재사용하거나
  `prisma.adminFavorite.create`로 직접 삽입(설치 스크립트는 이미 트랜잭션 내에서 raw
  prisma client를 사용하는 관례 — 기존 `seed.ts` 패턴을 따른다).

## §2. PRESERVE 목록

- `AdminFavorite` Prisma 모델 스키마 (변경 없음)
- `admin.favorite.{list,add,remove,reorder}` tRPC 라우터 (변경 없음)
- `AddToFavoritesButton.tsx` (변경 없음)
- `SortableFavoriteItem`/DnD 로직 (변경 없음)
- 즐겨찾기 섹션의 "즐겨찾기 없으면 렌더 안 함" 조건(`favorites.length > 0`) 유지

## §3. 마일스톤

- M1: 사이드바 재배치 (단일 파일, `AdminSidebar.tsx`)
- M2: 설치 시 즐겨찾기 시딩 (단일 파일, `seed.ts`)

파일 소유 충돌 없음(M1/M2 서로 다른 파일) — 순차 진행.

## §4. 클래리피케이션

없음(사용자 Implementation Kickoff Approval에서 REQ 수정 없이 승인).
