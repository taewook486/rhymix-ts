---
id: REMEDIATION-PLAN-001
title: Gemini Review Remediation Plan
created: 2026-05-25
based-on: Gemini code review (2026-05-25)
---

# Remediation Plan — Post Gemini Review

본 문서는 2026-05-25 Gemini 코드 리뷰 결과를 바탕으로, Rhymix-TS 프로젝트가 다음 단계로 진입하기 전에 해결해야 할 항목들을 우선순위별로 정리한 **계획 문서**이다. 코드 구현은 포함하지 않으며, 각 항목은 별도의 SPEC 작업으로 진행된다.

리뷰 결과 핵심 진단:
- **AUTH-001**: 기능 구현은 완료되었으나, `AuthActionState` 타입 추출(Server Action 파일과 타입 파일 분리) 작업이 미커밋 상태로 남아있음.
- **THEME-001**: 사양 문서(spec.md)는 완전하나 **슬라이스 계획·구현이 전무**. 모든 페이지 렌더링의 P0 블로커.
- **CONTENT-001**: Slice A(Prisma 스키마) 완료, Slice B(tRPC CRUD + UI) 미착수.
- **ADMIN-001**: A~F 완료(482 테스트 통과), G/H/I 슬라이스 계획만 작성됨.
- **공통**: `NoopMailDispatcher` 사용 중 — 실제 이메일 발송 미구현.

---

## Section 1. Immediate Fixes — 새 SPEC 시작 전 즉시 처리

### 1.1 AUTH-001 `AuthActionState` 분리 검증 및 커밋

**배경**: Next.js의 `'use server'` 제약으로 인해 Server Action 파일은 async 함수만 export 가능하다. 이 제약을 위반하지 않기 위해 `AuthActionState` 타입과 `initialAuthActionState` 상수를 `actions.ts`에서 분리하여 새 파일 `apps/web/lib/auth/auth-state.ts`로 추출하는 리팩토링이 진행되었다.

**현 상태 검증 결과** (2026-05-25 기준):

| 파일 | import 경로 갱신 상태 |
|------|---------------------|
| `apps/web/lib/auth/auth-state.ts` | ✅ 신규 생성 — `AuthActionState`, `initialAuthActionState` 정의 |
| `apps/web/lib/auth/actions.ts` | ✅ `import type { AuthActionState } from './auth-state'` 적용 (line 35) |
| `apps/web/lib/auth/actions.test.ts` | ✅ import 경로 갱신됨 |
| `apps/web/app/(auth)/login/page.tsx` | ✅ `@/lib/auth/auth-state` 로 갱신 (line 18) |
| `apps/web/app/(auth)/signup/page.tsx` | ✅ `@/lib/auth/auth-state` 로 갱신 (line 15) |
| `apps/web/app/(auth)/password-reset/page.tsx` | ✅ `@/lib/auth/auth-state` 로 갱신 (line 15) |
| `apps/web/app/(auth)/password-reset/confirm/page.tsx` | ✅ `@/lib/auth/auth-state` 로 갱신 (line 16) |

**남은 확인 항목**:

- WHEN `verify-email` 페이지가 존재한다면, THE SYSTEM SHALL `@/lib/auth/auth-state` import 경로를 사용한다 (해당 페이지는 `useActionState`를 쓰지 않을 수 있으므로 확인 필요).
- WHEN 패키지 `@rhymix-ts/auth` 외부에서 `AuthActionState`를 import 하는 곳이 있다면, THE SYSTEM SHALL `apps/web/lib/auth/actions`의 re-export를 통한 import도 허용한다 (호환성 유지).
- IF `apps/web/lib/auth/actions.ts`가 `AuthActionState`를 type-only re-export하지 않는다면, THEN THE SYSTEM SHALL `export type { AuthActionState } from './auth-state'` 한 줄을 추가하여 기존 import 경로를 깨지 않는다.

**`redirect` import 추가의 의미** (`actions.ts` line 17):

```ts
import { redirect } from 'next/navigation';
```

이는 `loginAction` 내부에서 `redirect: false` 옵션으로 Auth.js의 `signIn()`을 호출한 뒤 (rememberMe 처리 후 autologin 쿠키 발급), 명시적으로 `redirect(callbackUrl)`를 호출하여 콜백 URL로 이동하기 위한 변경이다 (`actions.ts` line 173). 즉, 로그인 성공 후 다음 동작 순서가 명확해졌다:

