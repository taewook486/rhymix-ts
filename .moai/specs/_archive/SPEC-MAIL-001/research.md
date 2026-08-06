---
spec: SPEC-MAIL-001
phase: 3
parent-research: MASTER-PLAN-002/research.md
created: 2026-05-27
language: ko
---

# Research — SPEC-MAIL-001 (SMTP Mail Dispatcher)

본 research는 MASTER-PLAN-002/research.md(legacy module 인벤토리)와 REMEDIATION-PLAN-001 Section 3.2(MailDispatcher 결정)를 단일 진실 공급원으로 인용하고, 본 SPEC 범위에 한정해 **nodemailer API 표면**, **재시도/백오프 전략**, **템플릿 엔진 선택지**, **현재 codebase의 mail 의존성 그래프**, **SaaS 확장 지점**을 보강한다. 중복 서술은 금지하며 인용으로 갈음한다.

---

## 1. 인용 (Single Source of Truth)

다음 항목은 MP-002 또는 REMEDIATION에서 이미 정리되었으므로 본 문서에서는 반복하지 않는다.

- 현재 `NoopMailDispatcher` 사용이 production blocker임: REMEDIATION-PLAN-001 line 287~302
- `MailDispatcher` 인터페이스 + `NoopMailDispatcher` + `InMemoryMailDispatcher` 정의 파일 위치: `packages/auth/src/mail.ts` (REMEDIATION line 309)
- SMTP 우선 + Resend/SendGrid 백엔드는 후속 SPEC: MP-002 Section 6.1 (line 391~392) + REMEDIATION 옵션 A (line 295~298)
- 환경변수 5+1개 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE): MP-002 Section 5.9 (line 333~336) + REMEDIATION line 300
- 재시도 3회 + audit log: MP-002 line 337 + REMEDIATION line 321
- 이메일 템플릿 3개 (verify-email, password-reset, welcome): MP-002 line 333 + REMEDIATION line 313~316

본 SPEC은 위 사실을 전제로 한다.

---

## 2. Current Codebase Inventory (mail 관련)

### 2.1 `packages/auth/src/mail.ts` 현재 상태

- 68 LoC
- 3개 export: `MailDispatcher`(interface), `MailMessage`(interface), `MailTemplate`(union type), `NoopMailDispatcher`(class), `InMemoryMailDispatcher`(class)
- `MailTemplate` union: `'signup-verify' | 'password-reset' | 'email-change' | 'security-alert'` — 본 SPEC에서 `'welcome'` 추가
- 두 클래스는 logger 미사용 (REQ-AUTH-055 평문 메일 본문/토큰 미로그 정책)
- @MX:NOTE: "실제 메일 인프라는 SPEC-INFRA-001에서 추가 — 본 인터페이스는 그때 까지의 어댑터 경계." — 본 SPEC이 그 어댑터 구현체

### 2.2 mail dispatch 호출처

`grep -rn "MailDispatcher\|new Noop" packages apps` 결과 (Slice A 대상):

