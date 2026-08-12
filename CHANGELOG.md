# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

#### SPEC-FRONT-PARITY-001 — 방문자 화면 레거시 parity 1단계 (완료)

> status: completed — 레거시 Rhymix(PHP) 방문자 화면 대비 (a) 인덱스 모듈 정책을 게시판
> 목록에서 소개 페이지로 전환하고, (b) 문서당 중복 렌더되던 `<footer>` 3개·`<main>` 3개를
> 각각 1개로 정리. 7개 AC(AC-FP-001~007) 전부 PASS. 2개 마일스톤(M1~M2), 전부 main에
> 직접 push(Route A — Hybrid Trunk 1인 OSS). 모든 AC는 DB 전체 재설치 후 실제 브라우저
> 렌더 결과로 검증했다(mock 단위 테스트는 중복 렌더·연결 누락을 잡지 못한다는 실측 교훈).

- **M1 — 중복 마크업 해소** (`64136f5`, `3b003d5`) — 동시에 렌더되던 푸터 3개
  (`GlobalFooter.tsx`, `Footer.tsx`, `themes/default/layouts/default.tsx`)를 `GlobalFooter`
  하나로 통합(REQ-FP-003). `GlobalFooter`는 **동기·무의존** 컴포넌트로 유지하고, DB/auth
  접근이 필요한 FOOTER 슬롯 메뉴는 신규 `FooterMenuSlot.tsx`(async)로 분리해 루트
  레이아웃에서 children으로 합성 — 테스트 가능성과 런타임 기능을 동시에 만족시킨다.
  `<main>` 중첩은 게시판 모듈 3곳(`index-page.tsx`, `view-page.tsx` 2곳)과 테마 레이아웃
  (`default.tsx`)을 `<div>`로 낮춰 루트 `app/layout.tsx` 1개만 남겼다(REQ-FP-004).
  루트 `<main>`은 범위 밖 22개 파일에 영향을 주므로 유지. dead `Footer.tsx`는 삭제.
  `extraVars.footerText`(SPEC-LAYOUT-001) 렌더 책임은 `GlobalFooter`로 이전하고 해당
  테스트도 함께 옮겼다.
- **M2 — 인덱스 모듈 page 전환** (`068eefb`) — 설치 시드에 page 모듈 인스턴스 1건
  (`mid='main'`, `moduleCode='page'`)을 추가하고 `domain.indexModuleInstanceId`를 board에서
  이 인스턴스로 변경(REQ-FP-001). 본문에는 제목·소개 문단·`/admin` 링크를 포함한 환영
  콘텐츠를 시딩(REQ-FP-002). board/notice/qna 인스턴스와 샘플 문서는 그대로 유지되며
  헤더 메뉴로 접근한다(REQ-FP-005).
- **검증 e2e 신설** (`6f69b12`) — `apps/web/e2e/front-parity.spec.ts`. `/`·`/board`·
  `/board/[id]` 3개 라우트에서 `<footer>` 1개·`<main>` 1개·`main main` 중첩 0개를 실제
  브라우저 렌더로 판정한다. `/board/[id]`는 `renderModuleWithLayout`을 호출하지 않아
  DefaultLayout이 적용되지 않는 라우트라 반드시 샘플에 포함해야 한다. 로그인/비로그인
  두 경우 모두 검증.
- **의도된 변경 (회귀 아님)** — `seed.test.ts:406`·`:469`의
  `indexModuleInstanceId === MODULE_ID.board` 단언 2건을 page 인스턴스 기준으로 갱신.
  REQ-FP-001이 기존 불변식을 의도적으로 뒤집은 결과이며 acceptance.md의
  "의도된 변경 carve-out"에 명시된 필수 산출물이다.
- **알려진 부채** — 도메인 레이아웃의 `extraVars.footerText`를 루트 레이아웃까지 전달하는
  배선은 미완이다(루트에 module-instance 컨텍스트가 없어 별도 조회 필요). `GlobalFooter`가
  `footerText` prop을 받도록 구조는 갖췄으나 현재는 항상 기본 attribution이 렌더된다.
- **범위 밖 발견 사항** — (1) `apps/web/e2e/support/db-reset.ts`의 TRUNCATE 목록에
  `theme_assignments`가 빠져 있어 한 번 설치된 뒤 재설치를 시도하면
  `Unique constraint failed on (scope, refType, refId)`로 트랜잭션이 롤백된다. 기존
  `install-happy-path.spec.ts`도 동일하게 실패한다. (2) `prisma migrate reset` 후에는
  enum 타입 OID가 재생성되어 dev 서버 재시작이 필수다
  (`cache lookup failed for type NNNNN`). (3) `/install/**` 라우트는 여전히 `<main>`
  중첩 상태이며, 본 SPEC의 Out of Scope인 22개 파일 전역 정리 대상이다.