1. `signIn('credentials', { redirect: false, ... })` — 인증만 수행, 응답 리다이렉트 억제.
2. 성공 시 rememberMe가 true이면 `createAutoLogin()` 호출 → 쿠키 발급.
3. 명시적 `redirect(callbackUrl)` 호출 → Next.js가 throw하는 `NEXT_REDIRECT` 예외를 통해 클라이언트가 콜백 URL로 이동.

**기존 동작과 차이**: 이전에는 Auth.js의 내장 redirect throw에 의존했으나, rememberMe 처리 시점이 redirect 이후로 밀려 자동 로그인 쿠키가 즉시 발급되지 않는 race가 존재할 수 있었다. 변경 후에는 쿠키 발급 → redirect 순서가 보장된다.

**Acceptance Criteria**:
- GIVEN 위 7개 파일 모든 import 경로가 갱신된 상태, WHEN `tsc --noEmit`을 실행, THEN type error가 발생하지 않는다.
- GIVEN 로그인 폼에서 rememberMe를 체크한 사용자가 제출, WHEN 인증 성공, THEN autologin 쿠키가 발급된 직후 `callbackUrl`로 이동한다.
- GIVEN 482개 기존 테스트, WHEN 회귀 실행, THEN 모두 통과한다.

**커밋 단위 권고**: 단일 커밋 `refactor(auth): extract AuthActionState into auth-state.ts to comply with 'use server' module constraint`로 묶는다.

### 1.2 `User.id` 타입 결정 문서화

**확정 결정**: `User.id` 는 `Int @autoincrement` 유지. 이는 의도된 선택이며, 다음 근거로 결정되었다:

- Rhymix PHP 원본의 `member_srl`이 정수 PK였고, 마이그레이션 시 호환성 유지가 우선.
- JWT payload에 정수 ID를 담는 편이 string `cuid()` 대비 token 크기 측면에서 유리.
- 외래 키 참조 비용(Int 4byte vs String 25byte) 측면에서 일관된 정수 사용이 인덱스 성능에 유리.

**조치 사항**: `packages/db/prisma/schema.prisma`의 `User` 모델에 다음 주석을 추가한다 (이미 추가된 경우 검증만 진행):

```prisma
/// Rhymix 호환성: User.id는 Int @autoincrement를 유지한다.
/// - 원본 PHP `member_srl` 마이그레이션 호환
/// - JWT payload 크기 최소화
/// - FK 인덱스 성능 최적화
model User { ... }
```

**검증 EARS 요구사항**:
- THE SYSTEM SHALL `User.id`를 `Int @autoincrement`로 유지한다.
- WHEN 새 도메인 모델이 `User`를 참조한다면, THE SYSTEM SHALL `Int` FK를 사용한다.
- IF 향후 외부 시스템 연동을 위해 UUID가 필요해진다면, THEN THE SYSTEM SHALL 별도 컬럼 `User.publicId String @unique`를 추가하여 ID와 분리한다 (FK 마이그레이션 회피).

---

## Section 2. P0 — SPEC-THEME-001 슬라이스 분해

**상황**: SPEC-THEME-001의 spec.md는 매우 상세하나 (REQ 130여 개, 14개 도메인 영역), **슬라이스 계획·구현은 전무**. 이는 다음 모든 UI 렌더링의 최상위 블로커이다:
- AUTH 페이지(로그인/회원가입)는 layout 없이 임시 컴포넌트로 동작 중.
- ADMIN Shell은 자체 layout을 가지지만 site 영역 layout과 분리.
- CONTENT(board) 렌더링은 ThemeResolver / Skin 없이는 불가능.

**전체 슬라이스 의존 그래프**:

```
A (Schema)
   │
   ▼
B (Registry + Resolver) ──┐
   │                      │
   ▼                      ▼
C (ThemeProvider)    D (Default Theme Package)
   │                      │
   └──────────┬───────────┘
              ▼
         E (Admin UI)
              │
              ▼
         F (Dark Mode + Token Editor)
```

### Slice A: Foundation — Prisma 스키마 + Theme 도메인 패키지

