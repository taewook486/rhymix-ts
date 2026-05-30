---
id: SPEC-MAIL-001-acceptance
title: SMTP 메일 디스패처 인수 기준 (5 Gates + Edge Cases)
spec: SPEC-MAIL-001
created: 2026-05-27
status: draft
language: ko
---

# Acceptance Criteria — SPEC-MAIL-001

본 문서는 spec.md Section 4에 정의된 5개 acceptance gate를 Given-When-Then 형식의 실행 가능한 시나리오로 풀어쓰고, edge cases와 Definition of Done을 명시한다.

---

## 1. AC-MAIL-A1 — SMTP Dispatcher Selection (SMTP_HOST set)

**EARS coverage**: REQ-MAIL-010, REQ-MAIL-012, REQ-MAIL-017
**MP-002 headline**: "WHEN SMTP_HOST 환경변수가 설정되면, THE SYSTEM SHALL SmtpMailDispatcher를 사용한다."

### Scenario A1.1: 기본 SMTP 모드 선택

**GIVEN**:
- process env에 다음 변수가 설정됨:
  - `SMTP_HOST = 'smtp.example.com'`
  - `SMTP_PORT = '587'`
  - `SMTP_FROM = 'Rhymix <noreply@example.com>'`
  - `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`는 unset

**WHEN**:
- `createMailDispatcher({ env, prisma: mockPrisma })`를 호출

**THEN**:
- 반환값은 `SmtpMailDispatcher` 인스턴스
- `dispatcher instanceof SmtpMailDispatcher === true`
- `console.warn`이 호출되지 않음 (SMTP 모드)
- 반환값의 `verify()` 메서드가 존재함

### Scenario A1.2: SMTP_PORT 기본값 587

**GIVEN**:
- `SMTP_HOST = 'smtp.example.com'`, `SMTP_FROM = 'noreply@example.com'`
- `SMTP_PORT`는 unset

**WHEN**:
- `createMailDispatcher({ env })`를 호출 후 dispatcher의 내부 transporter 옵션을 검사 (테스트는 nodemailer mock으로 옵션 캡처)

**THEN**:
- transporter가 `port: 587`로 생성됨

### Scenario A1.3: SMTP_SECURE='true' 시 secure 옵션 활성

**GIVEN**:
- `SMTP_HOST = 'smtp.example.com'`, `SMTP_PORT = '465'`, `SMTP_SECURE = 'true'`, `SMTP_FROM = 'a@b.com'`

**WHEN**:
- `createMailDispatcher({ env })`

**THEN**:
- transporter가 `secure: true, port: 465`로 생성됨

---

## 2. AC-MAIL-A2 — Noop Fallback + Console Warn (SMTP_HOST absent)

**EARS coverage**: REQ-MAIL-011
**MP-002 headline**: "WHERE SMTP_HOST가 없으면, THE SYSTEM SHALL NoopMailDispatcher로 fallback하고 console.warn으로 알린다."

### Scenario A2.1: SMTP_HOST unset → Noop + warn

**GIVEN**:
- process env에 `SMTP_HOST` 부재 또는 빈 문자열
- 테스트 전 `__resetMailWarning()` 호출 (warned 플래그 리셋)
- `console.warn`이 spy로 stub됨

**WHEN**:
- `createMailDispatcher({ env: {} })`를 호출

**THEN**:
- 반환값은 `NoopMailDispatcher` 인스턴스
- `console.warn`이 정확히 1회 호출됨
- warn 메시지가 다음 prefix로 시작: `'[mail] SMTP_HOST not configured'`
- warn 메시지에 `'Emails will NOT be delivered'` 문자열 포함

### Scenario A2.2: 반복 호출 시 warn은 1회만

**GIVEN**:
- env에 SMTP_HOST 부재
- console.warn spy 활성화
- `__resetMailWarning()` 호출 (테스트 시작 시)

**WHEN**:
- `createMailDispatcher({ env: {} })`를 연속 3회 호출

