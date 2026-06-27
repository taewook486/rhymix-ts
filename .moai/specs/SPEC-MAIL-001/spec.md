---
id: SPEC-MAIL-001
title: SMTP 메일 디스패처 (SmtpMailDispatcher Replacing NoopMailDispatcher)
version: 1.0.0
status: completed
created_at: 2026-05-27
updated_at: 2026-06-27
author: MoAI manager-spec
priority: P1
labels: [mail, smtp, phase3]
phase: 3
parent: MASTER-PLAN-002
depends-on: [SPEC-AUTH-001, SPEC-ADMIN-001]
issue_number: TBD
related-research: SPEC-MAIL-001/research.md
language: ko
---

# SPEC-MAIL-001 — SMTP 메일 디스패처 (Phase 3 / P1)

## HISTORY

- 2026-05-27 (v1.0.0): 최초 작성. MASTER-PLAN-002 Section 5.9(line 330~339)의 직접 흡수 + REMEDIATION-PLAN-001 Section 3.2(line 287~326)의 처분 반영. REMEDIATION 리뷰(Gemini 2026-05-25)에서 `NoopMailDispatcher` 사용을 **production 배포의 hard blocker**로 식별 — 이메일 인증, 비밀번호 재설정, 회원가입 환영 메일이 콘솔에만 출력되어 가입 흐름이 실제 환경에서 완결되지 않는다. 현재 `packages/auth/src/mail.ts`(68 LoC)에 `MailDispatcher` 인터페이스 + `NoopMailDispatcher` + `InMemoryMailDispatcher`(테스트용)가 정의되어 있고, `apps/web/lib/auth/actions.ts:80`과 `actions.ts:251`에서 `new NoopMailDispatcher()`가 하드코딩되어 있다(signupAction + requestPasswordResetAction). 본 SPEC은 (a) `SmtpMailDispatcher` 신규 구현(nodemailer 기반), (b) 환경변수 기반 디스패처 선택 factory, (c) 3개 이메일 템플릿(verify-email, password-reset, welcome) 한/영 i18n, (d) 3회 지수 백오프 재시도 + AuditLog 실패 기록, (e) 관리자 메일 설정 점검 UI 최소형(연결 테스트 버튼)을 단일 슬라이스로 구현한다.

---

## 1. Goal & Audience

### 1.1 Goal

**`NoopMailDispatcher`를 실제 SMTP 발송이 가능한 `SmtpMailDispatcher`로 대체하여, 회원 인증 흐름(가입 인증 / 비밀번호 재설정 / 가입 환영)이 production 환경에서 완결되도록 한다.** 구체적으로:

- `packages/auth/src/mail.ts`의 `MailDispatcher` 인터페이스를 **유지**한다(breaking change 금지) — 인증 흐름의 호출 측(`signup.ts`, `password-reset.ts`) 변경 없음.
- 신규 `SmtpMailDispatcher`(nodemailer ^6.9.0 기반)를 `packages/auth/src/mail/smtp-dispatcher.ts`로 추가한다.
- `packages/auth/src/mail/factory.ts` 신규 — `createMailDispatcher(env)` factory가 환경변수에 따라 SMTP 또는 Noop을 선택한다.
- `apps/web/lib/auth/actions.ts`의 `new NoopMailDispatcher()` 두 곳을 모듈 스코프 싱글톤(`mailDispatcher = createMailDispatcher(process.env)`)으로 교체한다.
- 이메일 템플릿 3개를 `packages/auth/src/mail/templates/`에 추가하며, 한국어/영어 두 언어를 namespace로 분리(`mail.ko.ts`, `mail.en.ts`)한다. HTML + plaintext fallback 둘 다 지원.
- SMTP 발송 실패 시 3회 지수 백오프(1s / 2s / 4s) 재시도, 모두 실패하면 `AuditLog`(action='MAIL_DELIVERY_FAILED')에 기록.
- 관리자 페이지(`apps/web/app/admin/site/mail/page.tsx`)에서 현재 SMTP 설정을 표시하고 "연결 테스트" 버튼으로 디스패처 헬스체크 호출.

### 1.2 Audience

- expert-backend agent — Slice A 구현 (SmtpMailDispatcher + factory + templates + retry + audit log)
- expert-frontend agent — Slice A 후반 (AdminMailSettings 페이지 스캐폴드 — 최소 표시 + 연결 테스트 버튼)
- 운영자/배포 담당 — `.env`에 SMTP 변수를 설정하여 production 메일 발송을 활성화하는 최종 사용자
- DevOps — Docker Compose 또는 Kubernetes secret에 SMTP 자격증명을 주입하는 책임자

### 1.3 Non-Goals (본 SPEC 범위 외)

- **Resend/SendGrid/AWS SES SaaS 백엔드** — MASTER-PLAN-002 Section 6.1 결정에 따라 Phase 3는 SMTP 우선. SaaS 백엔드는 동일 `MailDispatcher` 인터페이스로 후속 SPEC(SPEC-MAIL-SAAS-001)에서 추가.
- **메시지 큐 기반 비동기 발송** — 본 SPEC은 fire-and-forget + 3회 inline 재시도만. Redis BullMQ/Inngest 같은 큐는 SPEC-INFRA-001 영역.
- **이메일 발송 통계 대시보드** — 운영 도구 영역. AuditLog 기록만 ship.
- **사용자별 메일 수신 환경설정 UI** — SPEC-MEMBER-POLISH-001(후속).
- **마케팅/뉴스레터 발송** — 본 SPEC은 transactional 메일만 (verify-email, password-reset, welcome).
- **이메일 인증 토큰 재발송 rate limit** — SPEC-AUTH-001 영역(이미 일부 구현). 본 SPEC은 발송 자체의 transport만.
- **DKIM/SPF/DMARC 자동 설정** — SMTP 서버 측 책임. 본 SPEC은 from 주소가 올바르게 설정되었음을 가정.
- **이메일 templates WYSIWYG 편집** — 본 SPEC은 코드 내 템플릿(`.ts` 모듈)만. DB 기반 템플릿은 백로그.
- **첨부파일** — verify/reset/welcome 메일은 첨부 없음. 첨부 지원은 백로그.
- **다국어 13개 풀 지원** — 본 SPEC은 ko/en 2개. 13개 풀 i18n은 별도 SPEC.
- **PHP `modules/advanced_mailer`의 전체 기능 포팅** — PHPMailer wrapper의 풀 기능(SMTP pool, mail queue, Resend driver, AWS SES driver, SendGrid driver)은 본 SPEC 범위 외. nodemailer 기본 transport만 ship.
- **이메일 bounce/complaint 핸들링** — SaaS 백엔드 도입 시 webhook으로 처리. SMTP 단독 환경에서는 불가능.
- **HTML 이메일 미디어 쿼리/다크모드 대응** — 기본 inline CSS만. premailer 같은 후처리는 백로그.