**Scope**:
- `packages/db/prisma/schema.prisma` — `Theme`, `Layout`, `Skin`, `ColorSet`, `WidgetStyle`, `ThemeAssignment` 모델 추가 + 4개 enum (`ThemeStatus`, `LayoutType`, `AssignmentScope`, `MobileLayoutMode`).
- `packages/db/prisma/migrations/{timestamp}_theme_foundation/` — 마이그레이션 파일 생성.
- `packages/core/src/theme/types.ts` (신규) — `ThemeManifest`, `Tokens`, `ResolvedTheme` TypeScript 타입.
- `packages/core/src/theme/schema.ts` (신규) — `themeManifestSchema` Zod 스키마 (REQ-THEME-001).
- `packages/core/src/theme/schema.test.ts` — 매니페스트 유효성 검증 테스트.

**Dependencies**: 없음 (가장 먼저 진행).

**Success Criteria (EARS)**:
- THE SYSTEM SHALL Prisma migrate를 무오류로 적용한다.
- WHEN Zod 스키마가 잘못된 manifest를 받으면, THE SYSTEM SHALL 실패 필드 경로를 포함한 에러를 반환한다 (REQ-THEME-002).
- THE SYSTEM SHALL `manifest.version`을 semver 패턴으로 검증한다 (REQ-THEME-003).

**Test Count Delta**: +8 (Zod 검증 6개 + 마이그레이션 smoke 2개) → 누적 약 490.

### Slice B: ThemeRegistry + ThemeResolver

**Scope**:
- `apps/web/lib/theme/registry.ts` (신규) — `ThemeRegistry` 인터페이스 + 인메모리 구현 (`getTheme`, `getLayout`, `getSkin`, `getWidgetStyle`, `resolveTokens`).
- `apps/web/lib/theme/registry.test.ts` — 부모 체인 fallback, 미등록 스킨 fallback 테스트.
- `apps/web/lib/theme/resolver.ts` (신규) — `ThemeResolver.resolve({ mid, requestHeaders })` 함수. 다음 순서로 resolution chain 실행:
  1. module-instance override (`ThemeAssignment` scope=MODULE_INSTANCE)
  2. domain assignment (scope=DOMAIN, hostname 매칭)
  3. site default (scope=SITE)
  4. built-in `FallbackLayout` (REQ-THEME-013)
- `apps/web/lib/theme/resolver.test.ts` — resolution chain 4단계 테스트 + 로깅 검증.
- `apps/web/lib/theme/loader.ts` (신규) — `themes/{theme}/` 디렉토리에서 manifest를 동적 로드 + 캐싱.

**Dependencies**: Slice A 완료.

**Success Criteria (EARS)**:
- WHEN 모듈 인스턴스가 skin override를 가지면, THE SYSTEM SHALL 해당 skin을 우선 적용한다 (REQ-THEME-061).
- WHERE module-instance override가 없으면, THE SYSTEM SHALL domain assignment를 사용한다 (REQ-THEME-051).
- IF 부모 테마에 layout/skin이 없으면, THEN THE SYSTEM SHALL 빌트인 fallback을 사용한다 (REQ-THEME-022).
- WHEN resolution이 완료되면, THE SYSTEM SHALL chain log (`module:X → domain:Y → site:Z`)를 emit한다 (AC-THEME-010).

**Test Count Delta**: +15 (registry 7개 + resolver 8개) → 누적 약 505.

### Slice C: ThemeProvider RSC + CSS Variable Injection

**Scope**:
- `apps/web/components/theme-provider.tsx` (신규) — React Server Component. `tokens`, `mode` props를 받아 `<style data-rx-theme>:root{--rx-...} .dark{--rx-...}</style>` 블록을 inline emit.
- `apps/web/components/theme-provider.test.tsx` — RSC 출력 HTML에 CSS 변수 포함 검증.
- `apps/web/lib/theme/tokens-to-css.ts` (신규) — `tokensToCssVars(tokens)` 순수 함수.
- `apps/web/lib/theme/tokens-to-css.test.ts` — 토큰 → CSS 변환 단위 테스트.
- `apps/web/app/[mid]/page.tsx` (신규) — 모듈 인스턴스 라우트 entry RSC. `ThemeResolver.resolve()` 호출 → `<ThemeProvider><Layout><Skin /></Layout></ThemeProvider>` 구성.
- `apps/web/app/[mid]/page.test.tsx` — page composition 통합 테스트.
- `apps/web/tailwind.config.ts` 수정 — Tailwind 4 `@theme inline` 블록을 추가하여 `bg-primary` 등이 `var(--rx-color-primary)`로 해석되게 함 (REQ-THEME-033).