**THEN**:
- 매번 `NoopMailDispatcher` 반환
- `console.warn`은 process 수명 동안 정확히 1회만 호출됨 (REQ-MAIL-011)

### Scenario A2.3: SMTP_HOST가 공백만으로 채워진 경우

**GIVEN**:
- `SMTP_HOST = '   '` (공백)

**WHEN**:
- `createMailDispatcher({ env })`

**THEN**:
- `.trim()` 결과가 빈 문자열 → NoopMailDispatcher 반환 (REQ-MAIL-010의 "non-empty" 해석)

---

## 3. AC-MAIL-A3 — Retry + Audit on Failure

**EARS coverage**: REQ-MAIL-040, REQ-MAIL-041, REQ-MAIL-042, REQ-MAIL-043
**MP-002 headline**: "WHEN SMTP 발송이 실패하면, THE SYSTEM SHALL 3회 재시도 후 audit log에 실패를 기록한다."

### Scenario A3.1: Transient 에러 3회 모두 실패 → AuditLog + throw

**GIVEN**:
- `SmtpMailDispatcher`가 다음과 같이 생성됨:
  - mock nodemailer `createTransport` 반환 transporter의 `sendMail`이 매번 `Error & { code: 'ECONNRESET' }` (transient)로 reject
  - mock `PrismaClient`, `auditLog.create`는 resolve
- `vi.useFakeTimers()` 활성화 — sleep 가속

**WHEN**:
- `dispatcher.dispatch({ to: 'a@b.com', subject: 'X', template: 'signup-verify', vars: { verifyUrl: 'https://x.com/v', userName: 'A' } })`
- 백오프 sleep을 fake timer로 진행 (각 `vi.advanceTimersByTimeAsync(1000)`, `vi.advanceTimersByTimeAsync(2000)`)

**THEN**:
- `transporter.sendMail`이 정확히 3회 호출됨
- 호출 간 sleep이 약 1000ms (attempt 1→2 사이), 약 2000ms (attempt 2→3 사이) — fake timer로 측정 가능
- `prisma.auditLog.create`가 정확히 1회 호출됨 with:
  - `data.action === 'MAIL_DELIVERY_FAILED'`
  - `data.actorId === null`
  - `data.target === 'a@b.com'`
  - `data.diff.template === 'signup-verify'`
  - `data.diff.errorCode === 'ECONNRESET'`
  - `data.diff.attempts === 3`
- `dispatch()` Promise가 `MailDeliveryError`로 reject됨
- thrown error의 `cause` 속성이 마지막 underlying error를 포함

### Scenario A3.2: Permanent error (5xx) — 즉시 실패, retry 없음

**GIVEN**:
- transporter.sendMail이 `Error & { responseCode: 550, code: 'EENVELOPE' }`로 reject

**WHEN**:
- `dispatcher.dispatch(...)` 호출

**THEN**:
- `transporter.sendMail`이 정확히 **1회**만 호출됨 (재시도 없음)
- `prisma.auditLog.create`가 호출됨 (with `diff.errorCode === '550'`, `diff.attempts === 1` — 또는 3으로 spec에서 결정 — REQ-MAIL-042의 attempts 의미 명확화: 시도된 횟수가 정확. 본 acceptance는 attempts=1로 검증)
- `dispatch()`는 `MailDeliveryError` throw

(주의: REQ-MAIL-042의 `attempts: 3` 하드코딩은 "정책 명시" 의미. 실제 시도 횟수가 정확하다면 `attempts: actualAttempts`로 수정 권고 — Slice A 구현 시 expert-backend가 결정. 본 acceptance test는 두 해석 모두 수용 — 단, attempts 필드가 존재함을 검증.)

### Scenario A3.3: 1회 실패 후 2회 성공 → retry 동작 + no audit log

**GIVEN**:
- transporter.sendMail이 첫 호출은 `ECONNRESET` reject, 두 번째 호출은 resolve