| 파일 | 라인 | 호출 형태 | 본 SPEC 영향 |
|---|---|---|---|
| `apps/web/lib/auth/actions.ts` | 24 | `import { ... NoopMailDispatcher ... }` | 제거 |
| `apps/web/lib/auth/actions.ts` | 62 | 주석 (NoopMailDispatcher 설명) | 보존 또는 갱신 |
| `apps/web/lib/auth/actions.ts` | 80 | `mail: new NoopMailDispatcher()` (signupAction) | `mail: mailDispatcher`로 교체 |
| `apps/web/lib/auth/actions.ts` | 241 | 주석 | 보존 |
| `apps/web/lib/auth/actions.ts` | 251 | `{ prisma, mail: new NoopMailDispatcher() }` (requestPasswordResetAction) | 교체 |
| `packages/auth/src/signup.ts` | 29 | `import type { MailDispatcher } from './mail'` | 변경 없음 |
| `packages/auth/src/signup.ts` | 114 | `mail: MailDispatcher` (ctx field) | 변경 없음 |
| `packages/auth/src/signup.ts` | 222~228 | `await ctx.mail.dispatch({ to, subject:'Verify your email', template:'signup-verify', vars:{verifyUrl,userName} })` | 변경 없음 (signup.ts는 인터페이스 의존 — dispatcher 구현체 변경의 영향 받지 않음) |
| `packages/auth/src/password-reset.ts` | (확인 필요) | mail.dispatch 호출 | 변경 없음 |
| `packages/auth/src/autologin.ts` | (확인 필요 — index.ts에 mail export 있음) | mail import 가능성 | 변경 없음 |
| `packages/auth/src/verify-email.ts` | — | mail 의존 **없음** (현재) | welcome 메일 wiring은 본 SPEC 백로그(actions.ts에서 별도 호출 검토) |

### 2.3 AuditLog 모델 (Prisma schema)

`packages/db/prisma/schema.prisma` line 484~:
- `model AuditLog`: `id BigInt @autoincrement`, `action String`, `actorId Int?`, `target String?`, `diff Json?`, `regdate DateTime @default(now())`, 기타 인덱스
- 본 SPEC은 `action='MAIL_DELIVERY_FAILED'`, `actorId=null`, `target=<email>`, `diff={template, errorCode, attempts}`로 row 생성

### 2.4 Next.js 16 환경 검증

- `apps/web/package.json`: `"next": "16.0.0"`, `"react": "19.0.0"` — App Router + Server Components 기반
- nodemailer는 Node.js Runtime 의존 — `runtime: 'edge'` 라우트에서 사용 불가. 본 SPEC의 모든 호출 경로(Server Actions, RSC, admin page)는 default Node.js runtime이므로 OK.
- Turbopack 호환성: nodemailer는 commonjs 모듈 + 자체 의존(`nodemailer-fetch`, `nodemailer-shared` 등) 일부 dynamic require. Next.js 16의 default `serverComponentsExternalPackages` 또는 `serverExternalPackages`로 esmExternals 우회 가능.

---

## 3. nodemailer API 표면 (Slice A 사용 범위)

### 3.1 Transporter 생성

```typescript
import { createTransport } from 'nodemailer';

const transporter = createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,        // true for 465, false for other ports (STARTTLS)
  auth: {
    user: 'user@example.com',
    pass: '...',
  },
  pool: true,           // connection pool
  maxConnections: 5,
  maxMessages: 100,     // max messages per connection before reconnect
});
```

### 3.2 sendMail

```typescript
await transporter.sendMail({
  from: '"Sender Name" <sender@example.com>',
  to: 'recipient@example.com',
  subject: 'Hello',
  text: 'Plain text body',
  html: '<p>HTML body</p>',
});
// returns: SentMessageInfo { messageId, response, envelope, accepted, rejected, pending }
```

### 3.3 verify (헬스체크)

```typescript
const ok = await transporter.verify();
// resolves true on connection + auth success
// rejects with Error on failure
```

### 3.4 Error shape

nodemailer error 객체:
- `code`: `'EAUTH'`, `'EENVELOPE'`, `'ESOCKET'`, `'ECONNECTION'`, `'ETIMEDOUT'`, `'EMESSAGE'` 등
- `responseCode`: SMTP numeric (4xx transient, 5xx permanent)
- `response`: raw SMTP response string
- `command`: 실패한 SMTP 명령 (e.g., 'MAIL FROM', 'RCPT TO')

### 3.5 본 SPEC 사용하지 않는 API (Out-of-Scope)

- `attachments` — REQ-MAIL-027
- `cc`, `bcc`, `replyTo` — REQ-MAIL-027
- `streamTransport` — production은 SMTP만
- `sendmailTransport` — legacy CLI, 본 SPEC 미사용
- `messageId` 커스텀 생성 — nodemailer auto-generate
- DKIM 서명 (`dkim` 옵션) — SMTP 서버 측 책임
- 이메일 큐 / pool 통계 — 운영 도구

