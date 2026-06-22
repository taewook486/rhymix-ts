---
id: SPEC-INSTALL-003
title: Post-Install Operator Onboarding Landing Experience
status: planned
priority: P2
created: 2026-06-23
updated: 2026-06-23
author: manager-spec
domain: install
issue_number: null
related: [SPEC-INSTALL-001, SPEC-INSTALL-002, SPEC-LAYOUT-001, SPEC-ADMIN-001]
---

## HISTORY

- 2026-06-23 (v0.1.0, planned): 최초 작성. `REPORT-2026-06-22.md` §3(홈페이지 레이아웃/콘텐츠 풍부도) 및 우선순위 #4에 기록되고, SPEC-INSTALL-002 `## Exclusions` 1번 항목에서 명시적으로 후속 SPEC으로 이연(deferred)된 "설치 후 운영자 온보딩 랜딩 경험" 격차를 다룬다. REQ 접두사는 `REQ-INSTALL-xxx`(SPEC-INSTALL-001), `REQ-INSTALL2-xxx`(SPEC-INSTALL-002)와의 충돌을 피하기 위해 `REQ-INSTALL3-xxx`로 새로 시작한다. plan 단계 전용(코드 미구현)이며, 구현은 후속 `/moai run`에서 expert-frontend/manager-tdd가 담당한다.

---

## Overview

SPEC-INSTALL-001의 REQ-INSTALL-016~018 구현으로, 신규 설치 후 홈페이지는 더 이상 "No index module configured" 에러가 아니라 시드된 `board` 인덱스 모듈의 문서 목록을 정상 렌더한다(기능상 정상). 그러나 레거시 PHP Rhymix(`http://localhost:8080`)와 비교하면, 레거시 홈은 신규 운영자를 위한 **"first-run 운영자 랜딩 페이지"** 다 — 자동 슬라이드 히어로 캐러셀, "HELLO, WORLD! / WELCOME TO RHYMIX" 환영 위젯 + "시작하기" CTA, "BUILD YOUR SITE" 운영자 온보딩 패널(가이드 링크 6종), "GET INVOLVED" 커뮤니티 패널(외부 링크 4종), 그리고 푸터(이용약관/개인정보처리방침/Powered by Rhymix)를 포함한다. rhymix-ts 홈은 이 중 **어느 요소도 없다** — 게시판 목록과 "글쓰기" 버튼만 보인다(`REPORT-2026-06-22.md` §3 비교표 참조).

본 SPEC은 그 격차를 **테스트 가능한 기능 요건**으로 정의한다. 핵심 목표는 "신규 운영자가 설치 직후 홈에서 다음에 무엇을 할지(사이트 제목 변경, 메뉴 편집, 레이아웃/디자인 변경, 모듈 관리, 홈페이지 변경)를 안내받는다"는 온보딩 경험이다.

본 SPEC은 **레거시 PHP 스킨을 1:1 포팅하지 않는다.** rhymix-ts는 자체 디자인 언어(Tailwind, `apps/web` 전반에 직접 유틸리티 클래스 사용)를 가진 TypeScript/React 프로젝트다. 따라서 자동 슬라이드 캐러셀·정확한 카피·정확한 여백 같은 시각적 세부는 구현 단계(expert-frontend)의 결정으로 남기고, 본 SPEC은 **무엇을 보여줄지(어떤 링크, 환영 상태가 전달하는 내용, 노출/해제 조건)** 만 규정한다.

## Background — plan 단계 코드베이스 조사 결과

다음은 Read/Grep으로 확인한 현재 렌더 경로와 실재 admin 라우트다. 구현 단계에서 재확인하되, 본 조사가 수락 기준의 테스트 가능성과 "라우트 날조 금지" 원칙을 뒷받침한다.

### 현재 홈페이지 렌더 경로 (`apps/web/app/page.tsx`, `RootPage`)