**WHEN**:
- `dispatcher.dispatch(...)` 호출

**THEN**:
- `transporter.sendMail`이 정확히 2회 호출됨
- 호출 간 sleep ≈1000ms
- `prisma.auditLog.create`가 **호출되지 않음** (최종 성공)
- `dispatch()`가 정상 resolve

### Scenario A3.4: AuditLog 작성 실패 swallow

**GIVEN**:
- transporter.sendMail이 매번 `ECONNRESET` reject
- `prisma.auditLog.create`가 `Error('DB connection lost')`로 reject

**WHEN**:
- `dispatcher.dispatch(...)` 호출

**THEN**:
- `dispatch()`는 여전히 `MailDeliveryError` throw (audit 실패는 swallow됨)
- `console.error` 또는 동등 로그에 `[mail] failed to write AuditLog` 메시지 출력 (REQ-MAIL-042 swallow 정책)
- 테스트는 outer thrown error만 검증; audit cascade 없음

---

## 4. AC-MAIL-A4 — Template Rendering i18n + Escape

**EARS coverage**: REQ-MAIL-031, REQ-MAIL-033, REQ-MAIL-034, REQ-MAIL-035

### Scenario A4.1: signup-verify English 정상 렌더 + XSS escape

**GIVEN**:
- `renderTemplate('signup-verify', { verifyUrl: 'https://x.com/v/abc', userName: '<script>alert(1)</script>', locale: 'en' })`

**WHEN**:
- 반환값을 검사

**THEN**:
- `result.subject`가 영문 (예: `'[Rhymix] Please verify your email'`) — ASCII만 포함
- `result.html`이 다음을 모두 포함:
  - `<a href="https://x.com/v/abc"` — verifyUrl 그대로 (URL은 escape 안 함, 단 validateUrl 통과)
  - `&lt;script&gt;alert(1)&lt;/script&gt;` — userName HTML escape 적용됨
  - `</script>` 또는 raw `<script>`는 **포함되지 않음** (escape 검증)
- `result.text`가 plain text — HTML 태그 없음, `<script>alert(1)</script>` 그대로 (text는 escape 안 함 — REQ-MAIL-033)

### Scenario A4.2: signup-verify Korean 렌더

**GIVEN**:
- `renderTemplate('signup-verify', { verifyUrl: 'https://x.com/v', userName: 'Alice', locale: 'ko' })`

**WHEN**:
- 반환값을 검사

**THEN**:
- `result.subject`가 한글 (예: `'[Rhymix] 이메일 인증을 완료해주세요'`) — 한글 문자 포함
- `result.html`에 한글 본문 포함 (예: `안녕하세요`)
- `result.text`에 한글 본문 포함

### Scenario A4.3: locale 미지정 시 ko 기본 (REQ-MAIL-034)

**GIVEN**:
- `renderTemplate('signup-verify', { verifyUrl: 'https://x.com/v', userName: 'Alice' })` — locale 누락

**WHEN**:
- 반환값 검사

**THEN**:
- result.subject가 한글 (default ko)

### Scenario A4.4: locale='ja' (미지원) 시 ko fallback (REQ-MAIL-034)

**GIVEN**:
- `renderTemplate('signup-verify', { verifyUrl, userName, locale: 'ja' })`

**WHEN**:
- 반환값 검사

**THEN**:
- result.subject가 한글 (default fallback)

### Scenario A4.5: 필수 vars 누락 시 MailTemplateError

**GIVEN**:
- `renderTemplate('signup-verify', { userName: 'Alice', locale: 'en' })` — verifyUrl 누락

**WHEN**:
- 호출

**THEN**:
- `MailTemplateError` throw됨
- error message에 `'verifyUrl'` 포함 (REQ-MAIL-035)

### Scenario A4.6: javascript: URL 거부 (REQ-MAIL-033)

**GIVEN**:
- `renderTemplate('signup-verify', { verifyUrl: 'javascript:alert(1)', userName: 'A', locale: 'en' })`