**Dependencies**: Slice B 완료.

**Success Criteria (EARS)**:
- THE SYSTEM SHALL `--rx-` 접두사를 가진 CSS 커스텀 프로퍼티로 모든 토큰을 expose한다 (REQ-THEME-030).
- WHEN admin이 토큰 값만 수정하면, THE SYSTEM SHALL 다음 HTTP 응답에서 rebuild 없이 새 값을 반영한다 (REQ-THEME-130, AC-THEME-130).
- WHERE Tailwind utility가 토큰을 참조하면, THE SYSTEM SHALL `@theme inline` 블록을 통해 같은 변수를 사용한다.

**Test Count Delta**: +12 (provider 4개 + tokens-to-css 5개 + page 3개) → 누적 약 517.

### Slice D: Default Theme Package (`themes/default/`)

**Scope**:
- `themes/default/manifest.ts` (신규) — `name: 'default'`, 기본 토큰 schema, layouts/skins/widgetStyles 선언. Rhymix XEDITION을 참조하되 단순화.
- `themes/default/tokens.ts` (신규) — light/dark 토큰 default 값.
- `themes/default/tokens.css` (신규) — `:root { ... } .dark { ... }` 정의.
- `themes/default/layouts/default.tsx` (신규) — 상단 nav + main + footer 구조 RSC.
- `themes/default/layouts/minimal.tsx` (신규) — 헤더 없는 단순 레이아웃 (AUTH 페이지용).
- `themes/default/skins/board/default.tsx` (신규) — Slice B에서 정의한 `SkinProps` 타입을 준수하는 기본 게시판 스킨.
- `themes/default/skins/page/default.tsx` (신규) — 페이지 모듈 기본 스킨.
- `themes/default/widget-styles/card.tsx`, `bare.tsx` (신규).
- `themes/default/index.ts` (신규) — 정적 분석용 re-export.
- `themes/default/manifest.test.ts` — manifest가 Slice A의 Zod 스키마 통과 검증.
- `apps/web/app/layout.tsx` 수정 — root layout이 default 테마의 `tokens.css`를 inject.

**Dependencies**: Slice B, C 완료.

**Success Criteria (EARS)**:
- WHEN 클린 설치 후 `/` 요청이 도착, THE SYSTEM SHALL `default` 테마의 `default` layout으로 렌더한다.
- THE SYSTEM SHALL `themes/default/`를 npm 패키지처럼 자기완결적으로 구성한다 (외부 import 없음).
- WHERE `mlayout_srl = -2` 인 경우, THE SYSTEM SHALL desktop layout을 재사용한다 (REQ-THEME-091).

**Test Count Delta**: +6 (manifest 검증 2개 + layout/skin smoke 4개) → 누적 약 523.

### Slice E: Admin UI — Theme Assignment Management

**Scope**:
- `apps/web/app/admin/site/design/page.tsx` (신규) — 3-pane editor (Pane 1: 레이아웃, Pane 2: 스킨, Pane 3: 토큰 폼).
- `apps/web/app/admin/site/design/_components/PaneLayouts.tsx` — domain별 default layout 선택 + PC/Mobile 탭.
- `apps/web/app/admin/site/design/_components/PaneSkins.tsx` — module instance(mid)별 skin override.
- `apps/web/app/admin/site/design/_components/PaneTokens.tsx` — `tokensSchema`로부터 자동 생성되는 폼 (Zod → react-hook-form bridge).
- `apps/web/server/routers/theme.ts` (신규) — tRPC router: `list`, `install`, `activate`, `preview`, `updateTokens`, `listSkins`.
- `apps/web/server/routers/layout.ts` (신규) — `layout.assign`.
- `apps/web/server/routers/skin.ts` (신규) — `skin.assign`.
- 각 router별 test 파일.

**Dependencies**: Slice D 완료 (편집 대상이 존재해야 함).