자세한 Out-of-Scope은 본 SPEC 마지막 `## Exclusions` 절 참조.

---

## 2. Requirements (EARS Format)

본 SPEC은 모든 요구사항을 EARS(Easy Approach to Requirements Syntax) 형식으로 기술한다. 8개 카테고리(Interface, Dispatcher Selection, SMTP Transport, Templates, Retry & Audit, Admin UI, Quality, Integration)로 그룹화.

> **REQ Numbering Convention (블록 번호 규약)**: 본 SPEC의 REQ는 카테고리별로 10단위 블록을 예약하는 방식을 따른다. 각 카테고리는 `REQ-MAIL-XX0 ~ XX9` 범위(10개 번호)를 점유하며, 카테고리 내부에서 실제 정의된 REQ 이후의 미사용 번호(예: 007~009, 018~019, 028~029, 038~039, 046~049, 056~059, 066~069)는 **향후 동일 카테고리 확장을 위해 의도적으로 비워둔 예약 번호**다. 이 gap들은 누락이 아니며, 섹션 헤더가 표기한 상한 번호(예: `REQ-MAIL-001 ~ 009`)는 해당 카테고리 블록의 예약 범위를 나타낸다. REQ 번호는 정의된 모든 항목에서 중복 없이 유일하며 3자리 zero-padding을 일관되게 적용한다.

### 2.1 Interface 보존 계층 (REQ-MAIL-001 ~ 009)

**REQ-MAIL-001 (Ubiquitous)**: The Mail system SHALL preserve the existing `MailDispatcher` interface (`packages/auth/src/mail.ts` line 31~33) without breaking changes — `dispatch(message: MailMessage): Promise<void>` 시그니처 유지.

**REQ-MAIL-002 (Ubiquitous)**: The Mail system SHALL preserve the existing `MailMessage` shape (`to: string`, `subject: string`, `template: MailTemplate`, `vars: Record<string, string>`) and `MailTemplate` union (`'signup-verify' | 'password-reset' | 'email-change' | 'security-alert'`). 신규 템플릿 추가는 본 SPEC에서 `'welcome'`만 union에 추가하며, 기존 4개는 변경 없음.

**REQ-MAIL-003 (Ubiquitous)**: The Mail system SHALL keep `NoopMailDispatcher` and `InMemoryMailDispatcher` exported from `packages/auth/src/mail.ts` for test environments. 두 클래스는 Slice A에서 제거 금지(테스트 의존성).

**REQ-MAIL-004 (Ubiquitous)**: The Mail system SHALL re-export `SmtpMailDispatcher` and `createMailDispatcher` from `packages/auth/src/index.ts` (barrel export) for `apps/web` 소비.

**REQ-MAIL-005 (Unwanted)**: The Mail system SHALL NOT log mail body content, mail recipients' personal data beyond the `to` address, or verification tokens at any log level (REQ-AUTH-055 — 평문 메일 본문 또는 인증 토큰을 로그에 남기지 않기). 디스패처 내부 디버그 로그는 `to`, `template`, `messageId`(SMTP response의 ID)만 허용.

**REQ-MAIL-006 (Ubiquitous)**: The Mail system SHALL define exactly one canonical mail dispatcher per app process — `apps/web/lib/mail/dispatcher.ts` 모듈 스코프 싱글톤. 매 액션마다 새 dispatcher 인스턴스를 생성하지 않는다(nodemailer transport는 connection pool을 관리).

### 2.2 Dispatcher Selection 계층 (REQ-MAIL-010 ~ 019)

**REQ-MAIL-010 (Event-Driven)**: WHEN `SMTP_HOST` environment variable is set (non-empty string), the Mail system SHALL instantiate `SmtpMailDispatcher` and return it from `createMailDispatcher(env)`. (MASTER-PLAN-002 Section 5.9 line 335 — Acceptance headline 1)

**REQ-MAIL-011 (State-Driven)**: WHERE `SMTP_HOST` is not set or is empty, the Mail system SHALL fall back to `NoopMailDispatcher` AND SHALL emit exactly one `console.warn` per process startup: `'[mail] SMTP_HOST not configured — using NoopMailDispatcher. Emails will NOT be delivered.'`. (MASTER-PLAN-002 Section 5.9 line 336 — Acceptance headline 2)

**REQ-MAIL-012 (Ubiquitous)**: The `createMailDispatcher(env)` factory SHALL read the following environment variables:
  - `SMTP_HOST` (required for SMTP mode) — string
  - `SMTP_PORT` (optional, default 587) — number, validated 1~65535
  - `SMTP_USER` (optional) — string; if absent, SMTP auth is disabled
  - `SMTP_PASS` (optional) — string; required if `SMTP_USER` is set
  - `SMTP_FROM` (required for SMTP mode) — RFC 5322 mailbox address (e.g., `"Rhymix <noreply@example.com>"`)
  - `SMTP_SECURE` (optional, default `false`) — boolean parsed from `'true'`/`'false'`; `true` enables TLS on connect (port 465), `false` uses STARTTLS upgrade (port 587)

**REQ-MAIL-013 (Event-Driven)**: WHEN `SMTP_HOST` is set BUT `SMTP_FROM` is missing or fails RFC 5322 mailbox validation, the factory SHALL throw `MailConfigError('SMTP_FROM is required when SMTP_HOST is set')` at process startup. 부분 설정으로 인한 silent failure 방지.

**REQ-MAIL-014 (Event-Driven)**: WHEN `SMTP_USER` is set BUT `SMTP_PASS` is missing, the factory SHALL throw `MailConfigError('SMTP_PASS is required when SMTP_USER is set')`.

