# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

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