#### SPEC-ADMIN-MENU-PARITY-001 — 관리자 메뉴 레거시 parity (완료)

> status: completed — 레거시 Rhymix(PHP) admin GNB 6그룹 구조(사이트 제작/편집→회원→콘텐츠→
> 즐겨찾기→설정→고급) 대비 rhymix-ts `AdminSidebar.tsx`를 재배치하고, 설치 시 기본 즐겨찾기
> 시딩(격차 1건)을 보강. 8개 AC(AC-AMP-001~008) 중 7개 PASS + 1개 PASS-WITH-DEBT. 2개
> 마일스톤(M1~M2), 전부 main에 직접 push(Route A — Hybrid Trunk 1인 OSS).

- **M1 — 관리자 사이드바 6그룹 재배치** (`2354bf0`) — `AdminSidebar.tsx`의 NAV 배열을 5개 고정
  그룹(사이트 제작/편집, 회원, 콘텐츠, 설정, 고급)으로 재편(REQ-AMP-001~003, 005), "메뉴 편집"/
  "디자인"을 "사이트 제작/편집"으로, "내보내기"/"가져오기"를 "고급"으로 이동, 기존 "시스템" 섹션을
  "고급" 그룹 하위로 편입. 즐겨찾기 렌더 블록을 콘텐츠 그룹과 설정 그룹 사이로 이동(REQ-AMP-004,
  즐겨찾기 1건 이상일 때만 조건부 렌더 — 기존 동작 유지). 위젯 시스템은 콘텐츠 그룹에 유지
  (`SPEC-CONTENT-PARITY-001` 기존 결정 존중). 전체 href 22개가 재배치 전후 동일 집합 유지
  (REQ-AMP-008), label/icon 변경 없음. RTL 테스트 7건 추가(AC-AMP-001~005, 008, 004b)
- **M2 — 설치 시 기본 즐겨찾기 시딩** (`e8f3ec6`) — `seedInstall`에 관리자 계정 생성 직후,
  `ModuleInstance` 생성 이전(단일 트랜잭션 내부, 부분 시드 방지)으로 `AdminFavorite` 2건 생성
  단계 추가(REQ-AMP-006). `seed.test.ts`에 AC-AMP-006 검증 케이스 2건 추가
- **PASS-WITH-DEBT (AC-AMP-006)**: 레거시 "알림 센터"(`dispNcenterliteAdminConfig`) 1:1 대응
  화면이 rhymix-ts에 없음을 실측(`apps/web/app/admin` 하위 라우트) 재확인 — 두 즐겨찾기 모두
  `/admin/settings/notification`을 가리키도록 구현하고 label로만 구분("메일·SMS·알림 발송 설정"
  / "알림 센터"). `acceptance.md`가 이 완화(href 정확값 대신 `/admin/` 프리픽스 검증)를 사전에
  명시적으로 허용
- 나머지 7개 AC(AC-AMP-001~005, 007~008) 전부 실제 구현 코드 기준 PASS 확인(`AdminSidebar.test.tsx`
  RTL 전수 재검증). `AddToFavoritesButton`, DnD 재정렬, 임의 `/admin/` URL 즐겨찾기 등 기존 rhymix-ts
  고유 기능은 이번 SPEC에서 전혀 수정하지 않아 회귀 없음(REQ-AMP-007)

#### SPEC-MEMBER-PARITY-001 — 관리자 회원 메뉴 레거시 parity (완료)

> status: completed — 레거시 Rhymix(PHP) admin 대비 확인된 2개 기능 격차(AC-MPAR-001~005) 전체 구현+검증
> 완료. 5개 마일스톤(M1~M5) + 후속 버그 수정 1건, 전부 main에 직접 push(Route A — Hybrid Trunk 1인 OSS).

- **M1 — 포인트 사이드바 링크** (`7fefa0f`) — `apps/web/components/admin/AdminSidebar.tsx`의 "회원"
  섹션에 이미 완료된 `/admin/site/points`(SPEC-POINT-001) 페이지로의 링크 추가, 사이드바에서 고립되어
  있던 포인트 관리 화면을 접근 가능하게 함