`RootPage`는 `x-domain-id` 헤더로 `Domain.indexModuleInstance`를 조회해 직접 dispatch한다. 세 가지 분기가 존재한다:
1. `x-domain-id` 헤더 없음/비정상 → "install pending" welcome fallback 블록(REQ-LAYOUT-042).
2. `indexModuleInstance == null` → `"No index module configured for this domain."` placeholder(REQ-LAYOUT-041).
3. `indexModuleInstance` 존재(설치 후 정상 경로) → `def.routes.index(...)` 호출 후 `renderModuleWithLayout`으로 board 목록 렌더.

**설치 직후에는 분기 3**이 실행된다(REQ-INSTALL-016에서 board를 indexModuleInstance로 시드). 즉 "비어 있는/에러" 신호가 없어, 온보딩 노출 조건은 인덱스 모듈 유무가 아니라 **별도의 first-run 조건**(인증된 운영자 + 미해제 플래그)으로 두어야 한다.

### 루트 레이아웃 (`apps/web/app/layout.tsx`)

`GlobalHeader` + `<main>{children}</main>` 만 렌더한다 — **공개(public) 푸터가 전혀 없다.** 레거시의 Terms/Privacy/"Powered by" 푸터에 대응하는 요소가 부재.

### 실재하는 admin 라우트 (온보딩 링크 대상 — 날조 금지, 실측 확인됨)

| 온보딩 항목 | 실재 라우트 | 근거 |
|---|---|---|
| 사이트 제목/일반 설정 | `/admin/settings/site` | `apps/web/app/admin/settings/site/page.tsx` 존재 |
| 메뉴 편집 | `/admin/menu` | `apps/web/app/admin/menu/page.tsx` 존재 |
| 디자인/레이아웃 변경 | `/admin/site/design` | `apps/web/app/admin/site/design/page.tsx` 존재 |
| 모듈 관리 | `/admin/modules` | `apps/web/app/admin/modules/page.tsx` 존재 |
| 홈페이지(인덱스 모듈) 변경 | `/admin/domains` | `apps/web/app/admin/domains/page.tsx`가 `domain.indexModule` 표시·관리 |
| (CTA "시작하기" 대상) 대시보드 | `/admin` | `apps/web/app/admin/page.tsx` 존재 |

### 디자인 언어 / 브랜드 상태

`.moai/project/brand/visual-identity.md`는 `_TBD_`(브랜드 인터뷰 미수행). 따라서 온보딩 패널의 시각 언어는 **새 브랜드 작업이 아니라 `apps/web`에 이미 쓰이는 기존 Tailwind 컨벤션**을 따른다(shadcn `components/ui/` 디렉터리는 부재 — 유틸리티 클래스 직접 사용). Open Questions 참조.

## User Stories

- **US-INSTALL3-001**: 설치를 막 마친 운영자가 홈페이지에 진입하면, "설치가 성공했다"는 환영 메시지와 함께 다음 단계를 시작할 수 있는 명확한 진입점(CTA)을 본다.
- **US-INSTALL3-002**: 신규 운영자가 홈의 온보딩 패널에서 사이트 제목·메뉴·레이아웃·모듈·홈페이지를 변경할 수 있는 실제 관리자 페이지로 한 번에 이동한다.
- **US-INSTALL3-003**: 온보딩이 끝난(또는 더 보고 싶지 않은) 운영자가 안내 패널을 해제하면, 이후 홈페이지는 일반 게시판 목록만 보이고 온보딩이 다시 나타나지 않는다.
- **US-INSTALL3-004**: 익명 방문자가 홈에 진입하면(운영자 온보딩과 무관하게) 기존 게시판 목록 경험이 유지된다 — 운영자 전용 온보딩이 공개 사이트를 영구히 덮지 않는다.

## EARS Requirements

### Group 1 — First-run 온보딩 surface 라이프사이클

#### Event-driven

- **REQ-INSTALL3-001**: When an authenticated operator (admin) requests the homepage (`GET /`) and the first-run onboarding has not yet been dismissed, the system shall render a first-run onboarding surface (welcome/hero + operator onboarding panel per Groups 2~3) in addition to — not replacing — the existing index-module output.
- **REQ-INSTALL3-002**: When the operator activates the onboarding surface's dismiss affordance, the system shall persist a "dismissed" state and the subsequent homepage render shall NOT show the onboarding surface.