**WHEN**:
- 호출

**THEN**:
- `MailTemplateError` throw됨
- error message에 `'unsafe URL'` 또는 `'verifyUrl'` 포함

### Scenario A4.7: 모든 3개 템플릿 + 2개 locale = 6쌍 smoke

**GIVEN**:
- 각 (template, locale) 페어:
  - (`signup-verify`, ko), (`signup-verify`, en)
  - (`password-reset`, ko), (`password-reset`, en)
  - (`welcome`, ko), (`welcome`, en)

**WHEN**:
- 각각 적절한 vars로 `renderTemplate` 호출

**THEN**:
- 모든 호출이 정상 반환 (`{subject, html, text}` 객체)
- html이 빈 문자열 아님, text가 빈 문자열 아님, subject가 빈 문자열 아님
- html에 `<a href=` 또는 `<p>` 등 HTML 태그 포함 (raw text 아님 확인)

---

## 5. AC-MAIL-A5 — Admin Test Connection

**EARS coverage**: REQ-MAIL-026, REQ-MAIL-051, REQ-MAIL-052, REQ-MAIL-053, REQ-MAIL-054

### Scenario A5.1: SmtpMailDispatcher 모드 + 정상 SMTP — 연결 테스트 성공

**GIVEN**:
- `mailDispatcher`가 `SmtpMailDispatcher`로 초기화됨 (real or mocked nodemailer)
- mock된 `transporter.verify()`가 `true` resolve
- admin user session 활성

**WHEN**:
- `testMailConnectionAction()` Server Action 호출

**THEN**:
- 반환값이 `{ ok: true }`
- 내부적으로 `dispatcher.verify()` 1회 호출됨

### Scenario A5.2: SmtpMailDispatcher + 잘못된 SMTP — 연결 테스트 실패

**GIVEN**:
- `transporter.verify()`가 `Error('Invalid login')` reject

**WHEN**:
- `testMailConnectionAction()` 호출

**THEN**:
- 반환값이 `{ ok: false, error: 'Invalid login' }` (또는 동등 메시지)

### Scenario A5.3: NoopMailDispatcher 모드 — 연결 테스트 거부

**GIVEN**:
- `mailDispatcher`가 `NoopMailDispatcher` (SMTP_HOST 미설정)

**WHEN**:
- `testMailConnectionAction()` 호출

**THEN**:
- 반환값이 `{ ok: false, error: 'NoopMailDispatcher — SMTP_HOST 미설정' }` (또는 동등)

### Scenario A5.4: 비-admin 접근 거부 (REQ-MAIL-054)

**GIVEN**:
- session이 non-admin user 또는 unauthenticated

**WHEN**:
- `testMailConnectionAction()` 호출

**THEN**:
- 반환값이 `{ ok: false, error: 'unauthorized' }`
- `dispatcher.verify()`는 호출되지 않음

### Scenario A5.5: 테스트 메일 발송 (sendTestMailAction)

**GIVEN**:
- admin user session 활성
- mailDispatcher가 SmtpMailDispatcher with mocked transporter (`sendMail` resolve)

**WHEN**:
- `sendTestMailAction({ to: 'test@example.com' })` 호출

**THEN**:
- 반환값이 `{ ok: true }`
- transporter.sendMail이 호출되었고:
  - `to === 'test@example.com'`
  - `subject`가 `'[Test]'`로 시작
  - `html`이 빈 문자열 아님 (signup-verify ko 템플릿이 렌더됨)

### Scenario A5.6: AdminMailSettings 페이지 admin 접근 (manual e2e — 선택)

**GIVEN**:
- admin user logged in

**WHEN**:
- `/admin/site/mail`로 navigation

**THEN**:
- 페이지 렌더 성공 (200)
- 화면에 다음 표시:
  - `SMTP_HOST`(masked or `(unset)`)
  - `Dispatcher: SmtpMailDispatcher` 또는 `NoopMailDispatcher`
  - SMTP 미설정 시 yellow warning banner