**Success Criteria (EARS)**:
- WHEN 관리자가 PaneTokens에서 `--rx-color-primary`를 변경하면, THE SYSTEM SHALL 다음 요청부터 새 값을 반영한다.
- WHEN 관리자가 module instance에 skin override를 지정, THE SYSTEM SHALL 해당 mid에만 적용하고 다른 mid는 default skin을 유지한다 (AC-THEME-020).
- THE SYSTEM SHALL 모든 admin 작업을 audit log로 기록한다 (ADMIN-001 통합).

**Test Count Delta**: +20 (UI 8개 + tRPC 12개) → 누적 약 543.

### Slice F: Dark Mode + Token Editor Polish

**Scope**:
- `apps/web/components/theme-toggle.tsx` (신규) — `next-themes` `useTheme` 사용 클라이언트 컴포넌트.
- `apps/web/lib/theme/dark-mode.ts` (신규) — dark token variant 존재 여부 판정 헬퍼.
- `apps/web/app/layout.tsx` 수정 — `<ThemeProvider attribute="class">` (next-themes) wrapping.
- `apps/web/components/theme-toggle.test.tsx`.
- Slice E의 `PaneTokens`에 다크모드 토큰 편집 탭 추가.
- `themes/default/tokens.ts` 수정 — dark variant 보강.

**Dependencies**: Slice E 완료.

**Success Criteria (EARS)**:
- WHEN 사용자가 다크모드 토글, THE SYSTEM SHALL `<html class="dark">`를 적용하고 `localStorage`에 preference를 저장한다 (REQ-THEME-040/041, AC-THEME-040).
- IF 테마가 dark token을 제공하지 않으면, THEN THE SYSTEM SHALL 다크모드 토글 UI를 비활성화한다 (REQ-THEME-043).
- WHEN 사용자가 첫 방문, THE SYSTEM SHALL `prefers-color-scheme`을 기본값으로 사용한다.

**Test Count Delta**: +8 → 누적 약 551.

### THEME 전체 누적 영향

- 신규 파일 약 40개, 신규 테스트 약 69개.
- 기존 482 → 약 551 테스트.
- 모든 기존 페이지(login, signup, admin)는 Slice C 완료 시점에 새 `ThemeProvider` 하위로 마이그레이션 검증 필요.

---

## Section 3. P1 — Content와 Mail

### 3.1 SPEC-CONTENT-001 Slice B — tRPC CRUD + Board UI

**현황**: Slice A에서 Prisma 스키마(`Board`, `Document`, `Comment`)와 FTS(GENERATED `search_vector` + GIN index) 완료. 도메인 로직과 UI는 미착수.

**Slice B Scope**:

- `packages/core/src/board/` — Board/Document/Comment 도메인 서비스.
  - `board-service.ts`: list, getById, create, update, delete.
  - `document-service.ts`: list (페이지네이션 + 검색), get, create, update, delete, view count 증가.
  - `comment-service.ts`: list (트리 구조), create (자식 댓글 포함), update, delete.
  - 각 서비스 test 파일.
- `apps/web/server/routers/document.ts` — tRPC document CRUD.
- `apps/web/server/routers/comment.ts` — tRPC comment CRUD.
- `apps/web/server/routers/board.ts` — tRPC board CRUD.
- `apps/web/app/board/[mid]/page.tsx` — 게시판 목록 페이지 (THEME Slice C 완료 후 가능).
- `apps/web/app/board/[mid]/write/page.tsx` — 작성 폼.
- `apps/web/app/board/[mid]/[documentSrl]/page.tsx` — 문서 보기.
- 각 페이지 통합 테스트.

**Dependencies**:
- **Hard dependency**: THEME Slice C (ThemeProvider) + Slice D (default board skin). 단, tRPC/도메인 로직만 먼저 진행 가능.
- **Soft dependency**: AUTH-001 (작성 시 로그인 필요).

**병행 진행 가능성**: tRPC + 도메인 서비스는 THEME과 무관하게 시작 가능. UI는 THEME Slice D 완료 후 도착.

**EARS 요구사항 예시**:
- WHEN 사용자가 게시글을 작성하면, THE SYSTEM SHALL `Document`를 생성하고 `Board.documentCount`를 증가시킨다.
- WHEN 검색어가 입력되면, THE SYSTEM SHALL `search_vector @@ to_tsquery(...)` 쿼리로 결과를 반환한다.
- WHILE 사용자가 비로그인 상태이면, THE SYSTEM SHALL 작성 폼 접근 시 `/login`으로 redirect한다.
- IF 댓글 깊이가 5단계를 초과하면, THEN THE SYSTEM SHALL 그 이상의 depth를 거부한다.