#### State-driven

- **REQ-INSTALL3-003**: While the first-run onboarding "dismissed" state is set, the system shall render the homepage with only the index-module output (current post-install behavior), with no onboarding surface.
- **REQ-INSTALL3-004**: While the requester is unauthenticated (anonymous visitor), the system shall render the homepage with only the index-module output and shall NOT render the operator onboarding panel.

#### Unwanted

- **REQ-INSTALL3-005**: The onboarding surface shall NOT alter, suppress, or reorder the seeded index-module output produced by REQ-INSTALL-016~018 — it is additive composition only.
- **REQ-INSTALL3-006**: The system shall NOT require any change to the install seeding path (`packages/db/src/install/seed.ts`) to satisfy this SPEC; the onboarding surface is built on top of already-seeded data, not by re-seeding.

### Group 2 — 운영자 온보딩 패널 (verified admin 링크)

#### Ubiquitous / Event-driven

- **REQ-INSTALL3-010**: When the operator onboarding panel renders, the system shall present a "get started" guided-link panel containing a link for each of the following operator tasks, where every link target resolves to an existing admin route: (a) site title / general settings → `/admin/settings/site`, (b) menu editing → `/admin/menu`, (c) design / layout → `/admin/site/design`, (d) module management → `/admin/modules`, (e) homepage (index module) change → `/admin/domains`.
- **REQ-INSTALL3-011**: The operator onboarding panel shall render at least 5 guided links (one per task in REQ-INSTALL3-010), each with a human-readable label describing the operator task it leads to.

#### Unwanted

- **REQ-INSTALL3-012**: The onboarding panel shall NOT link to any admin route that does not exist in `apps/web/app/admin/**` at implementation time; each link target shall be verified against the actual route tree (consistent with how SPEC-INSTALL-002 verified `/install/complete` link targets).
- **REQ-INSTALL3-013**: The onboarding panel shall NOT expose admin-only navigation to unauthenticated visitors (enforced by the Group 1 authenticated-operator gate, REQ-INSTALL3-001/004).

#### Optional

- **REQ-INSTALL3-014**: Where the implementation chooses to indicate completion progress, the panel may reflect which onboarding tasks the operator has already performed — this is a nice-to-have and not required for acceptance.

### Group 3 — 환영/히어로 (설치 성공 인지)

#### Event-driven

- **REQ-INSTALL3-020**: When the first-run onboarding surface renders, the system shall present a welcome/hero element whose copy communicates that the installation succeeded and the site is ready to configure.
- **REQ-INSTALL3-021**: When the welcome/hero element renders, the system shall present a primary "get started" call-to-action that navigates the operator to the admin entry point (`/admin`).

#### Unwanted

- **REQ-INSTALL3-022**: The welcome/hero element shall NOT be required to replicate the legacy auto-sliding carousel, its slide count, or its exact slogan copy — visual treatment (animation, imagery, spacing) is an implementation-phase decision.
- **REQ-INSTALL3-023**: The welcome/hero element shall NOT introduce a new brand identity exercise; it shall use the existing Tailwind conventions already present in `apps/web`.

### Group 4 — 외부/커뮤니티 링크 (범위 결정)

#### Optional

- **REQ-INSTALL3-030**: Where a community/links area is rendered, the system shall include a link to this project's own GitHub repository at `https://github.com/taewook486/rhymix-ts`.

#### Unwanted

- **REQ-INSTALL3-031**: The system shall NOT fabricate external community links (e.g., a "COMMUNITY" portal or a "DOWNLOAD" page) that have no real target for this project; only resources that actually exist for rhymix-ts (its GitHub repository, and internal seeded boards reachable via the existing GNB menu) may be linked.
- **REQ-INSTALL3-032**: The system shall NOT copy the legacy upstream's community URLs verbatim; any external link shall point to this project's own resources.

### Group 5 — 최소 공개 푸터 (선택, 레거시 파리티 일부)

#### Optional

- **REQ-INSTALL3-040**: Where a public footer is added, the system shall render a "Powered by Rhymix-TS" attribution on public pages.

#### Unwanted