**AND WHEN** non-admin user가 같은 URL 방문:

**THEN**:
- `/login`으로 redirect

(주의: AC-MAIL-A5.6은 manual 또는 Playwright e2e — Slice A unit 테스트에는 포함 안 함. 향후 e2e infra 확장 시 자동화.)

---

## 6. Additional Edge Cases (보조)

### EC-1: MailConfigError 발생 시나리오 (REQ-MAIL-013, 014, 015)

**Scenario EC-1.1**: `SMTP_HOST` set + `SMTP_FROM` unset → `MailConfigError`
- `createMailDispatcher({ env: { SMTP_HOST: 'x', SMTP_PORT: '587' } })` → throw `MailConfigError` with message containing `'SMTP_FROM'`

**Scenario EC-1.2**: `SMTP_USER` set + `SMTP_PASS` unset → `MailConfigError`
- `createMailDispatcher({ env: { SMTP_HOST: 'x', SMTP_FROM: 'a@b.com', SMTP_USER: 'u' } })` → throw with `'SMTP_PASS'`

**Scenario EC-1.3**: `SMTP_PORT` 비숫자 → `MailConfigError`
- `createMailDispatcher({ env: { SMTP_HOST: 'x', SMTP_FROM: 'a@b.com', SMTP_PORT: 'abc' } })` → throw

**Scenario EC-1.4**: `SMTP_PORT` 범위 초과 (0 또는 70000) → `MailConfigError`

### EC-2: MailValidationError on bad recipient (REQ-MAIL-025)

**Scenario EC-2.1**:
- `dispatcher.dispatch({ to: 'not-an-email', ... })` → `MailValidationError` throw, transporter.sendMail 호출 **안 됨**

### EC-3: html과 text 모두 multipart로 전송 (REQ-MAIL-024)

**Scenario EC-3.1**: 성공 경로
- `dispatcher.dispatch(...)` 성공 시 mock된 sendMail 호출 인자에 `html`과 `text` 둘 다 non-empty string

### EC-4: from 헤더 일관성 (REQ-MAIL-023)

**Scenario EC-4.1**:
- factory가 `SMTP_FROM='Rhymix <noreply@example.com>'`로 dispatcher 생성
- dispatch 호출 시 transporter.sendMail 인자에 `from: 'Rhymix <noreply@example.com>'`

### EC-5: 모듈 스코프 싱글톤 동일성 (REQ-MAIL-006)

**Scenario EC-5.1**:
- `apps/web/lib/mail/dispatcher.ts`의 `mailDispatcher`를 두 곳에서 import
- 두 import의 reference가 동일 (`===`) — 모듈 평가 1회만

### EC-6: warn flag 리셋 (테스트 헬퍼)

**Scenario EC-6.1**:
- `__resetMailWarning()` 호출 후 `createMailDispatcher({})` → console.warn 1회 출력
- 재호출 → 출력 안 됨 (1회 후 다시 silenced)

---

## 7. Definition of Done

본 SPEC이 "완료(complete)"로 marking되기 위한 정량적/정성적 기준.

### 7.1 정량적 기준

- [ ] Slice A 종료 게이트 체크리스트 (plan.md A.7) 전 항목 통과
- [ ] 신규 테스트 12개 이상 추가됨 (REQ-MAIL-060):
  - factory.test.ts ≥ 4 tests
  - smtp-dispatcher.test.ts ≥ 5 tests
  - templates.test.ts ≥ 3 tests
- [ ] `packages/auth/src/mail/**` 디렉토리 coverage ≥ 85% (statements + branches) — REQ-MAIL-061
- [ ] `pnpm test packages/auth` 0 failure
- [ ] `pnpm test apps/web` 0 failure
- [ ] `pnpm tsc --noEmit` 0 error (root)
- [ ] `pnpm build` apps/web 성공
- [ ] 5개 AC 시나리오 (A1~A5) 모두 자동 테스트로 검증됨

