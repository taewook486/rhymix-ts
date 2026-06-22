---
id: SPEC-INSTALL-002
title: Post-Install Session Bootstrap & Header Session Sync Fixes
status: planned
priority: P1
created: 2026-06-22
domain: install
related: [SPEC-INSTALL-001, SPEC-AUTH-001, SPEC-NOTIFICATION-001]
---

## HISTORY

- 2026-06-22 (v0.1.0, planned): 최초 작성. SPEC-INSTALL-001 구현(REQ-INSTALL-001~018, 859/868 tests passing) 이후 레거시 PHP Rhymix와 수동 재비교(`install-gap-comparison/REPORT-2026-06-22.md`)에서 확정한 3건의 버그를 후속 SPEC으로 분리한다. REQ 접두사는 SPEC-INSTALL-001의 `REQ-INSTALL-xxx`와 충돌을 피하기 위해 `REQ-INSTALL2-xxx`로 새로 시작한다. 코드 미구현 상태(plan 단계 전용)이며, 구현은 후속 `/moai run`에서 manager-tdd/expert-frontend/expert-backend가 담당한다.

---

## Overview

본 SPEC은 SPEC-INSTALL-001 완료 이후, 레거시 PHP Rhymix(`http://localhost:8080`, v2.1.33)와 rhymix-ts(`http://localhost:3000`, Next.js 16 + Prisma)를 Playwright로 끝까지 재설치하며 1:1 비교한 결과 확인된 **3건의 확정 버그**를 다룬다. 세 버그는 모두 "설치 직후 운영자 경험(post-install operator experience)" 영역에 속하며, 레거시 대비 명백한 기능 누락 또는 사실 불일치다.

1. **(Critical) 공개 헤더가 인증 세션 상태를 반영하지 못함.** 로그인 성공 후에도 공개 레이아웃의 `GlobalHeader`가 계속 "로그인" 링크만 표시한다. `/admin` 사이드바는 "관리자 1 / 로그아웃"으로 정상 인증을 보여주므로, 버그는 헤더 컴포넌트의 세션 표시 분기로 국한된다.
2. **(Major) 설치 완료 후 자동 로그인 누락.** 레거시는 설치 마법사 종료 즉시 admin 세션이 발급되어 자동 로그인 상태로 사이트에 진입한다. rhymix-ts는 `/install/complete` 도달 후에도 미인증 상태이며, 운영자가 `/login`에서 자격 증명을 다시 입력해야 한다.
3. **(Major) `/install/complete` 안내 문구가 실제 시드 상태와 불일치.** "다음 단계 안내"가 "관리자 대시보드에서 첫 모듈 인스턴스를 생성하세요. (SPEC-ADMIN-001)"라고 안내하지만, REQ-INSTALL-016~018 구현으로 이미 board/notice/qna 모듈 인스턴스 3개 + 기본 메뉴 + 샘플 문서가 시드되어 있다. 문구가 사실과 어긋난다.

이 SPEC은 **버그 수정 SPEC**이다. 새 기능을 추가하기보다, 레거시 패리티에 도달하지 못한 설치 후 부트스트랩 경로를 교정한다. 근본 원인(root cause)은 구현 단계(run)에서 코드로 확정하며, 본 SPEC은 **관찰 가능한 증상(symptom)과 테스트 가능한 수락 기준**을 정의한다.

## Background — 근본 원인 사전 분석 (plan 단계 조사 결과)

다음은 plan 단계에서 Read/Grep으로 조사한 잠정 근본 원인이다. 구현 단계에서 재확인하되, 본 분석이 수락 기준의 테스트 가능성을 뒷받침한다.