**REQ-MAIL-015 (Event-Driven)**: WHEN `SMTP_PORT` is set BUT not a valid integer in [1, 65535], the factory SHALL throw `MailConfigError`. 비숫자 입력 거부.

**REQ-MAIL-016 (Unwanted)**: The factory SHALL NOT read environment variables during `dispatch()` calls — env 평가는 process 시작 시 한 번만. 재평가는 process 재시작 필요.

**REQ-MAIL-017 (Ubiquitous)**: The factory SHALL accept an optional `env: NodeJS.ProcessEnv = process.env` parameter for testability. 테스트는 임의 env 객체를 주입 가능.

### 2.3 SMTP Transport 계층 (REQ-MAIL-020 ~ 029)

**REQ-MAIL-020 (Ubiquitous)**: `SmtpMailDispatcher` SHALL use `nodemailer` (version ^6.9.0 or latest stable at SPEC implementation) as the SMTP transport library. Direct socket implementation is forbidden.

**REQ-MAIL-021 (Ubiquitous)**: `SmtpMailDispatcher` SHALL construct a single `nodemailer.Transporter` instance in its constructor and reuse it across all `dispatch()` calls (connection pool). The transporter SHALL be configured with `pool: true, maxConnections: 5, maxMessages: 100` (nodemailer defaults adjusted for moderate traffic).

**REQ-MAIL-022 (Event-Driven)**: WHEN `dispatch(message)` is called, `SmtpMailDispatcher` SHALL:
  1. Resolve the template (HTML + text) via `renderTemplate(message.template, message.vars, locale)` where `locale = message.vars.locale ?? 'ko'`
  2. Sanitize template variables (no raw HTML injection — DOMPurify or Handlebars escape)
  3. Call `transporter.sendMail({ from: SMTP_FROM, to: message.to, subject: message.subject, html, text })`
  4. On success, resolve. On failure, enter the retry policy (REQ-MAIL-040).

**REQ-MAIL-023 (Ubiquitous)**: `SmtpMailDispatcher` SHALL set the `from` header to `SMTP_FROM` exactly (no per-call override in this SPEC). Per-template `from` is deferred to backlog.

**REQ-MAIL-024 (Ubiquitous)**: `SmtpMailDispatcher` SHALL set both `html` and `text` parts of every email (multipart/alternative). 텍스트 없는 HTML 단독 메일 금지 — spam score 회피 + accessibility.

**REQ-MAIL-025 (Event-Driven)**: WHEN `dispatch()` is called with `message.to` that fails RFC 5322 syntax validation (Zod email() check), `SmtpMailDispatcher` SHALL throw `MailValidationError('invalid recipient')` immediately without invoking the transporter. 재시도 대상 아님.

**REQ-MAIL-026 (Ubiquitous)**: `SmtpMailDispatcher` SHALL expose a `verify(): Promise<boolean>` method that calls `transporter.verify()` (nodemailer health check) — 관리자 UI의 연결 테스트 버튼이 호출.

**REQ-MAIL-027 (Unwanted)**: `SmtpMailDispatcher` SHALL NOT accept attachment, cc, bcc, replyTo overrides in the `MailMessage` shape. 인터페이스 확장은 별도 SPEC.

### 2.4 Templates 계층 (REQ-MAIL-030 ~ 039)

**REQ-MAIL-030 (Ubiquitous)**: The Mail system SHALL ship 3 transactional templates at minimum:
  - `signup-verify` (existing `MailTemplate` value, 가입 이메일 인증)
  - `password-reset` (existing, 비밀번호 재설정 요청)
  - `welcome` (신규 — `MailTemplate` union에 추가, 가입 인증 완료 후 환영)
  
  기존 `'email-change'`, `'security-alert'`는 본 SPEC에서 placeholder template만 ship — 실제 호출처가 아직 없으므로 stub.

**REQ-MAIL-031 (Ubiquitous)**: Each template SHALL provide both HTML and plaintext renderers in two languages (ko, en):
  - `packages/auth/src/mail/templates/signup-verify.ko.ts` → `{ subject, html, text }`
  - `packages/auth/src/mail/templates/signup-verify.en.ts` → 동일 shape
  - `password-reset.ko.ts`, `password-reset.en.ts`, `welcome.ko.ts`, `welcome.en.ts` 동일 패턴

**REQ-MAIL-032 (Ubiquitous)**: Templates SHALL be pure functions `(vars: Record<string, string>) => { subject: string; html: string; text: string }`. 파일 시스템 I/O 또는 DB 조회 금지 (server start time evaluable).

**REQ-MAIL-033 (Event-Driven)**: WHEN a template is rendered, the renderer SHALL escape HTML special characters in `vars` values for the HTML output (use `&amp;` `&lt;` `&gt;` `&quot;` `&#39;`) and leave them raw for the text output. URL values (`verifyUrl`, `resetUrl`) SHALL be validated as `https://` or `http://` only — `javascript:` URLs are rejected with `MailTemplateError`.

**REQ-MAIL-034 (Ubiquitous)**: The renderer SHALL select language by reading `vars.locale` (`'ko'` or `'en'`). IF `vars.locale` is absent or unrecognized, the renderer SHALL default to `'ko'` (project default per `.moai/config/sections/language.yaml`).

**REQ-MAIL-035 (Ubiquitous)**: Required variables per template:
  - `signup-verify`: `verifyUrl`, `userName` (existing per `signup.ts:225`)
  - `password-reset`: `resetUrl`, `userName`, `expiresInHours` (e.g., `'24'`)
  - `welcome`: `userName`, `siteUrl`, `loginUrl`
  
  IF a required variable is missing, `renderTemplate` SHALL throw `MailTemplateError('missing required variable: X')` before transporter invocation.

**REQ-MAIL-036 (Ubiquitous)**: HTML templates SHALL use inline CSS (no external stylesheets) — `<style>` 블록 사용 가능하나 `<link>` 금지. 이미지 첨부 금지(본 SPEC) — 텍스트 + 링크만.

**REQ-MAIL-037 (Ubiquitous)**: Templates SHALL include the site name (from `vars.siteName` if provided, else `'Rhymix'`) in the subject and signature. 향후 multi-tenant 도메인별 brand 분기는 백로그.

### 2.5 Retry & Audit 계층 (REQ-MAIL-040 ~ 049)