- **M2 — 정렬 가능한 컬럼 헤더** (`0bfe0b1`) — `apps/web/app/admin/members/page.tsx` +
  `MemberTable.tsx`에 5개 컬럼(userId/emailAddress/nickName/createdAt/lastLoginAt) 정렬 기능 구현,
  URL 쿼리 파라미터(`searchParams.sortBy`/`sortOrder`) 기반 상태 관리, `admin.user.list` 프로시저에
  `sortBy`/`sortOrder` 파라미터 확장
- **M3 — 회원 그룹 필터** (`c7293c3`) — 회원 목록 화면에 "그룹전체" + `MemberGroup` 동적 조회 드롭다운
  추가, `admin.user.list`에 `groupId` 파라미터 확장(기존 상태 필터와 AND 조합)
- **M4 — 다중 필드 검색 대상 선택** (`ee0cf5c`) — 검색 대상 드롭다운(userId/emailAddress/nickName/
  phoneNumber/lastLoginAt/description 6개 필드) + 검색어 입력창 조합 구현, `admin.user.list`에
  `searchTarget` 파라미터 확장(case-insensitive 부분 일치)
- **M5 — 체크박스 + 일괄 삭제** (`5049675`) — `MemberTable.tsx`에 per-row 체크박스 + "Check All" 헤더
  체크박스 + 확인 다이얼로그 구현, 기존 `admin.user.bulk` 프로시저를
  `action: z.enum(['suspend', 'deny', 'approve', 'delete'])`로 확장하여 `action === 'delete'`일 때
  `softDeleteUser()`로 일괄 soft delete(`status → DELETED`) 처리(AuditLog 자동 기록)
- **버그 수정 — lastLoginAt 검색 크래시** (`58ba3ef`) — M4에서 도입한 `lastLoginAt` 검색 대상이
  실제로는 `PrismaClientValidationError`로 `admin.user.list`를 500 크래시시키는 버그였음(DateTime?
  컬럼은 문자열 `contains` 필터를 지원하지 않음). `parseSearchDayRange()` 헬퍼로 검색어를 UTC 하루
  범위(`gte`/`lt`)로 파싱하는 방식으로 수정, 파싱 불가능한 검색어는 크래시 대신 빈 결과 반환
- 5개 AC(AC-MPAR-001~005) 전부 실제 구현 코드 기준 PASS 확인.
  `apps/web/server/api/routers/admin/user.test.ts` 24개 테스트 전부 GREEN(lastLoginAt 크래시 수정
  신규 케이스 2건 포함)

#### SPEC-MEMBER-ADMIN-001 — 관리자 회원 메뉴 레거시 기능 완성 (완료)

> status: completed — 5개 슬라이스(A~E) 전체 구현+검증 완료(REQ-MADM-001~035).

- **Slice A — 닉네임 변경 기록 조회 UI** (`37c9038`) — `admin.user.nicknameLog.list` 기반
  읽기전용 페이지네이션 테이블
- **Slice B — 아이디/닉네임 차단 관리 UI** (`ae96c33`) — `deniedList.list/add/remove` CRUD 화면
- **Slice C — 회원 그룹 재배치 + 이미지 마크** (`cd054f9`) — `admin.group.reorder` 신규
  프로시저(단일 트랜잭션 원자적 `listOrder` 갱신), dnd-kit 기반 재배치 UI, `imageMark` 노출
- **Slice D — 회원 설정 "기본 설정" 탭** (`67dc7a7`, `9fcc4fe`, `df64248`, `9a2dc54`) — 가입
  허가 3값 모드(ALLOW/DENY/SIGNUP_KEY), 닉네임 특수문자/띄어쓰기 정책, 비밀번호 보안수준별
  문자 구성 요건(REQ-MADM-025), Argon2id timeCost 안전범위(2~10) 클램프 + 로그인 재해싱
  자동업그레이드 토글, 목록 프로필사진 표시 토글
- **Slice E — 이메일 호스트 관리(허용/차단 도메인)** (`dc3bdd5`, `2f5e137`) — 신규
  `ManagedEmailHost` 모델(citext host, `[siteId,host,policy]` unique) + 마이그레이션,
  `isEmailHostAllowed` 화이트리스트/블랙리스트 정책 평가(충돌 시 ALLOW 우선), `signup()`
  파이프라인 배선(REQ-MADM-032~035), 관리자 UI(`admin/members/email-hosts`). AC-E1~E5 전부
  실 Postgres에 대해 재현 검증(등록/삭제 영속, 화이트리스트/블랙리스트 실집행, 무제한 기본값,
  거부 시 부분생성 방지)