- **버그 #1 (헤더)**: `apps/web/components/layout/GlobalHeader.tsx`는 이미 `await auth()`로 세션을 읽어 `userId`를 계산한다(현재는 알림 벨 표시에만 사용). 그러나 우측 영역(현재 코드 기준 라인 85~87)이 **인증 여부와 무관하게 항상 `<Link href="/login">로그인</Link>`만 렌더**한다 — 즉 "stale 세션"이 아니라 **조건부 렌더 분기 자체의 부재**가 원인일 가능성이 높다. `GlobalHeader`는 `apps/web/app/layout.tsx`의 루트 레이아웃에서 렌더된다.
- **버그 #2 (자동 로그인)**: `apps/web/app/install/actions.ts`의 `performInstall`은 seed 성공 후 `session.step='finish'`만 세우고 `redirect('/install/complete')`로 끝난다. **Auth.js 세션 발급(`signIn`) 호출이 없다.** `signIn`은 `apps/web/lib/auth/config.ts`에서 export되어 `apps/web/lib/auth/actions.ts`의 `loginAction`이 이미 `signIn('credentials', { identifier, password, redirect: false })` 패턴으로 사용 중이다. SPEC-INSTALL-001 REQ-INSTALL-014 sub-step 7("Issue an Auth.js session cookie for the new admin")이 코드에 반영되지 않은 갭이다.
- **버그 #3 (문구)**: `apps/web/app/install/complete/page.tsx`의 "다음 단계 안내" `<ul>`(현재 코드 기준 라인 36~40)이 모듈 인스턴스가 없다는 전제로 작성되어 있다. REQ-INSTALL-016~018 시드 결과와 모순.

## User Stories

- **US-INSTALL2-001**: 운영자가 로그인하면 공개 페이지 상단 헤더에 자신의 닉네임과 로그아웃 수단이 즉시 표시되어, 자신이 로그인 상태임을 모든 페이지에서 확인할 수 있다.
- **US-INSTALL2-002**: 운영자가 설치 마법사를 끝까지 완료하면, 별도의 자격 증명 재입력 없이 새로 만든 관리자 계정으로 로그인된 상태가 되어 곧바로 사이트/관리자 작업을 시작할 수 있다.
- **US-INSTALL2-003**: 설치를 막 마친 운영자가 `/install/complete`의 안내를 읽으면, 이미 생성된 기본 모듈·메뉴·샘플 콘텐츠의 존재를 정확히 인지하고, 신규 생성이 아니라 커스터마이징(기존 모듈 편집·추가·사이트 제목 변경 등) 방향으로 안내받는다.

## EARS Requirements

### Group 1 — 헤더 세션 동기화 (버그 #1, Critical)

#### Event-driven

- **REQ-INSTALL2-001**: When an authenticated user requests any page that renders the public `GlobalHeader` (e.g., `GET /`), the system shall render the user's identity (nickname, falling back to email/user id) and a logout affordance in the header instead of the "로그인" link.
- **REQ-INSTALL2-002**: When an unauthenticated visitor requests any page that renders the public `GlobalHeader`, the system shall render a "로그인" link pointing to `/login` (existing behavior preserved).
- **REQ-INSTALL2-003**: When an authenticated user activates the header logout affordance, the system shall terminate the Auth.js session (equivalent to `signOut`) and the subsequent header render shall show the "로그인" link.

#### State-driven

- **REQ-INSTALL2-004**: While a valid Auth.js session exists, the public `GlobalHeader` and any admin-layout header shall present a consistent authenticated state (the public header shall NOT show "로그인" while the admin layout simultaneously shows the user as logged in).

#### Unwanted

- **REQ-INSTALL2-005**: The public `GlobalHeader` shall NOT render the authenticated identity/logout affordance for an unauthenticated request, and shall NOT leak any session-derived field (email, internal user id) when no session is present.

### Group 2 — 설치 완료 후 자동 로그인 (버그 #2, Major)

#### Event-driven

- **REQ-INSTALL2-010**: When `procInstall` (`performInstall`) successfully seeds the database and creates the first admin user, the system shall establish an authenticated Auth.js session for that newly-created admin — equivalent to the session a manual credential login would produce — before redirecting to `/install/complete`.
- **REQ-INSTALL2-011**: When the install-time session has been established (REQ-INSTALL2-010), the system shall render `/install/complete` and any subsequently visited public page with the header in its authenticated state (per REQ-INSTALL2-001), without requiring the operator to enter credentials a second time.