---

## 4. 재시도 / 백오프 전략 비교

### 4.1 옵션 비교

| 옵션 | 구현 비용 | 외부 의존 | 기능 |
|---|---|---|---|
| (a) 수동 for-loop + setTimeout | ~30 LoC | 없음 | 단순. backoff sequence 고정 |
| (b) `p-retry` 라이브러리 | ~5 LoC | +1 dep | jitter, max delay, abort signal |
| (c) `async-retry` | ~5 LoC | +1 dep | (a)와 유사 |
| (d) RxJS retryBackoff | ~10 LoC | +1 dep (over-spec) | overkill |

**선택**: 옵션 (a) — REQ-MAIL-044에 명시. 의존 표면 최소화 + 본 SPEC 단일 호출 경로(SmtpMailDispatcher.dispatch).

### 4.2 백오프 sequence

- 본 SPEC: 1s, 2s (2회 retry 사이 — 총 3회 시도)
- 대안: 1s, 2s, 4s (3회 retry — 총 4회) — 운영 결정. MP-002 line 337의 "3회 재시도"의 해석에 따라 결정. SPEC은 **총 3회 시도 = 초기 + 2 retry**로 확정 (spec.md REQ-MAIL-040 주석).
- jitter (random 0~500ms): 본 SPEC 미적용. 단일 process + 5 connection pool → thundering herd 위험 낮음. SaaS 백엔드 도입 시 jitter 추가.

### 4.3 transient vs permanent 판정

permanent (재시도 안 함):
- `code === 'EAUTH'` (인증 실패)
- `code === 'EENVELOPE'` (잘못된 from/to)
- `responseCode` ∈ [500, 600) (5xx SMTP)
- 본 SPEC의 `MailValidationError` (Zod email() 실패) — 재시도 전 throw

transient (재시도):
- `code === 'ECONNECTION' | 'ESOCKET' | 'ETIMEDOUT'`
- `responseCode` ∈ [400, 500) (4xx SMTP)
- 기타 알 수 없는 에러 — 보수적으로 retry

---

## 5. 템플릿 엔진 비교 (Open Question Q1)

| 옵션 | 크기 (gzipped) | 학습 곡선 | 보안 (XSS) | 유지보수 |
|---|---|---|---|---|
| (a) Raw template literal | 0 (built-in) | 낮음 | 명시적 escape 필요 | 코드 변경 = 템플릿 변경 |
| (b) Mustache | ~5KB | 낮음 | auto escape | 코드 분리. {{var}} 익숙 |
| (c) Handlebars | ~50KB | 중간 | auto escape | helper 시스템 + partials |
| (d) Pug / EJS / Liquid | 다양 | 중간~높음 | 다양 | 본 SPEC 과대 |
| (e) MJML | ~250KB | 중간 | n/a | 이메일 전용 HTML 빌더 — production 메일 표준이나 본 SPEC 단순 메일 3종에는 overkill |

**선택**: 옵션 (a) raw template literal — REQ-MAIL-030~037 + spec.md Open Question Q1 권고. 향후 DB 기반 사용자 정의 템플릿 필요 시 옵션 (b)로 마이그레이션.

### 5.1 escape 헬퍼