- 총 11개 테스트 파일, 104개 테스트 전부 PASS (Slice A~E 전체)

#### SPEC-MENU-001 — 사이트 메뉴 편집 완성 + 다중 메뉴 존 렌더링 (진행 중)

> status: in-progress — Slice A/B/C/E는 구현+검증 완료, Slice D는 헤더 슬롯 렌더만 실측 확인
> (Footer/Utility 슬롯 배정, groupIds ACL, 중첩 트리 렌더는 admin 로그인 세션이 필요해 미검증). Slice F는
> 사용자 결정으로 백로그 유예.

- **MenuItem 편집기 필드 완성** (`d03caf0`) — icon/cssClass/description/openInNewWindow/expand/listOrder
  전체 노출, groupIds ACL 편집, 버튼 상태(normalBtn/hoverBtn/activeBtn) JSON 편집, stale 안내 문구 제거
- **DnD 영속화** (`c5f046d`) — `MenuItemDnDTree`의 same-level·cross-level 드롭을
  `admin.menuItem.reorder`에 연결, 순환/깊이초과 거부, 실패 시 롤백
- **다중 메뉴 존(slot) 스키마 + 레이아웃 렌더링** (`df6ad97`)
  - 신규 모델 `MenuSlotAssignment(domainId, slot, menuId)` + `enum MenuSlot { HEADER_PRIMARY, FOOTER, UTILITY }`
  - 마이그레이션 `20260710000000_spec_menu_001_slot_assignment` — 기존 `Domain.defaultMenuId`를
    `HEADER_PRIMARY` 슬롯으로 백필(idempotent, 재실행 시 중복 0건 확인)
  - 레이아웃 렌더링이 슬롯별 메뉴를 렌더 — 헤더(HEADER_PRIMARY) 슬롯 공개 렌더 실측 확인
- **설치 시 기본 디자인 토큰 시드** (`b77379b`) — 설치 마법사 완료 시 기본 색상/타이포/간격/라운드 토큰 시드
- 버그 수정 3건(전부 main 브랜치 직접 커밋): tRPC import 경로 수정(`b71dcc8`), Slice C/D 컴파일 에러
  수정(`aa79611`), 설치 트랜잭션 중 `ThemeAssignment.themeId` FK 위반 수정 — `seedDefaultTheme()` 선행
  호출로 해결(`2a3f98c`)
- **제외됨(백로그)**: unlinked 모듈 목록(REQ-MENU-050), 메뉴 검색(REQ-MENU-051) — 사용자 결정으로 이번
  run 범위 밖, Optional(P2/P3)이므로 MVP 필수 아님

#### SPEC-TEST-APP-ROUTER-001 — App Router 테스트 mock 헬퍼 도입 (완료)

> status: completed — SPEC-TEST-DEBT-001 Category 2(App Router 요청 스코프 비양립) 후속.

- **공유 mock 헬퍼** (`packages/test-utils/src/app-router-mocks.ts`) — `setupAppRouterMocks()` 함수로
  vitest jsdom 환경에서 `next/headers` (`headers()`, `cookies()`), `next/navigation` (`useSearchParams()`)
  request-scope context 모델 제공. `AppRouterMockConfig` 타입으로 커스텀 헤더/쿠키/검색파람 옵션 지원.
- **테스트 파일 적용** — `apps/web/app/(auth)/login/page.test.tsx`,
  `apps/web/app/admin/layout.test.tsx` 2개 파일에 헬퍼 적용으로 기존 7건 실패 해소.
- **범위 편차** — 원계획 4개 파일(proxy.test.ts, middleware-gate.test.ts 포함) 중 실제 적용은 2개 파일.
  재검증 결과 제외 2개 파일은 이미 통과 상태였음(SPEC-TEST-DEBT-001의 2026-06-21 스냅샷 stale).
- **검증** — 대상 4개 파일 38/38 테스트 통과, test-utils 패키지 타입체크 통과.

#### SPEC-FEED-001 — 게시판별 RSS 2.0 / Atom 1.0 피드