- **REQ-INSTALL3-041**: The footer shall NOT link to Terms of Service or Privacy Policy pages while those pages do not exist in `apps/web/app/**`; such links shall be omitted or deferred rather than pointing to non-existent routes (route-fabrication prohibition, same principle as REQ-INSTALL3-012).
- **REQ-INSTALL3-042**: The footer (if added) shall NOT be gated on the operator/first-run state — it is permanent public chrome and is independent of the dismissible onboarding surface (Groups 1~3).

## Acceptance Criteria

### AC-INSTALL3-001 (REQ-INSTALL3-001, 003)

- **Given** an authenticated operator with the first-run onboarding not yet dismissed
- **When** they `GET /`
- **Then** the homepage renders both the onboarding surface (welcome/hero + operator panel) and the seeded index-module (board) output, with the board output unchanged

### AC-INSTALL3-002 (REQ-INSTALL3-002, 003)

- **Given** an authenticated operator viewing the onboarding surface
- **When** they activate the dismiss affordance and then `GET /` again
- **Then** the onboarding surface is no longer rendered and only the index-module output remains

### AC-INSTALL3-003 (REQ-INSTALL3-004, 005, 013)

- **Given** an anonymous (unauthenticated) visitor
- **When** they `GET /`
- **Then** the homepage renders only the index-module (board) output — no operator onboarding panel, no admin navigation, and the board output is identical to the current post-install behavior

### AC-INSTALL3-004 (REQ-INSTALL3-010, 011, 012)

- **Given** the operator onboarding panel is rendered
- **When** its links are enumerated
- **Then** there are at least 5 guided links whose `href` values are exactly `/admin/settings/site`, `/admin/menu`, `/admin/site/design`, `/admin/modules`, `/admin/domains`, and each target route exists in the app route tree

### AC-INSTALL3-005 (REQ-INSTALL3-020, 021)

- **Given** the first-run onboarding surface renders
- **When** the welcome/hero element is inspected
- **Then** it contains copy communicating installation success and a primary CTA whose target is `/admin`

### AC-INSTALL3-006 (REQ-INSTALL3-006)

- **Given** this SPEC is implemented
- **When** the diff is reviewed
- **Then** `packages/db/src/install/seed.ts` is unchanged (no re-seeding), and all existing seed tests continue to pass

### AC-INSTALL3-007 (REQ-INSTALL3-030, 031, 032)

- **Given** a community/links area is rendered
- **When** its external links are enumerated
- **Then** the only external link present points to `https://github.com/taewook486/rhymix-ts`, and no fabricated "COMMUNITY"/"DOWNLOAD"/upstream community URLs are present

### AC-INSTALL3-008 (REQ-INSTALL3-040, 041, 042)

- **Given** a public footer is added
- **When** an anonymous visitor and an operator both load a public page
- **Then** both see the "Powered by Rhymix-TS" attribution, the footer is shown regardless of onboarding-dismissed state, and no link points to a non-existent Terms/Privacy page

## Exclusions (What NOT to Build)