#### Unwanted / Resilience

- **REQ-INSTALL2-012**: The system shall NOT weaken the existing install security guarantees while establishing the auto-login session: the admin password used to mint the session shall NOT be logged in plaintext (consistent with REQ-INSTALL-051), and the advisory lock (REQ-INSTALL-053) lifecycle shall remain correct.
- **REQ-INSTALL2-013**: If establishing the auto-login session fails after a successful seed, then the system shall still complete the install (the seed/lock state shall remain committed and consistent) and redirect to `/install/complete`, degrading gracefully to a state where the operator can log in manually — install completion shall NOT be rolled back solely because session minting failed.

### Group 3 — 설치 완료 안내 문구 정합성 (버그 #3, Major)

#### Event-driven

- **REQ-INSTALL2-020**: When `/install/complete` renders its "다음 단계 안내" section after a successful install, the system shall present copy that accurately reflects the seeded state produced by REQ-INSTALL-016~018: default board/notice/qna module instances, a default menu, and sample documents already exist.
- **REQ-INSTALL2-021**: When `/install/complete` renders the next-steps guidance, the system shall direct the operator toward customization of the existing site (e.g., editing existing modules, adding further modules, changing the site title/menu) rather than implying that no module instance exists yet.

#### Unwanted

- **REQ-INSTALL2-022**: The `/install/complete` next-steps copy shall NOT instruct the operator to "create the first module instance" (or equivalent wording implying the site is empty), and shall NOT reference a step that the install process has already performed automatically.

## Acceptance Criteria

### AC-INSTALL2-001 (REQ-INSTALL2-001, 004)

- **Given** an operator has successfully logged in (valid Auth.js session cookie present)
- **When** they `GET /` (a page rendering the public `GlobalHeader`)
- **Then** the header shows the user's nickname and a logout affordance, and does NOT show a "로그인" link

### AC-INSTALL2-002 (REQ-INSTALL2-002, 005)

- **Given** no Auth.js session exists (anonymous visitor)
- **When** they `GET /`
- **Then** the header shows a "로그인" link to `/login`, and renders no nickname, email, or user id

### AC-INSTALL2-003 (REQ-INSTALL2-004)

- **Given** a logged-in admin
- **When** they navigate to `/admin` (admin layout) and then back to `/` (public layout)
- **Then** both the admin sidebar and the public header consistently reflect the authenticated state — the public header never shows "로그인" while the admin layout shows the user as logged in

### AC-INSTALL2-004 (REQ-INSTALL2-003)

- **Given** a logged-in user viewing the public header
- **When** they activate the header logout affordance
- **Then** the session is terminated and the next header render shows the "로그인" link

### AC-INSTALL2-005 (REQ-INSTALL2-010, 011)

- **Given** an operator completes all 4 install wizard steps and `performInstall` succeeds
- **When** they land on `/install/complete`
- **Then** an authenticated Auth.js session for the newly-created admin exists, and the header (on `/install/complete` and on a subsequent `GET /`) shows the admin's authenticated state — without the operator entering credentials again

### AC-INSTALL2-006 (REQ-INSTALL2-013)

- **Given** the seed transaction has committed successfully but session minting throws (simulated failure)
- **When** `performInstall` completes
- **Then** install is still marked complete (no rollback of seed/lock state) and the operator is redirected to `/install/complete`, from where a manual login succeeds

### AC-INSTALL2-007 (REQ-INSTALL2-012)

- **Given** auto-login session minting runs during `performInstall`
- **When** the install completes
- **Then** no plaintext admin password appears in any log sink, and the install advisory lock is released exactly once (no leak, no double-release)

### AC-INSTALL2-008 (REQ-INSTALL2-020, 021, 022)

- **Given** a successful install with default seeding (REQ-INSTALL-016~018 applied)
- **When** the operator reads the `/install/complete` "다음 단계 안내" section
- **Then** the copy states that default modules (board/notice/qna), a default menu, and sample content already exist, guides the operator toward customization, and does NOT instruct them to "create the first module instance"