**REQ-MAIL-040 (Event-Driven)**: WHEN `transporter.sendMail()` rejects with a transient error (connection timeout, 4xx SMTP response, network error), `SmtpMailDispatcher` SHALL retry up to 3 times total (initial + 2 retries) with exponential backoff: 1s, 2s, 4s. 본 SPEC 단순화 — 더 정교한 지수 백오프(jitter, max delay)는 백로그.

(검토: MASTER-PLAN-002 line 337의 "3회 재시도"는 "총 3회 시도" 또는 "초기 + 3회 재시도"로 양해 가능. 본 SPEC은 **총 3회 시도 = 초기 + 2 retry**로 확정한다. delay sequence: 0s(즉시), 1s, 2s. 만약 운영 결정으로 4회가 필요하면 재시도 카운트만 환경변수로 노출 가능.)

**REQ-MAIL-041 (Event-Driven)**: WHEN `transporter.sendMail()` rejects with a permanent error (5xx SMTP response — invalid recipient, account disabled, content rejected), `SmtpMailDispatcher` SHALL NOT retry — 즉시 실패 처리.

**REQ-MAIL-042 (Event-Driven)**: WHEN all retry attempts are exhausted AND the send still fails, `SmtpMailDispatcher` SHALL create an `AuditLog` row with:
  - `action = 'MAIL_DELIVERY_FAILED'`
  - `actorId = null` (시스템 발신)
  - `target = message.to` (수신자 이메일)
  - `diff = { template: message.template, errorCode: <SMTP code or 'NETWORK'>, attempts: <actual attempt count> }` (JSON) — `attempts`는 실제 시도된 횟수를 기록한다(상수 아님). transient 에러로 3회 모두 소진된 경우 `attempts === 3`, permanent 에러로 즉시 실패한 경우 `attempts === 1`. 재시도 상한은 `max_attempts`(기본 3) 설정값을 따른다.
  - `regdate = now()`
  
  AuditLog 작성 실패 자체는 캐치하여 로그(`console.error`)만 남기고 swallow — 메일 실패가 또 다른 캐스케이드를 일으키지 않게.

**REQ-MAIL-043 (Event-Driven)**: WHEN all retries are exhausted, `dispatch()` SHALL throw `MailDeliveryError(cause)` with the last underlying nodemailer error attached as `cause`. 호출 측(signup.ts:222)은 try/catch로 swallow 중이므로 가입 자체는 막히지 않으나, AuditLog 추적은 가능.

**REQ-MAIL-044 (Ubiquitous)**: The retry policy SHALL be implemented inside `SmtpMailDispatcher` (not via external library like `p-retry`) to minimize dependency surface. 코드 ~30 LoC for retry loop + backoff.

**REQ-MAIL-045 (Unwanted)**: The Mail system SHALL NOT persist failed messages to a DB queue for later replay in this SPEC. 큐 기반 재시도는 SPEC-INFRA-001.

### 2.6 Admin UI 계층 (REQ-MAIL-050 ~ 059)

**REQ-MAIL-050 (Ubiquitous)**: `apps/web/app/admin/site/mail/page.tsx` SHALL render an admin-only page showing current SMTP configuration status:
  - `SMTP_HOST` (masked if set, e.g., `smtp.****.com`)
  - `SMTP_PORT`
  - `SMTP_FROM`
  - `SMTP_SECURE` (true/false)
  - Active dispatcher type (`SmtpMailDispatcher` or `NoopMailDispatcher`)
  - `SMTP_USER` / `SMTP_PASS` 값은 화면에 표시 금지 — set/unset 여부만 boolean으로.

**REQ-MAIL-051 (Event-Driven)**: WHEN the admin clicks "연결 테스트" 버튼, the page SHALL call a Server Action `testMailConnectionAction()` that invokes `dispatcher.verify()` (REQ-MAIL-026) and returns `{ ok: true }` or `{ ok: false, error: string }`. 결과는 toast로 표시.

**REQ-MAIL-052 (Event-Driven)**: WHEN the admin clicks "테스트 메일 발송" 버튼 with a target email input, the page SHALL call `sendTestMailAction({ to })` which dispatches a `signup-verify` template with dummy vars (`verifyUrl='https://example.com/test', userName='Test'`). 실제 메일이 도착해야 운영 점검 가능.

**REQ-MAIL-053 (State-Driven)**: WHILE the active dispatcher is `NoopMailDispatcher` (SMTP_HOST 미설정), the admin page SHALL show a yellow warning banner: `'⚠ 메일 발송이 비활성화되어 있습니다. .env 에 SMTP_HOST 를 설정하세요.'`. 

**REQ-MAIL-054 (Ubiquitous)**: AdminMailSettings page SHALL require `actor.isAdmin === true` — non-admin user는 `/login` redirect 또는 403. 권한 체크는 `apps/web` middleware 또는 page 내부에서 `auth()` 호출 검증.

**REQ-MAIL-055 (Unwanted)**: The admin page SHALL NOT allow editing SMTP settings via UI in this SPEC — read-only display + test buttons만. 환경변수는 .env(또는 secret) 변경 후 process 재시작이 정상 경로. DB 기반 설정 저장은 백로그.

### 2.7 Quality 계층 (REQ-MAIL-060 ~ 069)

**REQ-MAIL-060 (Ubiquitous)**: New tests SHALL include at minimum (target ~12 tests):
  - `factory.test.ts`: SMTP mode selection, Noop fallback + warn, MailConfigError throws (REQ-MAIL-010, 011, 013, 014, 015) — 4 tests
  - `smtp-dispatcher.test.ts`: dispatch success path with mocked nodemailer, validation error on bad email, retry policy with transient → success, retry exhaustion → MailDeliveryError + AuditLog row, permanent error no-retry, verify() pass/fail (REQ-MAIL-020, 022, 025, 040, 041, 042, 026) — 5 tests
  - `templates.test.ts`: render signup-verify(ko/en), render welcome(ko), missing var throws MailTemplateError, javascript: URL rejected, HTML escape applied (REQ-MAIL-031, 033, 034, 035) — 3 tests
  - Total: ~12 tests (MP-002 target 12, ±0)

**REQ-MAIL-061 (Ubiquitous)**: Coverage for `packages/auth/src/mail/**` SHALL be at least 85% (statements + branches) per TRUST 5 Tested pillar.