**Test Count Delta**: +35 (도메인 15 + tRPC 12 + UI 8) → THEME 후 누적 약 586.

**Priority**: P1 — board는 Rhymix의 핵심 모듈이지만 THEME 없이는 UI 표시 불가하므로 THEME P0 작업과 부분 병행.

### 3.2 MailDispatcher — 실제 SMTP 구현

**현황**: `NoopMailDispatcher`가 모든 메일 전송을 swallow. 이메일 인증, 비밀번호 재설정, 회원가입 환영 메일이 콘솔에만 출력됨.

**의사결정 옵션**:

| 옵션 | 장점 | 단점 |
|------|------|------|
| **(권장) A. 현 프로젝트 내 SMTP 구현** | 즉시 production 가능. 외부 의존 최소. | 인프라(이메일 큐, 재시도 정책) 일부 중복. |
| B. SPEC-INFRA-001 대기 | 메시지 큐 + 메일 인프라 일관성. | INFRA SPEC 작성·구현까지 AUTH 플로우 불완전. |
| C. Resend/SendGrid SaaS | 운영 부담 ↓. dev-friendly. | 외부 API 비용·rate limit. |

**권고**: **옵션 A** — `MailDispatcher` 인터페이스는 유지하고, `SmtpMailDispatcher`를 `nodemailer` 기반으로 구현한다. 다음 환경변수로 제어:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- 부재 시 `NoopMailDispatcher`로 graceful fallback (현재 동작 유지).

**근거**:
- 현재 AUTH-001의 이메일 인증/패스워드 리셋 acceptance criteria는 "메일이 발송된다"를 가정. 옵션 B를 기다리면 실제 production 배포가 막힌다.
- INFRA SPEC이 나중에 진행되면 `SmtpMailDispatcher`를 `QueueBackedMailDispatcher`로 교체하는 작업은 단일 클래스 swap이므로 비용이 작다.
- Resend(옵션 C)는 dev/staging에서만 적용하고 production은 SMTP 사용도 가능 (`MailDispatcher` 인터페이스가 추상화).

**Scope**:
- `packages/auth/src/mail/smtp-dispatcher.ts` (신규).
- `packages/auth/src/mail/smtp-dispatcher.test.ts` — `nodemailer` mock으로 단위 테스트.
- `packages/auth/src/mail/index.ts` — env 기반 디스패처 선택 factory.
- `apps/web/.env.example` 수정 — SMTP 변수 추가.
- 이메일 템플릿 (HTML + plain text):
  - `verify-email.template.ts`
  - `password-reset.template.ts`
  - `welcome.template.ts`

**EARS 요구사항**:
- WHEN `SMTP_HOST` 환경변수가 설정되면, THE SYSTEM SHALL `SmtpMailDispatcher`를 사용한다.
- WHERE `SMTP_HOST`가 없으면, THE SYSTEM SHALL `NoopMailDispatcher`로 fallback하고 console.warn으로 알린다.
- WHEN SMTP 발송이 실패하면, THE SYSTEM SHALL 3회 재시도 후 audit log에 실패를 기록한다.
- IF SMTP 큐 구현이 추가되면 (옵션 B 후속), THEN THE SYSTEM SHALL `MailDispatcher` 인터페이스만 변경하여 swap 가능하다.

**Test Count Delta**: +12 → 누적 약 598.

**Priority**: P1 — production 배포의 hard prerequisite.

---

## Section 4. P2 — Admin Completion

### 4.1 SPEC-ADMIN-001 Slice G — Widget System

**참조**: `.moai/specs/SPEC-ADMIN-001/slice-g-plan.md` (작성 완료, status: ready).

**Scope 요약**:
- G-1: `WidgetRegistry` (packages/core/src/widgets/) — registerWidget/getWidget/listWidgets/resetWidgetRegistry.
- G-2: `rx-widget` 렌더러 (apps/web/lib/widgets/) — `<rx-widget name="..." props='...' />` 토큰 파싱 → React 컴포넌트 치환.
- G-3: 내장 hello widget + admin/widgets 페이지.