- **설치 시드 로직 변경 없음** — REQ-INSTALL-016~018(`packages/db/src/install/seed.ts`의 board/notice/qna 모듈·메뉴·샘플 문서 시드)은 이미 구현·테스트 완료됨. 본 SPEC은 그 위에 표현 계층(온보딩 surface)만 얹는다. 시드 재실행·스키마 변경은 범위 밖(REQ-INSTALL3-006).
- **레거시 PHP 스킨 1:1 포팅 없음** — 자동 슬라이드 캐러셀, 정확한 슬라이드 수, 정확한 카피/여백/시각 처리는 구현 단계(expert-frontend)의 결정. 본 SPEC은 기능 콘텐츠만 규정한다(REQ-INSTALL3-022).
- **새 브랜드 작업 없음** — `.moai/project/brand/visual-identity.md`가 `_TBD_`이므로 신규 브랜드 인터뷰/디자인 토큰 작업은 하지 않는다. 기존 `apps/web` Tailwind 컨벤션을 따른다(REQ-INSTALL3-023).
- **실제 Terms/Privacy/Community/Download 페이지 신규 제작 없음** — 해당 공개 페이지가 없으므로 링크를 날조하지 않으며(REQ-INSTALL3-031, 041), 그 페이지들을 새로 만드는 것은 본 SPEC 범위 밖.
- **SPEC-INSTALL-002 영역과 중복 없음** — 공개 헤더 세션 동기화(REQ-INSTALL2-001~005), 설치 후 자동 로그인(REQ-INSTALL2-010~013), `/install/complete` 안내 문구 정합성(REQ-INSTALL2-020~022)은 SPEC-INSTALL-002 소관. 본 SPEC은 그 위에서 "운영자가 인증되면 홈에서 온보딩을 본다"만 다룬다(soft 의존, Dependencies 참조).
- **SSL 기본값 변경** (`REPORT-2026-06-22.md` 우선순위 #5) — 범위 밖.
- **유령/stale 세션 쿠키 처리 및 시크릿 로테이션 운영 가이드** (REPORT 우선순위 #6) — 범위 밖.
- **`middleware.rewrite` 환경진단 타임아웃** (1차 REPORT 우선순위 #4) — 범위 밖.
- **설치 마법사 DB 단계의 `.env` 필드 재사용 UX** (1차 REPORT) — 범위 밖. (이상 4건은 SPEC-TEST-DEBT-001 및 별도 이연 항목 영역.)

## Affected Files (조사 결과 — 구현 단계 참조용, plan 단계에서 미수정)

| 영역 | 파일 | 예상 변경 성격 |
|---|---|---|
| 온보딩 주입 | `apps/web/app/page.tsx` (`RootPage`) | 분기 3(인덱스 모듈 렌더) 위에 인증·미해제 조건 시 온보딩 surface를 prepend (least-disruptive 후보). 또는 layout slot 도입. 구현 결정 |
| 온보딩 컴포넌트 | (신규) `apps/web/components/onboarding/*` | 환영/히어로 + 운영자 패널 + (선택)커뮤니티/GitHub 링크. Tailwind 직접 사용 |
| 해제 상태 영속화 | (신규) SiteSetting 또는 per-user 플래그 + dismiss server action | REQ-INSTALL3-002/003. 정확한 저장소는 Open Questions |
| 인증 게이트 | 기존 `await auth()` 패턴(`apps/web/components/layout/GlobalHeader.tsx` 참고) | 운영자 여부 판별. 추가 DB 라운드트립 지양 |
| 공개 푸터(선택) | `apps/web/app/layout.tsx` (또는 신규 `components/layout/GlobalFooter.tsx`) | `<main>` 하단에 "Powered by Rhymix-TS" 추가 |

## Traceability

| REQ | AC | Test Strategy |
|---|---|---|
| REQ-INSTALL3-001, 003 | AC-INSTALL3-001, 002 | Playwright/integration: 인증 운영자 `GET /` → 온보딩 surface + board 동시 노출; 해제 후 재방문 시 board만 |
| REQ-INSTALL3-002 | AC-INSTALL3-002 | Integration: dismiss action → 영속 상태 set; 재렌더 시 surface 부재 |
| REQ-INSTALL3-004, 005, 013 | AC-INSTALL3-003 | Playwright: 익명 `GET /` → board만, admin 링크 부재; board 출력이 현행과 동일(스냅샷) |
| REQ-INSTALL3-006 | AC-INSTALL3-006 | Diff/CI: `seed.ts` 무변경 단언, 기존 seed 테스트 green |
| REQ-INSTALL3-010, 011, 012 | AC-INSTALL3-004 | Component: 패널 렌더 → 링크 `href` 5종 정확 일치; route 존재 단언(라우트 트리 대조) |
| REQ-INSTALL3-020, 021 | AC-INSTALL3-005 | Component: 환영 카피 포함·CTA `href === '/admin'` |
| REQ-INSTALL3-030, 031, 032 | AC-INSTALL3-007 | Component: 외부 링크 = GitHub repo 1건만; 날조 링크 부재 단언 |
| REQ-INSTALL3-040, 041, 042 | AC-INSTALL3-008 | Component/Playwright: 푸터 "Powered by" 노출(익명·운영자 모두), Terms/Privacy 링크 부재, 온보딩 해제와 무관 |

## Dependencies & Risks

### Depends on

- **SPEC-INSTALL-001**: REQ-INSTALL-016~018 시드(board 인덱스 모듈/메뉴/샘플 문서) — 본 SPEC이 얹히는 토대.
- **SPEC-LAYOUT-001**: `RootPage`의 인덱스 모듈 dispatch 경로(REQ-LAYOUT-040~042) — 온보딩을 prepend할 합성 지점.
- **SPEC-ADMIN-001**: `/admin/**` 라우트(설정/메뉴/모듈/도메인) — 온보딩 링크 대상.
- **SPEC-INSTALL-002 (soft)**: 설치 후 자동 로그인(REQ-INSTALL2-010)과 헤더 세션 동기화가 구현되면 "설치 직후 인증 운영자"가 즉시 성립해 온보딩이 바로 보인다. 미구현이어도 운영자가 수동 로그인하면 동일하게 동작하므로 **hard 의존이 아니다**.

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 온보딩 prepend가 인덱스 모듈 출력/레이아웃을 깨뜨림 | Medium | REQ-INSTALL3-005 + AC-INSTALL3-003 board 스냅샷 회귀로 board 출력 불변 검증 |
| 운영자 판별을 위해 추가 DB 라운드트립 발생 | Low | 기존 `await auth()` 세션에서 역할 판별, 추가 쿼리 지양 |
| 해제 상태 저장소 선택(per-site vs per-user)이 멀티 운영자 환경에서 모호 | Medium | Open Questions로 명시, 구현 단계에서 단일 운영자(설치 직후) 기준 최소 구현 우선 |
| 익명 경로에 운영자 링크 누출 | Medium | REQ-INSTALL3-004/013 + AC-INSTALL3-003로 명시 검증 |

### Performance / Security Targets

- 익명 홈 렌더는 기존 대비 추가 비용 0(온보딩 분기는 인증 세션 존재 시에만 진입).
- 온보딩 패널은 admin 링크를 노출하므로 반드시 인증 운영자 게이트 뒤에서만 렌더(REQ-INSTALL3-013).

## Open Questions

1. **시각 디자인 언어**: 브랜드 브리프(`.moai/project/brand/visual-identity.md`)가 `_TBD_`이고 `components/ui/`(shadcn) 디렉터리도 없으므로, 온보딩 패널의 시각 처리는 **`apps/web`에 이미 쓰이는 기존 Tailwind 유틸리티 컨벤션**을 따른다(새 브랜드 작업 아님). expert-frontend가 구현 단계에서 기존 admin/공개 화면의 카드·버튼 스타일과 일관되게 결정.
2. **해제(dismiss) 상태 저장소**: per-site `SiteSetting`(예: `operator_onboarding_dismissed`)인지 per-user 플래그인지 — 멀티 운영자 시 의미가 다름. 설치 직후 단일 운영자 시나리오를 기준으로 최소 구현을 권장하되 구현 단계에서 확정.
3. **온보딩 주입 지점**: `RootPage`에서 인덱스 모듈 출력 위에 prepend할지, 루트 `layout.tsx`에 slot을 둘지 — least-disruptive(REQ-INSTALL3-005 보존)를 만족하는 방식으로 구현 단계 결정.
4. **환영/히어로의 대상 범위**: 운영자 전용으로 한정(현 SPEC 기본 가정)할지, 익명 방문자에게도 가벼운 "설치 완료" 환영을 보일지 — 본 SPEC은 운영자 전용 surface를 기본으로 정의했고, 공개 환영은 footer "Powered by"로 최소화. 필요 시 후속 조정.
5. **푸터 Terms/Privacy**: 현재 해당 공개 페이지가 없어 링크 불가(REQ-INSTALL3-041). 추후 법적 페이지를 실제로 만들면 그때 링크 추가 — 본 SPEC에서는 "Powered by Rhymix-TS"만 포함하거나 푸터 자체를 후속으로 이연하는 것도 허용.