**REQ-MAIL-062 (Ubiquitous)**: nodemailer SHALL be mocked in unit tests using `vi.mock('nodemailer')` — actual SMTP connections are forbidden in CI. 실제 메일 발송은 별도 e2e 환경(mailtrap.io 등, 운영자 결정 — Open Question Q4).

**REQ-MAIL-063 (Ubiquitous)**: `pnpm tsc --noEmit` SHALL report 0 errors across `packages/auth`, `apps/web` after Slice A.

**REQ-MAIL-064 (Ubiquitous)**: All new code SHALL respect `.moai/config/sections/language.yaml`: code comments in Korean (`code_comments: ko`), identifiers/strings/error codes in English. @MX tags SHALL use Korean descriptions per `mx-tag-protocol.md`.

**REQ-MAIL-065 (Unwanted)**: The Mail system SHALL NOT introduce new global mutable state beyond the module-scope singleton dispatcher (`apps/web/lib/mail/dispatcher.ts`). nodemailer transporter는 dispatcher 인스턴스 내부에 캡슐화.

### 2.8 Integration 계층 (REQ-MAIL-070 ~ 079)

**REQ-MAIL-070 (Ubiquitous)**: `apps/web/lib/auth/actions.ts`의 두 callsite (`signupAction` line 80, `requestPasswordResetAction` line 251)는 `new NoopMailDispatcher()`를 `mailDispatcher`(import from `@/lib/mail/dispatcher`)로 교체한다.

**REQ-MAIL-071 (Ubiquitous)**: `apps/web/lib/mail/dispatcher.ts` 신규 — 모듈 스코프 싱글톤:
  ```typescript
  import { createMailDispatcher } from '@rhymix-ts/auth';
  export const mailDispatcher = createMailDispatcher(process.env);
  ```
  (구체적 코드는 plan.md 참조)

**REQ-MAIL-072 (Event-Driven)**: WHEN `verifyEmail` 성공 트랜잭션이 commit되면(현재 `packages/auth/src/verify-email.ts`), 호출 측(`verifyEmailAction`)은 `mailDispatcher.dispatch({ template: 'welcome', to: user.email, ... })`을 fire-and-forget으로 호출한다. 본 SPEC은 wiring만 추가 — `verify-email.ts` 자체는 mail 의존성 보존(`MailDispatcher` 옵셔널 ctx로 추가) 또는 호출 측에서 별도 dispatch(권고 — verify-email 도메인 함수는 메일 의존 최소화).

**REQ-MAIL-073 (Ubiquitous)**: `.env.example` 갱신 — SMTP 변수 6개 + 주석 추가:
  ```
  # Mail (SPEC-MAIL-001) — Set SMTP_HOST to enable real email delivery.
  # Without SMTP_HOST, NoopMailDispatcher is used and emails are NOT sent.
  SMTP_HOST=
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM="Rhymix <noreply@example.com>"
  SMTP_SECURE=false
  ```

**REQ-MAIL-074 (Ubiquitous)**: `packages/auth/package.json`의 `dependencies`에 `"nodemailer": "^6.9.0"` (또는 SPEC 구현 시점 최신 stable) 추가. `devDependencies`에 `"@types/nodemailer": "^6.4.0"` 추가.

**REQ-MAIL-075 (Unwanted)**: The Mail system SHALL NOT depend on `apps/web` — `packages/auth/src/mail/`는 framework-agnostic. AuditLog 기록도 Prisma client를 ctx로 받아 처리하며 Next.js APIs 사용 금지.

---

## 3. Slices (high-level)

본 SPEC은 1개 슬라이스로 통합 구현된다 (MP-002 line 339 — Slice count: 1). 상세 작업 항목은 `plan.md` 참조. 단일 슬라이스 안에서 6개 논리 단위로 진행.

### Slice A: SMTP MailDispatcher + Factory + Templates + Retry + Admin UI

**목표**: `NoopMailDispatcher`를 production-ready `SmtpMailDispatcher`로 교체. 인터페이스 보존, env-driven 선택, i18n 템플릿, 재시도/감사, admin 점검 페이지 통합.

**산출물**:
- `packages/auth/src/mail/smtp-dispatcher.ts`: SmtpMailDispatcher 구현 (~150 LoC)
- `packages/auth/src/mail/factory.ts`: createMailDispatcher(env) factory (~60 LoC)
- `packages/auth/src/mail/errors.ts`: MailConfigError, MailValidationError, MailTemplateError, MailDeliveryError (~30 LoC)
- `packages/auth/src/mail/templates/`: 7개 template module (signup-verify.{ko,en}, password-reset.{ko,en}, welcome.{ko,en}, render.ts dispatch table) (~250 LoC 총합)
- `packages/auth/src/mail/audit.ts`: writeMailFailureAudit(ctx, message, error) (~40 LoC)
- `apps/web/lib/mail/dispatcher.ts`: 싱글톤 (~10 LoC)
- `apps/web/lib/auth/actions.ts`: 2 callsite 교체
- `apps/web/app/admin/site/mail/page.tsx`: AdminMailSettings RSC (~120 LoC)
- `apps/web/app/admin/site/mail/actions.ts`: testMailConnectionAction, sendTestMailAction (~50 LoC)
- `apps/web/.env.example`: SMTP 변수 6개 추가
- `packages/auth/package.json`: nodemailer + @types/nodemailer 의존성
- 신규 테스트 12개 (`factory.test.ts`, `smtp-dispatcher.test.ts`, `templates.test.ts`)

**EARS coverage**: REQ-MAIL-001~075 전체

---

## 4. Acceptance Criteria (EARS Format)

본 SPEC의 핵심 acceptance는 MASTER-PLAN-002 Section 5.9의 3개 headline을 충족한다. 본 절의 acceptance criteria는 EARS 형식으로 기술하며, 각 AC에 대응하는 실행 가능한 Given-When-Then 시나리오는 `acceptance.md`에 상세 기술한다.

**AC-MAIL-A1 (Dispatcher Selection — SMTP_HOST set, REQ-MAIL-010, MP-002 line 335)**:
WHEN `createMailDispatcher(env)` is called with `SMTP_HOST='smtp.example.com'`, `SMTP_PORT='587'`, AND `SMTP_FROM='Rhymix <no@example.com>'` set in env, the Mail system SHALL return a `SmtpMailDispatcher` instance (`dispatcher instanceof SmtpMailDispatcher === true`).