**Acceptance Criteria 발췌**:
- AC-G-1-1: `registerWidget` 후 `getWidget('hello')` → 등록된 위젯 반환.
- AC-G-2-2: 미등록 위젯 + 비관리자 → 빈 `<span>` (오류 노출 없음).
- AC-G-2-3: 미등록 위젯 + 관리자 → `data-widget-error` 속성 포함 span.

**Dependencies**: ADMIN Slice F 완료 (이미 완료됨).

**Test Count Delta**: +15 → 누적 약 613.

**Priority**: P2 — board 콘텐츠 영역의 dynamic content 삽입에 사용되지만, 기본 board UI에는 즉시 영향 없음.

### 4.2 SPEC-ADMIN-001 Slice H — Export/Import + AdminFavorites

**참조**: `.moai/specs/SPEC-ADMIN-001/slice-h-plan.md` (작성 완료, status: ready).

**Scope**:
- REQ-ADMIN-091/092/093: 메뉴/모듈 인스턴스/콘텐츠의 export(JSON/CSV) + import.
- REQ-ADMIN-100/101: AdminFavorites — 관리자가 자주 사용하는 메뉴를 즐겨찾기로 등록.

**Dependencies**: Slice G 완료 (widget instance 정의가 import/export 대상에 포함될 수 있음).

**Priority**: P2 — multi-tenant 운영 편의 기능.

### 4.3 SPEC-ADMIN-001 Slice I — 잔여 REQ 마무리

**현황**: `slice-i-plan.md` status가 `completed` 라고 표기되어 있으나, 실제 코드 적용 상태 검증 필요.

**Scope (계획서 기준)**:
- REQ-ADMIN-023: 2FA 강제 (admin level별 정책).
- REQ-ADMIN-031: cross-level DnD (메뉴 재배치 시 부모 변경).
- REQ-ADMIN-043: WidgetInstance DB 프리셋 저장 (Slice G 후속).
- REQ-ADMIN-072: AdminLog IP 필터.
- REQ-ADMIN-090: 모듈 일괄 작업 UI.

**확인 액션**: REMEDIATION 진행 전 다음 명령으로 실제 구현 여부를 검증:
- `grep -r "REQ-ADMIN-023\|REQ-ADMIN-031\|REQ-ADMIN-043\|REQ-ADMIN-072\|REQ-ADMIN-090" apps/web packages/`
- 테스트 결과: 5개 REQ별 acceptance test 존재 여부 확인.

**Dependencies**: Slice H 완료.

**Priority**: P2 — operational hardening, 후순위.

---

## Section 5. Priority Matrix

| 항목 | Priority | Blocking 대상 | Effort | 누적 테스트 영향 |
|------|----------|--------------|--------|----------------|
| 1.1 AuthActionState imports 검증 + 커밋 | P0-hot | THEME 작업 시작 | Low | 0 (회귀 검증) |
| 1.2 User.id 타입 schema.prisma 주석 | P0-hot | 미래 마이그레이션 혼동 | Low | 0 |
| 2.A THEME Slice A (Schema) | P0 | 모든 THEME 작업 | Low | +8 |
| 2.B THEME Slice B (Resolver) | P0 | Page 렌더링, ADMIN 통합 | Medium | +15 |
| 2.C THEME Slice C (ThemeProvider) | P0 | Page 렌더링, Board UI | Medium | +12 |
| 2.D THEME Slice D (default theme) | P0 | 모든 사용자 페이지 표시 | Medium | +6 |
| 3.1 CONTENT Slice B (tRPC) | P1 | Board 기능 (UI는 THEME D 후) | High | +35 |
| 2.E THEME Slice E (Admin UI) | P1 | 테마 관리 기능 | Medium | +20 |
| 3.2 MailDispatcher (SMTP) | P1 | Production 배포 | Medium | +12 |
| 2.F THEME Slice F (dark mode) | P2 | UX 개선 (필수 아님) | Medium | +8 |
| 4.1 ADMIN Slice G (widgets) | P2 | Board 동적 콘텐츠 | Medium | +15 |
| 4.2 ADMIN Slice H (export/import) | P2 | Multi-tenant 운영 | High | TBD |
| 4.3 ADMIN Slice I (잔여 REQ) | P2 | Hardening | Medium | TBD |