### 7.2 정성적 기준

- [ ] `MailDispatcher` 인터페이스 변경 없음 — 호출 측 코드 변경은 actions.ts의 2 callsite만 (REQ-MAIL-001)
- [ ] `NoopMailDispatcher`와 `InMemoryMailDispatcher`가 그대로 export됨 (테스트 의존성, REQ-MAIL-003)
- [ ] `.env.example`에 SMTP 변수 6개 추가됨 + 주석 포함 (REQ-MAIL-073)
- [ ] admin 페이지에서 SMTP_USER/SMTP_PASS 값이 화면에 노출되지 않음 (REQ-MAIL-050)
- [ ] mail body, recipient PII(이름), 토큰이 로그에 출력되지 않음 (REQ-MAIL-005)
- [ ] @MX 태그가 SmtpMailDispatcher, createMailDispatcher, writeMailFailureAudit에 추가됨 (한국어 description)
- [ ] code_comments 한국어 (`packages/auth/src/mail/**/*.ts`의 JSDoc + inline 주석)
- [ ] identifier + error code는 영문 유지
- [ ] `pnpm dev` 콘솔에 `[mail] SMTP_HOST not configured` warn이 정확히 1회 출력 (dev 환경)

### 7.3 보존 기준 (regression-free)

- [ ] SPEC-AUTH-001의 기존 ~482 테스트 모두 통과 (mail 인터페이스 보존 확인)
- [ ] `signup.ts:225`의 mail dispatch 호출이 기존과 동일하게 동작 (signup 자체는 mail 실패 시에도 성공 — fire-and-forget try/catch 보존)
- [ ] `password-reset.ts`의 mail dispatch 호출이 기존과 동일

### 7.4 운영 가이드

- [ ] `README.md` 또는 `apps/web/docs/mail-setup.md`(신규) 작성:
  - SMTP 환경변수 설명
  - ethereal.email로 dev 테스트 방법 (Q4 권고안)
  - admin/site/mail 페이지 사용 가이드
  - 트러블슈팅 (Gmail SMTP의 App Password, Office365의 modern auth 등)
- [ ] `.env.example` 주석이 운영자에게 명확히 안내함

### 7.5 Quality Gate 통과

- [ ] manager-quality 에이전트의 TRUST 5 게이트 통과
- [ ] code-reviewer agent의 CRITICAL 및 HIGH 이슈 0
- [ ] security-reviewer agent의 권장사항 반영:
  - SMTP 자격증명 로깅 금지 확인
  - DOMPurify 또는 escape 사용 검증
  - error message에 internal stack/path 노출 없음

---

## 8. Acceptance Test Summary Table

| AC ID | Scenarios | REQ Coverage | Test File | Test Count |
|---|---|---|---|---|
| AC-MAIL-A1 | A1.1, A1.2, A1.3 | REQ-MAIL-010, 012, 017 | factory.test.ts | 1 |
| AC-MAIL-A2 | A2.1, A2.2, A2.3 | REQ-MAIL-011 | factory.test.ts | 1 |
| AC-MAIL-A3 | A3.1, A3.2, A3.3, A3.4 | REQ-MAIL-040, 041, 042, 043 | smtp-dispatcher.test.ts | 3 |
| AC-MAIL-A4 | A4.1~A4.7 | REQ-MAIL-031, 033, 034, 035 | templates.test.ts | 3 |
| AC-MAIL-A5 | A5.1~A5.6 | REQ-MAIL-026, 051~054 | smtp-dispatcher.test.ts + manual | 2 |
| EC-1 | EC-1.1~EC-1.4 | REQ-MAIL-013, 014, 015 | factory.test.ts | 2 |
| EC-2 | EC-2.1 | REQ-MAIL-025 | smtp-dispatcher.test.ts | (포함됨) |
| **Total** | | | | **~12** |

(MP-002 target: 12 — exact match.)

---

Version: 1.0.0
Status: draft (awaiting Slice A implementation + verification)