## Exclusions (What NOT to Build)

- **랜딩 페이지 풍부도 (히어로/온보딩 패널/커뮤니티 링크/푸터) 추가는 범위 밖.** `REPORT-2026-06-22.md` §3 및 우선순위 #4에 기록된, 레거시 대비 홈페이지 랜딩 경험 격차(자동 슬라이드 캐러셀, "BUILD YOUR SITE" 온보딩 패널, "GET INVOLVED" 커뮤니티 링크, 푸터 등)는 사용자가 명시적으로 본 SPEC 범위에서 제외했다. 별도 후속 SPEC에서 다룬다.
- **SSL 기본값 변경 (REPORT 우선순위 #5)** — 로컬 개발 편의를 위한 SSL 기본값을 "HTTPS 미사용"으로 바꾸는 것은 본 SPEC 범위 밖.
- **유령 세션 / 시크릿 로테이션 운영 가이드 (REPORT 우선순위 #6)** — `NEXTAUTH_SECRET` 고정 상태에서 DB만 리셋했을 때 남는 stale JWT 쿠키 문제는 운영 가이드 영역으로, 본 SPEC 범위 밖.
- **`middleware.rewrite` 환경진단 타임아웃 (1차 REPORT 우선순위 #4)** — 설치 2단계 환경진단 안정화는 본 SPEC 범위 밖.
- **DB 설정 단계의 `.env` 재사용 (1차 REPORT)** — 이미 검증된 `DATABASE_URL` 재입력 요구 UX 개선은 본 SPEC 범위 밖.
- **알림 벨/알림 시스템 변경 없음** — `GlobalHeader`의 `NotificationBell`(SPEC-NOTIFICATION-001) 동작은 유지하며, 본 SPEC은 인증 표시 영역만 교정한다.
- **세션 발급 메커니즘 재설계 없음** — Auth.js v5 + Credentials Provider 기반 기존 `signIn`/`signOut` 경로를 재사용한다. 새로운 인증 제공자나 세션 전략(JWT→DB 등) 변경은 범위 밖.
- **SPEC-INSTALL-001의 REQ-INSTALL-001~018 재구현 없음** — 시드/메뉴/모듈 로직은 이미 구현·검증됨. 본 SPEC은 그 위에서 세션 발급과 표시·문구만 보완한다.

## Affected Files (조사 결과 — 구현 단계 참조용, plan 단계에서 미수정)

| 버그 | 파일 | 예상 변경 성격 |
|---|---|---|
| #1 헤더 | `apps/web/components/layout/GlobalHeader.tsx` | 우측 영역에 `userId != null` 분기 추가 — 인증 시 닉네임 + 로그아웃 affordance, 미인증 시 기존 "로그인" 링크. 세션은 이미 `await auth()`로 읽고 있음 |
| #1 헤더 | (신규 가능) 로그아웃 server action 또는 기존 `signOut` 래퍼 | 헤더 로그아웃 affordance가 호출할 경로 (REQ-INSTALL2-003) |
| #2 자동로그인 | `apps/web/app/install/actions.ts` (`performInstall`) | seed 성공 후 `signIn('credentials', { identifier: admin.userId 또는 email, password: admin.password, redirect: false })` 호출을 redirect 이전에 추가. 실패 graceful 처리(REQ-INSTALL2-013) |
| #2 자동로그인 | `apps/web/lib/auth/config.ts` / `apps/web/lib/auth/actions.ts` | `signIn` export 및 기존 credentials authorize 경로 재사용 (변경 최소화 목표) |
| #3 문구 | `apps/web/app/install/complete/page.tsx` | "다음 단계 안내" `<ul>` 카피 교체 (REQ-INSTALL-016~018 시드 결과 반영) |

## Traceability

| REQ | AC | Test Strategy |
|---|---|---|
| REQ-INSTALL2-001, 004 | AC-INSTALL2-001, 003 | Playwright: 로그인 후 `GET /` 헤더에 닉네임 노출·"로그인" 미노출; admin↔public 왕복 시 일관성. Component/integration: `GlobalHeader`를 인증 세션 mock으로 렌더 → 닉네임 분기 검증 |
| REQ-INSTALL2-002, 005 | AC-INSTALL2-002 | Component: 세션 없음 mock → "로그인" 링크만, 세션 필드 미노출 |
| REQ-INSTALL2-003 | AC-INSTALL2-004 | Playwright: 헤더 로그아웃 → 재렌더 시 "로그인" 노출. Unit: 로그아웃 action이 `signOut` 호출 |
| REQ-INSTALL2-010, 011 | AC-INSTALL2-005 | Playwright(install-happy-path 확장): 마법사 완료 → `/install/complete`·`/`에서 인증 헤더, 재로그인 없음. Integration: `performInstall` 후 세션 쿠키 발급 단언 |
| REQ-INSTALL2-012 | AC-INSTALL2-007 | Unit/integration: 로그 redactor에 password 미노출, advisory lock 단일 release 검증 |
| REQ-INSTALL2-013 | AC-INSTALL2-006 | Integration: seed 성공 + signIn throw mock → install 완료 유지·`/install/complete` 도달·수동 로그인 성공 |
| REQ-INSTALL2-020, 021, 022 | AC-INSTALL2-008 | Component/Playwright: `/install/complete` 카피에 "기본 모듈 존재" 문구 포함·"첫 모듈 인스턴스를 생성" 문구 부재 단언 |

## Dependencies & Risks

### Depends on

- **SPEC-INSTALL-001**: 설치 마법사 본체, `performInstall` server action, seed(REQ-INSTALL-016~018), `/install/complete` 페이지.
- **SPEC-AUTH-001**: Auth.js v5 Credentials Provider, `signIn`/`signOut`, 세션 콜백.
- **SPEC-NOTIFICATION-001**: `GlobalHeader`의 `NotificationBell` — 변경 없이 공존 보장.

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `signIn`을 `/install` 라우트 컨텍스트에서 호출 시 Auth.js redirect-throw 충돌 | Medium | `loginAction`과 동일하게 `redirect: false` 사용 후, 명시적 `redirect('/install/complete')`로 흐름 제어 |
| 자동 로그인 세션이 발급됐으나 헤더 분기가 이를 못 읽어 버그 #1과 동시 미해결 | Medium | 버그 #1·#2 수락 기준을 한 Playwright 시나리오(설치→완료→홈)에서 함께 검증 |
| 세션 minting 실패가 install 트랜잭션을 오염 | High | REQ-INSTALL2-013: 세션 발급은 seed/lock commit 이후·바깥에서 수행, 실패해도 install 완료 유지 |
| 헤더 인증 분기가 미인증 경로에서 세션 필드 누출 | Medium | REQ-INSTALL2-005 + AC-INSTALL2-002로 미인증 경로 명시 검증 |

### Performance / Security Targets

- 헤더 렌더는 기존 `await auth()` 1회 호출 비용을 초과하지 않는다(추가 DB 라운드트립 없이 세션에서 닉네임 사용 권장).
- 자동 로그인 세션은 수동 로그인과 동일한 세션 보안 속성(HttpOnly, Secure(prod), SameSite, maxAge)을 가진다 — 별도 완화 없음.

## Open Questions

1. **헤더 로그아웃 affordance의 형태**: 단순 `signOut` 링크/버튼인지, 닉네임 드롭다운(프로필/로그아웃) 메뉴인지 — 구현 단계에서 최소 구현(로그아웃 버튼) 우선, 드롭다운은 선택.
2. **자동 로그인 자격 식별자**: `signIn('credentials', ...)`에 `identifier`로 admin `userId`를 쓸지 `email`을 쓸지 — credentials `authorize`의 `login()` 식별자 처리 규칙을 구현 단계에서 확인해 일치시킨다.
3. **`/install/complete` 카피의 링크 대상**: 커스터마이징 안내가 가리킬 실제 관리자 경로(`/admin/modules`, `/admin/menu`, `/admin/settings` 등)를 구현 단계에서 실재 라우트로 확정.