```typescript
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

순서 중요: `&`을 먼저 처리해야 `&amp;` 중복 escape 방지.

### 5.2 URL 검증

```typescript
export function validateUrl(url: string, field: string): string {
  if (!/^https?:\/\//i.test(url)) {
    throw new MailTemplateError(`unsafe URL in ${field}`);
  }
  // 추가: localhost (dev) + 신뢰 도메인 화이트리스트 — 본 SPEC은 protocol만 검증
  return url;
}
```

`javascript:` 또는 `data:` URL 거부 — phishing 회피.

---

## 6. SaaS 확장 지점 (Out-of-Scope이나 설계에 반영)

본 SPEC은 SMTP만 ship하나, `MailDispatcher` 인터페이스는 SaaS 백엔드 추가에 열려 있다. 후속 SPEC-MAIL-SAAS-001 시점에 다음 구조로 확장:

```typescript
// 향후 SPEC-MAIL-SAAS-001에서 추가될 클래스
export class ResendMailDispatcher implements MailDispatcher { ... }
export class SendGridMailDispatcher implements MailDispatcher { ... }
export class SesMailDispatcher implements MailDispatcher { ... }

// factory.ts 확장
const backend = env.MAIL_BACKEND ?? 'smtp';  // 'smtp' | 'resend' | 'sendgrid' | 'ses' | 'noop'
switch (backend) {
  case 'resend': return new ResendMailDispatcher({ apiKey: env.RESEND_API_KEY });
  case 'sendgrid': return new SendGridMailDispatcher({ apiKey: env.SENDGRID_API_KEY });
  case 'ses': return new SesMailDispatcher({ region: env.AWS_REGION });
  case 'smtp': return new SmtpMailDispatcher({ ... });
  default: return new NoopMailDispatcher();
}
```

본 SPEC의 factory는 위 확장을 받기 좋은 구조 — 분기점은 `host`(SMTP_HOST) 존재 여부 1회만. 후속에서 `MAIL_BACKEND` env 추가 시 자연스러운 확장.

### 6.1 SaaS 백엔드별 특성 (참고)

| Backend | 강점 | 약점 | 적합 사용처 |
|---|---|---|---|
| Resend | Dev-friendly, React Email integration | 비교적 신생, pricing |
| SendGrid (Twilio) | 시장 표준, 풍부한 기능 | 복잡한 pricing |
| AWS SES | 저렴, AWS 통합 | sandbox 모드 해제 절차, deliverability 책임 |
| Mailgun | 가격 합리적 | EU 사용 시 GDPR 주의 |
| Postmark | transactional 특화 | marketing 메일 불가 |

본 SPEC은 SMTP 우선이며, 운영자가 어떤 SMTP 서버를 쓰든(Postfix, AWS SES SMTP relay, Mailgun SMTP, Gmail SMTP) 동일 코드.

---

## 7. PHP `modules/advanced_mailer` 참조 (legacy)

레거시 코드 위치: `D:\project\rhymix\modules\advanced_mailer\`

### 7.1 주요 파일

- `advanced_mailer.controller.php` — 메일 발송 진입점
- `advanced_mailer.class.php` — PHPMailer wrapper + driver dispatch (Mail/PHPMailer/Resend/Sendgrid/AWS SES/Mailgun)
- `advanced_mailer.admin.controller.php` — 관리자 UI 액션
- `conf/module.xml` — 액션 매핑
- `lang/` — 13개 언어 (본 SPEC은 ko/en 2개)
- `queries/` — XE 쿼리 (본 SPEC은 Prisma)
- `schemas/` — DB 테이블 정의 (본 SPEC은 신규 테이블 없음 — AuditLog 재사용)
- `tpl/` — admin UI 템플릿

### 7.2 PHP 코드와의 차이

| 영역 | PHP advanced_mailer | TS SPEC-MAIL-001 |
|---|---|---|
| 라이브러리 | PHPMailer | nodemailer |
| Driver | Multi (PHPMailer/Resend/SendGrid/AWS SES) | SMTP만 (SaaS는 후속) |
| Queue | DB 기반 (member_message + send_method) | In-memory 3회 retry (DB queue는 후속) |
| 템플릿 | 13개 언어 .lang.php | 2개 언어 .ts (ko/en) |
| Admin UI | 풀 설정 (host/port/driver/from/queue/log) | Read-only display + verify() 버튼 |
| Audit | 자체 advanced_mailer_log 테이블 | 기존 AuditLog 재사용 |

본 SPEC은 advanced_mailer의 **인터페이스 패턴**만 참조(driver-based dispatch)하고, 구현은 nodemailer로 새로 작성. PHP 코드 직접 포팅 아님.

---

## 8. nodemailer + Next.js 16 호환성 확인 사항

### 8.1 알려진 이슈

- nodemailer는 commonjs + 일부 dynamic require (mime-types, addressparser). Next.js 16의 ESM-first 환경에서 일부 빌드 warning 가능.
- 해결책: `next.config.ts`의 `serverExternalPackages: ['nodemailer']` 추가 — webpack/Turbopack이 nodemailer를 번들에서 제외하고 런타임 Node.js require로 위임.

### 8.2 검증 절차 (Slice A.2)

1. `pnpm add nodemailer @types/nodemailer -F @rhymix-ts/auth`
2. `pnpm install` (root)
3. 스모크 test 생성 (`packages/auth/src/mail/__smoke__/nodemailer-import.test.ts`)
4. `pnpm test packages/auth` 실행 — nodemailer import 성공 확인
5. `pnpm dev` (apps/web) 실행 — 콘솔에 nodemailer 관련 warn 없음 확인
6. (옵션) `pnpm build` apps/web 실행 — 정적 빌드 시 nodemailer 제외 검증

문제 발생 시: `apps/web/next.config.ts`에 추가:
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer'],
  // ... 기존 설정
};
```