**AC-MAIL-A2 (Dispatcher Selection — SMTP_HOST absent, REQ-MAIL-011, MP-002 line 336)**:
WHERE `SMTP_HOST` is absent from env, WHEN `createMailDispatcher(env)` is called, the Mail system SHALL return a `NoopMailDispatcher` instance AND SHALL emit exactly one `console.warn` whose message begins with `'[mail] SMTP_HOST not configured'`.

**AC-MAIL-A3 (Retry & Audit on Failure, REQ-MAIL-040~042, MP-002 line 337)**:
WHEN `dispatch({ to:'a@b.com', subject:'X', template:'signup-verify', vars:{verifyUrl:'https://...',userName:'A'} })` is called on a `SmtpMailDispatcher` whose transporter rejects every send with a transient `ECONNRESET` error, the Mail system SHALL invoke `transporter.sendMail` exactly 3 times with backoff intervals of ≈1s and ≈2s, SHALL create one `AuditLog` row (`action='MAIL_DELIVERY_FAILED', target='a@b.com', diff.template='signup-verify', diff.attempts=3`), AND `dispatch()` SHALL throw `MailDeliveryError`.

**AC-MAIL-A4 (Template Rendering i18n + Escape, REQ-MAIL-031~033)**:
WHEN `renderTemplate('signup-verify', { verifyUrl:'https://x.com/v/abc', userName:'<script>X</script>', locale:'en' })` is called, the renderer SHALL return a result whose `subject` is an English string, whose `html` contains `<a href="https://x.com/v/abc">` AND escapes `userName` to `&lt;script&gt;X&lt;/script&gt;`, AND whose `text` is plain text without HTML escaping. WHEN `locale` is changed to `'ko'`, the renderer SHALL return a `subject` in Korean.

**AC-MAIL-A5 (Admin Test Connection, REQ-MAIL-051, REQ-MAIL-026)**:
WHEN an admin clicks "연결 테스트" on the `/admin/site/mail` page, the system SHALL invoke the Server Action `testMailConnectionAction()`, which SHALL call `mailDispatcher.verify()` AND SHALL return `{ ok: true }` or `{ ok: false, error: string }`; the UI SHALL display the result as a toast.

상세 Given-When-Then scenarios + edge cases는 `acceptance.md` 참조 (acceptance.md는 실행 가능한 테스트 시나리오 문서로서 Given-When-Then 형식을 사용한다).

---

## 5. Technical Approach

### 5.1 패키지 위치 결정

신규 코드는 **`packages/auth/src/mail/` 하위 디렉토리**에 모은다. 이유:
- 기존 `mail.ts`(인터페이스 + Noop + InMemory) 와 한 패키지에 응집하여 caller 변경 최소화 (`@rhymix-ts/auth` barrel export만 갱신)
- 별도 `packages/mail/` 패키지 신설은 과잉 — 현재 mail 의존이 signup/password-reset/verify-email(모두 auth 패키지)에 국한
- 향후 다른 도메인에서 mail이 필요해지면(예: comment 알림, board moderation) `packages/mail/` 분리 검토. 본 SPEC은 분리하지 않음.

대안 검토:
- (b) `packages/mail/` 신규 — 의존 방향 깔끔하나 현 시점 over-engineering
- (c) `apps/web/lib/mail/` 만 — 도메인 패키지(`packages/auth`)에서 mail이 필요하면 역의존 발생 → reject

선택: **(a) `packages/auth/src/mail/` 내부 모듈화**. mail.ts 한 파일은 인터페이스 + Noop + InMemory만 유지하고, smtp/factory/templates/audit은 하위 디렉토리로 분리.

### 5.2 nodemailer 의존 분리

- `nodemailer`는 production dependency (auth package). 환경에 따라 미로딩 — Noop 모드에서는 lazy import 검토 가능하나, 본 SPEC은 단순화 위해 top-level import. 번들 크기 영향: `apps/web`은 Next.js이므로 server bundle에만 포함되며 client에 영향 없음.
- `@types/nodemailer`는 devDependency.
- nodemailer는 자체 의존이 작고(commonjs), Next.js 16 + ESM 환경에서 호환성 검증은 Slice A 첫 작업.

### 5.3 i18n locale 결정

- `MailMessage.vars`에 `locale` 필드를 옵셔널로 추가 — 호출 측이 user의 선호 언어를 전달.
- 현재 `signup.ts:225`는 `vars: { verifyUrl, userName }`만 전달 → 본 SPEC에서 signup.ts 수정 필요: User의 langCode 또는 form input(`locale`)을 vars.locale에 추가. (signup.ts는 SPEC-AUTH-001 영역 — 본 SPEC은 최소 침습으로 `signupAction`(actions.ts)에서 `mailDispatcher.dispatch({..., vars: { ...vars, locale: 'ko' }})`로 default 추가, 향후 user.langCode 동적 결정은 backlog.)
- next-intl 통합 검증: 본 SPEC 시작 시점에 `apps/web/messages/` 또는 `apps/web/i18n/` 디렉토리는 존재하지 않을 가능성 — install wizard에서만 사용되는 부분 통합 상태. **mail 템플릿은 next-intl을 사용하지 않고 자체 dispatch table** (string 분기) 사용. 이유: next-intl은 React 전용이며 server-side template rendering에 부적합. 향후 next-intl가 정착되면 message catalog로 통합 검토.

### 5.4 재시도/백오프 알고리즘

```typescript
async function dispatchWithRetry(args) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await transporter.sendMail(args);
    } catch (err) {
      lastError = err as Error;
      if (isPermanentError(err)) throw new MailDeliveryError(err); // no retry
      if (attempt < 3) {
        await sleep(1000 * Math.pow(2, attempt - 1)); // 1s, 2s
      }
    }
  }
  await writeMailFailureAudit(...);
  throw new MailDeliveryError(lastError!);
}
```

permanent error 판정: nodemailer error의 `responseCode`가 [500, 600) 범위이거나 `code === 'EAUTH'` 또는 `code === 'EENVELOPE'` 인 경우.

### 5.5 AuditLog 기록 시 Prisma client 의존