### 권장 실행 순서

1. **즉시(Block 0)**: Section 1.1 + 1.2 → 1개 커밋으로 정리 (`refactor(auth): ...` + schema 주석).
2. **Block 1 (P0 core)**: THEME Slice A → B → C → D 직렬 진행. 이 4개가 완료되어야 어떤 사용자 페이지든 표시 가능.
3. **Block 2 (P1 병행)**: 다음 두 트랙 병행:
   - Track 2a: THEME Slice E (Admin UI) + 다음 단계 F (dark mode).
   - Track 2b: CONTENT Slice B (도메인 + tRPC는 THEME 무관, UI는 Block 1 완료 후).
   - Track 2c: MailDispatcher SMTP (독립적, 언제든 진행 가능).
4. **Block 3 (P2 hardening)**: ADMIN Slice G → H → I 직렬.

### Token Budget 계획

- 각 THEME 슬라이스(A~F): Plan 30K + Run 180K + Sync 40K = 250K 토큰 × 6 = 1.5M 토큰.
- CONTENT Slice B: 약 250K.
- MailDispatcher: 약 150K (단일 패키지 영역).
- ADMIN Slice G/H/I: 각 250K × 3 = 750K.
- **총 예상**: 약 2.65M 토큰 (세션별 `/clear` 분할 진행 필수).

---

## Section 6. 비범위 / Out-of-Scope

본 plan은 다음을 포함하지 않는다:
- 구체적 코드 구현 (각 슬라이스의 별도 SPEC/Plan에서 진행).
- AUTH-001 신규 기능 추가 (현재 Slice H까지 완료, 추가 작업 없음).
- 외부 OAuth provider 연동 (별도 SPEC).
- 캐싱 레이어(Redis) 추가 (SPEC-INFRA-001 영역).
- 모니터링/관측성(OpenTelemetry) (별도 SPEC).
- E2E 테스트 자동화 인프라 (별도 SPEC).

---

## Section 7. 위험요인

| 위험 | 가능성 | 영향 | 완화책 |
|------|--------|------|--------|
| THEME Slice 진행 중 ADMIN Shell이 일시적으로 깨짐 | Medium | High | Slice C 완료 시 admin/* 경로도 새 ThemeProvider 하위로 마이그레이션 + 회귀 테스트 482개 통과 확인 |
| ThemeResolver 성능 (DB hit per request) | Medium | Medium | 모듈 instance + domain assignment를 메모리 캐시. 무효화는 admin 변경 시 발생 |
| Default theme tokens 미흡으로 폼/버튼 일관성 결여 | High | Medium | shadcn/ui 기본 토큰명을 `--rx-`로 alias한 manifest 작성 |
| SMTP 발송 실패가 회원가입 UX를 차단 | Medium | High | 메일 발송은 비동기/best-effort. 회원가입 성공은 user record 생성 시점에 확정 |
| CONTENT tRPC 도입이 기존 admin tRPC와 router 네임스페이스 충돌 | Low | Low | router 네임스페이스를 `document`, `comment`, `board`로 분리 (admin은 `admin.*`) |

---

## Section 8. 다음 단계

이 plan을 user가 승인하면 다음 순서로 SPEC을 진행한다:

1. `/moai plan` 호출하여 위 1.1 + 1.2 작업을 단일 PR 단위로 묶는 micro-SPEC 작성 (예: `SPEC-CHORE-001`).
2. THEME Slice A부터 순차적으로 `/moai run SPEC-THEME-001` 진행. 단, 각 슬라이스를 독립 SPEC으로 분할하지 않고 SPEC-THEME-001 내 `slice-a-plan.md` ~ `slice-f-plan.md`로 추가하는 것을 권고 (ADMIN-001과 동일 패턴).
3. CONTENT Slice B와 MailDispatcher는 각각 `SPEC-CONTENT-001/slice-b-plan.md`, `SPEC-MAIL-001/spec.md`로 분리 진행.

---

Version: 1.0.0
Last Updated: 2026-05-25
Status: pending user approval
Related SPECs: SPEC-AUTH-001, SPEC-ADMIN-001, SPEC-CONTENT-001, SPEC-THEME-001, SPEC-INSTALL-001