- **피드 빌더 + 라우트** (`packages/board/src/feed/`, `apps/web/app/[mid]/{rss,atom}/route.ts`)
  - 공유 feed-builder 서비스: RSS 2.0 / Atom 1.0 동시 직렬화 (`build-feed.ts`)
  - `boardFeedConfigSchema` Zod 스키마: `enabled`/`itemCount`/`fullContent`/`excerptLength`/`description`/`imageUrl`/`copyright`
  - XML 안전 헬퍼: 엔티티 이스케이프 + CDATA `]]>` 종료 시퀀스 방어
  - PUBLIC-only 데이터 소스(`listDocuments`), 비밀글/임시저장/비공개 게시판 자동 제외
- **캐싱 + 자동탐색 + 이벤트 무효화**
  - 라우트 `revalidate=300` + `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
  - `feed:{instanceId}` 캐시 태그 + 문서 생성/수정/삭제 이벤트 구독(`apps/web/lib/feed-init.ts` 신규) → `revalidateTag`
  - board 목록/상세 페이지 `generateMetadata`(alternates.types) 기반 RSS/Atom 자동탐색 링크
- **관리자 설정 패널** (`apps/web/app/admin/boards/[mid]/feed/page.tsx`)
  - board admin 셸 확장, 트랜잭션 저장 + 캐시 무효화
- **DB 마이그레이션**
  - `20260624000000_spec_feed_001_board_feedconfig`: `Board.feedConfig Json @default("{}")` additive 컬럼 추가
- 테스트: 67/67 passing (9개 테스트 파일, 단위+e2e) / `pnpm tsc --noEmit` 0 errors / expert-security 리뷰 CRITICAL·HIGH 0건

#### SPEC-POINT-001 — 포인트 시스템 독립 패키지 + 크로스 모듈 통합

- **`@rhymix-ts/point` 신규 패키지** (`packages/point/`)
  - `PointService` 클래스: `add`, `subtract`, `getBalance`, `getHistory`, `recompute`, `getLevel` API
  - `pointHooks` 헬퍼: `onDocumentCreated`, `onCommentCreated`, `onVoteCast`, `onMemberSignedUp`
  - `getSitePointConfig` / `setSitePointConfig`: 사이트 포인트 설정 CRUD (singleton `SitePointConfig` 테이블)
  - 커스텀 에러 클래스: `PointAmountInvalidError`, `PointMemberNotFoundError`, `PointInsufficientError`, `PointDuplicateSourceError`
  - Zod 스키마: `PointSiteConfigSchema`, `PointAddInputSchema`, `PointHistoryQuerySchema`
  - 테스트: 24/24 passing (`service.test.ts`, `hooks.test.ts`, `config.test.ts`, `recompute.test.ts`)

- **DB 마이그레이션**
  - `20260613000001_add_point_system`: `Point` 모델, `SitePointConfig` 모델, `PointSourceType` enum, `User.pointBalance` 캐시 컬럼 추가
  - `20260613000002_add_board_point_columns`: `Board` 모델에 포인트 정책 컬럼 6개 추가 (`pointPerDocument`, `pointPerComment`, `pointPerVoteUp`, `pointPerVoteDown`, `pointPerDownload`, `pointPerFileUpload`)

- **크로스 모듈 통합** (트랜잭션 원자성 보장)
  - `packages/document`: `createDocument` 트랜잭션 안에 `pointHooks.onDocumentCreated` 통합
  - `packages/comment`: `createComment` 트랜잭션 안에 `pointHooks.onCommentCreated` 통합
  - `packages/auth`: 회원가입 완료 후 `pointHooks.onMemberSignedUp` fire-and-forget 통합

- **관리자 UI** (`apps/web`)
  - `admin/members/[id]/points/`: 회원별 포인트 이력 조회 + 수동 조정 (`PointSourceType.MANUAL`)
  - `admin/site/points/`: 사이트 포인트 정책 설정 (가입 보너스, clamp 정책)
  - `admin/api/points/adjust/route.ts`: 관리자 수동 조정 API (RBAC: `isAdmin` 검증)
  - `admin/api/site/points/config/route.ts`: 사이트 포인트 설정 API

### Implementation Notes

- `SitePointConfig`는 SPEC에서 계획된 `ModuleConfig` 재사용 대신 독립 테이블로 구현됨.
  실제 스키마에서 `moduleInstanceId`가 NOT NULL 제약으로 인해 사이트 전역 저장이 불가능했기 때문.
  기능 요구사항(REQ-POINT-006)은 완전히 충족됨.
- 포인트 이벤트 이중화 (`point.changed` 이벤트 버스)는 Phase 4 SPEC-ADDON-001에서 구독자 측 구현 예정.
  현재는 직접 주입(Direct Injection) 패턴으로 트랜잭션 원자성 보장.