- `SmtpMailDispatcher` 생성자가 `PrismaClient` 인스턴스를 받는다(생성자 옵션). 또는 `dispatch` ctx 파라미터.
- 본 SPEC 결정: **생성자 옵션** — `factory`에서 한 번 주입. dispatcher의 모든 메서드는 prisma에 자동 접근.
- 단점: dispatcher가 prisma에 강결합. 그러나 `NoopMailDispatcher`/`InMemoryMailDispatcher`는 prisma 없이 동작 — 인터페이스는 그대로 유지 (`MailDispatcher`는 dispatch만 노출).
- audit 작성 실패는 swallow (`try/catch` → `console.error`).

### 5.6 환경변수 검증

`factory.ts`에 Zod schema로 env 검증:
```typescript
const smtpEnvSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().min(3), // RFC 5322 mailbox — Zod simple check, deep validation 백로그
  SMTP_SECURE: z.string().optional().transform(v => v === 'true'),
}).refine(env => !env.SMTP_USER || !!env.SMTP_PASS, { message: 'SMTP_PASS required if SMTP_USER set' });
```

검증 실패 시 `MailConfigError` throw.

### 5.7 ID/타입 일관성

- `AuditLog.id: BigInt @autoincrement` (schema.prisma line 484~) — Prisma typed로 자동 처리
- `User.id: Int @autoincrement` — mail dispatcher는 user id에 직접 의존하지 않음(수신자 이메일만)
- nodemailer return type: `SentMessageInfo` (messageId, response 등) — 본 SPEC은 사용하지 않으나 디버그 로그에 messageId만 허용

### 5.8 next.config — externals

nodemailer는 Node.js 의존이 있으므로 Next.js의 Server Components 번들에 안전하게 포함된다. 단, edge runtime(`runtime: 'edge'`) 라우트에서는 사용 불가 — 본 SPEC의 actions/page는 모두 default Node.js runtime이므로 문제 없음. middleware에서 mail 사용 금지(edge runtime).

### 5.9 admin/site/mail 라우트 위치

- `apps/web/app/admin/site/mail/page.tsx` — `/admin/site/mail` URL
- 기존 admin shell(`apps/web/app/admin/layout.tsx`) 안에서 navigation menu 추가 — `admin/site/design`(미존재, SPEC-LAYOUT-001 영역) 옆 mail 항목. Slice A에서는 직접 URL 접근만 보장 — sidebar 메뉴 통합은 SPEC-ADMIN-EXTRAS-001(Phase 5).

### 5.10 verify-email 후 welcome 메일 트리거

- `verify-email.ts`는 이메일 인증 도메인 함수 — mail 의존을 추가하지 않는다(REQ-MAIL-072 권고안 채택).
- `apps/web/lib/auth/actions.ts`의 `verifyEmailAction`(존재 시 확인 필요)이 verify-email 성공 후 별도로 `mailDispatcher.dispatch({ template: 'welcome', ... })` fire-and-forget 호출.
- IF verifyEmailAction이 본 SPEC 시점에 존재하지 않으면(현재 actions.ts에 verifyEmailAction 유무 확인 — research.md), Slice A에서 추가하지 않고 백로그(SPEC-AUTH-POLISH-001). welcome 템플릿 자체는 ship하여 후속 wiring 준비.

---

## 6. Risks & Mitigations

상세는 `research.md` 참조. 핵심 7가지:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| nodemailer가 Next.js 16 Turbopack과 호환 안 됨 | 낮음 | 높음 | Slice A 첫 작업으로 minimal sendMail 호출 e2e 확인. 호환 안 되면 `next.config.ts`의 `serverExternalPackages: ['nodemailer']` 추가. |
| SMTP 자격증명이 `.env` 파일로 누출 | 중간 | 높음 | `.env`는 `.gitignore`에 이미 포함. `.env.example`은 빈 값만. 운영 secret은 deployment-time injection. |
| 재시도 동안 액션 응답 지연 (1+2 = 3s 추가) | 중간 | 중간 | `signupAction`은 이미 mail dispatch를 try/catch로 감싸고 fire-and-forget 처리(`signup.ts:222`). 사용자에게는 dispatch 결과 노출 안 됨. |
| 잘못된 `SMTP_FROM` 포맷으로 SMTP 서버 reject | 중간 | 중간 | factory의 Zod 검증 + dispatcher의 connection 시 verify() 권고. admin UI의 "연결 테스트" 버튼이 운영자 진단 경로. |
| AuditLog 작성 자체 실패 (DB 다운 등) | 낮음 | 중간 | audit 작성 try/catch + console.error fallback. 메일 실패가 또 다른 cascade 일으키지 않게. |
| 한국어 템플릿의 UTF-8 인코딩 깨짐 | 낮음 | 낮음 | nodemailer는 자동으로 UTF-8 처리. Slice A 테스트에 한글 subject + body 검증 포함. |
| Bounce/complaint 처리 부재로 reputation 손상 | 중간 | 중간 | SaaS 백엔드 도입 시(별도 SPEC) 자동 처리. 단독 SMTP에서는 운영자가 모니터링 (admin UI 향후 확장). |
| Open relay 또는 잘못된 인증으로 SMTP 발송 거부 | 중간 | 중간 | `SMTP_USER`/`SMTP_PASS` 미설정 시 STARTTLS without auth로 동작 — 운영자가 SMTP 서버 정책에 맞게 설정. README 가이드 제공. |
| 메일 템플릿 한/영 번역 불일치로 사용자 혼란 | 낮음 | 낮음 | 코드 리뷰에서 한/영 페어 검증. 첫 ship은 가이드 라인 + 직역 후 운영자 피드백으로 개선. |
| `welcome` 템플릿 wiring 부재로 dead code | 낮음 | 낮음 | Slice A는 템플릿 정의 + render 함수만 ship. wiring은 백로그 — 단, factory/dispatcher 테스트는 welcome도 포함. |

---

## 7. Open Questions

본 SPEC 작성 시점에 미해결인 4가지. 해결 없이 Slice A 시작 가능 — 사용자가 `/moai run` 호출 전 결정 권장.