---

## 9. i18n 통합 검토 (next-intl 미사용 결정)

### 9.1 현재 상태

- `apps/web/messages/` 또는 `apps/web/i18n/` 디렉토리는 본 SPEC 시점에 존재하지 않거나 install wizard 전용 부분 통합.
- next-intl은 React Hook 기반(`useTranslations`) + Server Components의 `getTranslations` — Edge runtime 일부 호환.
- Mail 템플릿은 React JSX 미사용 — string 함수만. next-intl 호환성 낮음.

### 9.2 결정

본 SPEC은 next-intl을 **사용하지 않는다**. 이유:
1. Mail 템플릿은 server-only, React 미사용 — next-intl의 React Hook이 무효
2. next-intl의 message catalog(JSON)는 client/server 통합용 — string template은 일반 TS 함수로 충분
3. next-intl이 본 프로젝트에 정착되지 않은 상태 — 의존 추가 위험

대신: 각 template을 `.ko.ts` / `.en.ts` 페어로 작성 (REQ-MAIL-031). 향후 next-intl 정착 시 catalog 통합 검토 — 마이그레이션 비용 작음(6개 파일).

---

## 10. 미해결 의사결정 (spec.md Open Questions로 승격됨)

본 research에서 파악된 미해결 결정은 모두 spec.md Section 7로 승격되었다:

- Q1: 템플릿 엔진 선택 (Section 5 참조)
- Q2: SaaS 백엔드 포함 여부 (Section 6 참조 — 본 SPEC 후속)
- Q3: 재시도 큐 영속화 (Section 4 참조 — 본 SPEC in-memory만)
- Q4: 테스트 모드 SMTP 서버 (ethereal.email 권고)

---

## 11. References

- nodemailer 공식 문서: https://nodemailer.com/ (Verified by team; URL not fetched in this research session — 운영자 확인 필요)
- PHPMailer (레거시 참조): D:\project\rhymix\common\framework\Mail.php
- REMEDIATION-PLAN-001 Section 3.2 (line 287~326)
- MASTER-PLAN-002 Section 5.9 (line 330~339) + Section 6.1 (line 391~392)
- SPEC-AUTH-001: MailDispatcher 인터페이스 도입 + signup/password-reset 호출 측

---

Version: 1.0.0
Related: MASTER-PLAN-002/research.md, REMEDIATION-PLAN-001 Section 3.2