1. **Q1 — 템플릿 엔진 선택 (mustache vs raw template literal vs handlebars)**:
   - 옵션 (a) Raw TypeScript template literal (`\`<h1>${escape(name)}</h1>\``) — no extra dep, 단순
   - 옵션 (b) Mustache (`mustache`, 5KB) — `{{verifyUrl}}` 식, 비프로그래머도 편집 가능
   - 옵션 (c) Handlebars — 강력하나 ~50KB, helper 시스템 (오버 스펙)
   - **권고: 옵션 (a) raw template literal**. 템플릿 3개 + escape 헬퍼 ~30 LoC면 충분. 향후 DB 기반 사용자 정의 템플릿이 필요해지면 (b)로 전환.

2. **Q2 — Resend/SendGrid SaaS 백엔드를 본 SPEC에 포함 vs 후속 SPEC**:
   - MASTER-PLAN-002 Section 6.1 결정: "SMTP 우선. SaaS 백엔드는 동일 인터페이스(MailDispatcher)로 후속 SPEC에서 추가"
   - **권고: 후속 SPEC**. 본 SPEC은 SMTP만. `MailDispatcher` 인터페이스는 그대로 유지되므로 SaaS 추가 비용은 단일 클래스 분량(`ResendMailDispatcher`).

3. **Q3 — 재시도 큐 영속화 (in-memory vs DB queue)**:
   - 옵션 (a) In-memory (현재 SPEC) — process 재시작 시 진행 중 재시도 손실
   - 옵션 (b) DB queue (Prisma `MailQueue` 모델 신설) — 영속, 재시작 안전. 그러나 dead letter, worker, scheduler 필요 — SPEC-INFRA-001 영역
   - **권고: 옵션 (a) in-memory**. 본 SPEC은 inline 3회 retry만. DB queue는 SPEC-INFRA-001에서 도입 시 `QueueBackedMailDispatcher`로 교체.

4. **Q4 — 테스트 모드 SMTP 서버 (mailtrap.io vs ethereal.email vs MailHog Docker)**:
   - 옵션 (a) mailtrap.io — SaaS, free tier, dev 친화. 외부 의존
   - 옵션 (b) ethereal.email — nodemailer 공식 무료 mock SMTP, 자동 생성
   - 옵션 (c) MailHog (Docker compose) — 로컬 컨테이너, 격리됨
   - **권고: 옵션 (b) ethereal.email**. nodemailer 공식, 외부 의존 최소(자격증명 자동 생성), 발송된 메일을 웹 UI로 미리보기 가능. README에 사용법 추가. CI는 vi.mock으로 nodemailer 자체를 mock — ethereal 호출 없음.

위 4개 모두 SPEC 합의가 강제되진 않으며, 구현 detail은 expert-backend가 Slice A 진행 중 결정.

---

## Exclusions (What NOT to Build)

본 SPEC은 다음을 명시적으로 빌드하지 않는다:

1. **Resend/SendGrid/AWS SES SaaS 백엔드** — MP-002 Section 6.1에 따라 후속 SPEC(SPEC-MAIL-SAAS-001).
2. **메시지 큐 기반 비동기 발송 (BullMQ, Inngest)** — SPEC-INFRA-001 영역.
3. **DB 기반 mail queue + worker** — Q3 권고에 따라 in-memory 3회 retry만.
4. **이메일 발송 통계 대시보드 (성공률, latency, bounce 비율)** — 운영 도구, 백로그.
5. **사용자별 메일 수신 환경설정 UI (notification preferences)** — SPEC-MEMBER-POLISH-001.
6. **마케팅 / 뉴스레터 발송 시스템** — 본 SPEC은 transactional 메일만.
7. **이메일 인증 토큰 재발송 rate limit** — SPEC-AUTH-001의 토큰 정책 영역.
8. **DKIM / SPF / DMARC 자동 설정 가이드** — SMTP 서버 측 책임.
9. **이메일 templates WYSIWYG 편집 UI** — DB 기반 템플릿 + 코드 외부화는 백로그.
10. **첨부파일 지원** — verify/reset/welcome은 첨부 없음. 첨부는 별도 SPEC.
11. **13개 언어 풀 i18n** — ko/en 2개만. 추가 언어는 별도 SPEC.
12. **PHP `modules/advanced_mailer`의 풀 기능 포팅 (multi-driver, SMTP pool, queue, attachments, multi-from)** — nodemailer 단일 transporter만. 멀티 driver는 후속 SaaS SPEC에서 일부 흡수.
13. **이메일 bounce/complaint 핸들링 (webhook 수신)** — SaaS 백엔드 도입 시.
14. **HTML 이메일 미디어 쿼리 / 다크모드 대응** — 기본 inline CSS만.
15. **이미지 임베드 (cid:, base64 inline)** — 텍스트 + 링크만.
16. **`SMTP_FROM`의 RFC 5322 deep validation (group syntax, encoded-word)** — Zod의 단순 string min(3)만. 별도 SPEC.
17. **multi-tenant 도메인별 from/subject brand 분기** — 향후 multi-domain 운영 시 (SPEC-ADMIN-EXTRAS-001 또는 SPEC-MAIL-MULTITENANT-001).
18. **SMTP 설정 admin UI에서 편집 (DB 저장)** — 본 SPEC은 read-only display + test. 편집은 백로그.
19. **welcome 메일 자동 발송 wiring (verifyEmailAction → mailDispatcher)** — welcome 템플릿은 ship하나, 실제 호출 wiring은 SPEC-AUTH-POLISH-001 또는 본 SPEC 후반 작업으로 검토 (Q3 후속).
20. **테스트 메일 발송의 rate limit / abuse 방지** — admin-only 페이지라 abuse 위험 낮음. 본 SPEC 범위 외.

위 항목들이 필요해질 경우, 명시적으로 후속 SPEC에서 다루어야 하며 본 SPEC 범위를 확장하지 않는다.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
Estimated Test Count: ~12 (MP-002 target 12, ±0)
Estimated Slice Count: 1 (Slice A: SMTP dispatcher + factory + templates + retry + admin UI)
Dependencies (upstream): SPEC-AUTH-001 (MailDispatcher 인터페이스 + signup/password-reset wiring), SPEC-ADMIN-001 (admin shell + AuditLog 모델)
Blocks (downstream): SPEC-AUTH-POLISH-001 (welcome 메일 자동 발송 wiring), SPEC-MAIL-SAAS-001 (Resend/SendGrid 백엔드), SPEC-INFRA-001 (DB queue + worker)
