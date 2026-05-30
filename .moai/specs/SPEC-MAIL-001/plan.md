---
id: SPEC-MAIL-001-plan
title: SMTP 메일 디스패처 구현 계획 (1 Slice)
spec: SPEC-MAIL-001
created: 2026-05-27
status: draft
language: ko
---

# Implementation Plan — SPEC-MAIL-001

본 plan은 `spec.md`의 단일 슬라이스(Slice A)를 file-level 작업으로 분해한다. 1개 슬라이스 안에서 6개 논리 단위(A.1~A.6)로 진행하며, 마지막 A.7은 종료 게이트.

총 우선순위: **Slice A (P1, blocker for production deployment)**.

병행 가능성: 본 SPEC은 SPEC-FILE-001 (Phase 3 동기) 및 SPEC-POINT-001 (Phase 3 동기)과 병행 가능 — 파일 충돌 없음. SPEC-AUTH-001은 완료 의존(MailDispatcher 인터페이스 + signup/password-reset callsite 존재).

---

## Slice A: SMTP MailDispatcher + Factory + Templates + Retry + Admin UI

**목표**: `NoopMailDispatcher`(production blocker)를 실제 SMTP 발송이 가능한 `SmtpMailDispatcher`로 교체. 인터페이스 보존 + env-driven 선택 + i18n 템플릿 + 재시도/감사 + admin 점검 페이지 통합. 단일 commit/PR 가능한 분량(~700 LoC + ~300 LoC test).

**우선순위**: P1 — production 배포의 hard prerequisite. SPEC-FILE-001/SPEC-POINT-001 병행.

**Acceptance Gates**: AC-MAIL-A1, AC-MAIL-A2, AC-MAIL-A3, AC-MAIL-A4, AC-MAIL-A5.

### A.1 Pre-flight (검증)

작업:
1. `packages/auth/src/mail.ts`의 현재 `MailDispatcher` 인터페이스와 `MailMessage` 타입을 재확인 (변경 금지 대상)
2. `apps/web/lib/auth/actions.ts:80` (`signupAction`)과 `actions.ts:251` (`requestPasswordResetAction`) callsite 위치 확인 — `new NoopMailDispatcher()` 정확히 2곳
3. `packages/auth/src/signup.ts:225`의 mail dispatch call site 확인 — `vars: { verifyUrl, userName }` shape 인지 검증
4. `packages/auth/src/password-reset.ts`의 mail dispatch call site 확인 — vars shape 검증
5. `packages/db/prisma/schema.prisma`의 `AuditLog` 모델(line 484~) 필드 확인 — `action`, `actorId`(nullable), `target`(string), `diff`(Json), `regdate` 존재 검증
6. `apps/web/next.config.ts`의 `serverExternalPackages` 또는 동등 옵션 확인 — nodemailer 추가 필요 여부 판단
7. `apps/web/.env.example` 현재 상태 확인 — SMTP 변수 부재 검증
8. `pnpm test packages/auth` 베이스라인 실행 — green 확인. 결과 테스트 수치를 Slice A 종료 게이트 비교 기준으로 기록
9. `apps/web/app/admin/` 디렉토리 구조 확인 — `site/` 하위 디렉토리 존재 여부 + admin shell layout 확인 (`/admin/site/mail` 라우트 추가 위치)

검증:
- `pnpm tsc --noEmit` 0 error 베이스라인 확인
- 변경 대상 파일 식별 완료 (신규 ~10개 + 수정 ~3개)

### A.2 nodemailer 의존성 추가 + 호환성 검증

작업:
1. `packages/auth/package.json`의 `dependencies`에 추가:
   ```json
   "nodemailer": "^6.9.16"
   ```
   (Slice A 시점의 최신 stable. 정확한 버전은 `pnpm view nodemailer version` 확인)
2. `devDependencies`에 추가:
   ```json
   "@types/nodemailer": "^6.4.17"
   ```
3. `pnpm install` 실행 — lockfile 갱신
4. 호환성 smoke check — `packages/auth/src/mail/__smoke__/nodemailer-import.test.ts`(임시 스모크, A.7에서 삭제):
   ```typescript
   import { createTransport } from 'nodemailer';
   import { describe, it, expect } from 'vitest';
   describe('nodemailer compat', () => {
     it('imports without error', () => {
       expect(typeof createTransport).toBe('function');
     });
   });
   ```
5. Next.js 16 Turbopack 호환성 점검 — `pnpm dev`로 apps/web 기동 후 콘솔 에러 없음 확인. nodemailer 관련 warn이 나오면 `apps/web/next.config.ts`에 추가:
   ```typescript
   serverExternalPackages: ['nodemailer']
   ```

검증:
- `pnpm install` 성공
- smoke test 통과
- `pnpm dev` 콘솔에 nodemailer 관련 에러/warn 없음

### A.3 Mail 도메인 모듈 신설

신규 디렉토리: `packages/auth/src/mail/`

#### A.3.1 에러 클래스 (`errors.ts`)

신규 파일: `packages/auth/src/mail/errors.ts` (~40 LoC)

내용:
```typescript
/**
 * Mail 도메인 에러 — SPEC-MAIL-001.
 * MailConfigError: env 검증 실패 (process start time)
 * MailValidationError: dispatch input 검증 실패 (재시도 안 함)
 * MailTemplateError: 템플릿 렌더 실패 (잘못된 vars, 위험한 URL)
 * MailDeliveryError: 모든 재시도 소진 후 발송 실패
 */
export class MailConfigError extends Error { ... }
export class MailValidationError extends Error { ... }
export class MailTemplateError extends Error { ... }
export class MailDeliveryError extends Error {
  constructor(public readonly cause: Error) { super('mail delivery failed'); }
}
```

각 클래스는 `name` 속성을 명시적 설정 (`this.name = 'MailConfigError'`) — instanceof + name 비교 모두 안전하게.

#### A.3.2 Template 렌더러 (`templates/`)

신규 디렉토리: `packages/auth/src/mail/templates/`

신규 파일 7개:
- `signup-verify.ko.ts` — Korean signup verification email (~50 LoC)
- `signup-verify.en.ts` — English (~50 LoC)
- `password-reset.ko.ts` (~50 LoC)
- `password-reset.en.ts` (~50 LoC)
- `welcome.ko.ts` (~40 LoC)
- `welcome.en.ts` (~40 LoC)
- `render.ts` — dispatch table + escape helper + URL validator (~80 LoC)

`render.ts` 핵심:
```typescript
import * as signupVerifyKo from './signup-verify.ko';
import * as signupVerifyEn from './signup-verify.en';
// ... 6개 + email-change/security-alert stub
import { MailTemplateError } from '../errors';

type Locale = 'ko' | 'en';
type TemplateRenderer = (vars: Record<string, string>) => { subject: string; html: string; text: string };

const REGISTRY: Record<string, Partial<Record<Locale, TemplateRenderer>>> = {
  'signup-verify': { ko: signupVerifyKo.render, en: signupVerifyEn.render },
  'password-reset': { ko: passwordResetKo.render, en: passwordResetEn.render },
  'welcome': { ko: welcomeKo.render, en: welcomeEn.render },
  'email-change': { ko: stub, en: stub },     // placeholder
  'security-alert': { ko: stub, en: stub },   // placeholder
};

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): { subject: string; html: string; text: string } {
  const locale: Locale = (vars.locale === 'en' ? 'en' : 'ko');
  const tpl = REGISTRY[template]?.[locale];
  if (!tpl) throw new MailTemplateError(`unknown template: ${template} / ${locale}`);
  return tpl(vars);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function validateUrl(url: string, field: string): string {
  if (!/^https?:\/\//i.test(url)) {
    throw new MailTemplateError(`unsafe URL in ${field}: ${url.slice(0, 30)}`);
  }
  return url;
}
```

각 template 파일 (`signup-verify.ko.ts` 예시):
```typescript
import { escapeHtml, validateUrl } from './render';
import { MailTemplateError } from '../errors';

export function render(vars: Record<string, string>): { subject: string; html: string; text: string } {
  const verifyUrl = vars.verifyUrl ?? (() => { throw new MailTemplateError('missing required variable: verifyUrl'); })();
  const userName = vars.userName ?? (() => { throw new MailTemplateError('missing required variable: userName'); })();
  const siteName = vars.siteName ?? 'Rhymix';
  validateUrl(verifyUrl, 'verifyUrl');

  const safeUserName = escapeHtml(userName);
  const subject = `[${siteName}] 이메일 인증을 완료해주세요`;
  const html = `<!doctype html><html><body style="font-family:sans-serif;color:#333;">
    <h2>안녕하세요 ${safeUserName}님</h2>
    <p>${siteName} 회원 가입을 완료하려면 아래 링크를 클릭하세요.</p>
    <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#0066cc;color:#fff;text-decoration:none;border-radius:4px;">이메일 인증하기</a></p>
    <p>또는 다음 URL을 브라우저에 붙여넣으세요:</p>
    <p style="word-break:break-all;color:#666;">${verifyUrl}</p>
    <hr><p style="color:#999;font-size:12px;">본 메일은 발신 전용입니다. ${siteName}.</p>
    </body></html>`;
  const text = `안녕하세요 ${userName}님\n\n${siteName} 회원 가입을 완료하려면 다음 URL을 방문하세요:\n${verifyUrl}\n\n${siteName}`;
  return { subject, html, text };
}
```

`signup-verify.en.ts`는 동일 구조의 영문 버전. `password-reset.*` 는 `resetUrl`, `expiresInHours` 변수. `welcome.*`은 `siteUrl`, `loginUrl` 변수.

검증:
- `templates.test.ts` 3+ tests (REQ-MAIL-060 분배)

#### A.3.3 SMTP Dispatcher (`smtp-dispatcher.ts`)

신규 파일: `packages/auth/src/mail/smtp-dispatcher.ts` (~150 LoC)

핵심 구조:
```typescript
import { createTransport, type Transporter } from 'nodemailer';
import type { PrismaClient } from '@rhymix-ts/db';
import { z } from 'zod';
import type { MailDispatcher, MailMessage } from '../mail';
import { renderTemplate } from './templates/render';
import { MailValidationError, MailDeliveryError } from './errors';
import { writeMailFailureAudit } from './audit';

const recipientSchema = z.string().email();

export interface SmtpDispatcherOptions {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  secure: boolean;
  prisma?: PrismaClient; // AuditLog 작성용 (옵셔널 — Noop fallback에서는 무시)
}

/**
 * @MX:ANCHOR: SMTP 메일 발송의 단일 진입점. signup/password-reset/welcome 모든 메일이 이 클래스를 통과한다.
 * @MX:REASON: 재시도/감사/검증 로직이 한 곳에 모여야 우회로가 생기지 않는다 — Noop fallback과 동일 인터페이스.
 * @MX:SPEC: SPEC-MAIL-001 REQ-MAIL-020, REQ-MAIL-022, REQ-MAIL-040
 */
export class SmtpMailDispatcher implements MailDispatcher {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly prisma: PrismaClient | undefined;

  constructor(opts: SmtpDispatcherOptions) {
    this.from = opts.from;
    this.prisma = opts.prisma;
    this.transporter = createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: opts.user && opts.pass ? { user: opts.user, pass: opts.pass } : undefined,
    });
  }

  async dispatch(message: MailMessage): Promise<void> {
    // 1) 입력 검증 — 재시도 안 함
    const parsed = recipientSchema.safeParse(message.to);
    if (!parsed.success) throw new MailValidationError(`invalid recipient: ${message.to}`);

    // 2) 템플릿 렌더 — MailTemplateError 발생 시 즉시 throw (재시도 안 함)
    const { html, text } = renderTemplate(message.template, message.vars);

    // 3) 재시도 루프 (1, 2, 4초 백오프 — REQ-MAIL-040)
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html,
          text,
        });
        return; // 성공 — 종료
      } catch (err) {
        lastError = err as Error;
        if (this.isPermanentError(err)) {
          // 5xx 또는 인증 실패 — 재시도 없이 즉시 실패
          break;
        }
        if (attempt < 3) {
          await this.sleep(1000 * Math.pow(2, attempt - 1)); // 1s, 2s
        }
      }
    }

    // 4) 모든 재시도 소진 — AuditLog + throw
    if (this.prisma) {
      await writeMailFailureAudit(this.prisma, message, lastError!);
    }
    throw new MailDeliveryError(lastError!);
  }

  async verify(): Promise<boolean> {
    return this.transporter.verify();
  }

  private isPermanentError(err: unknown): boolean {
    const e = err as { responseCode?: number; code?: string };
    if (e.code === 'EAUTH' || e.code === 'EENVELOPE') return true;
    if (typeof e.responseCode === 'number' && e.responseCode >= 500 && e.responseCode < 600) return true;
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
```

검증:
- `smtp-dispatcher.test.ts` 5+ tests (REQ-MAIL-060 분배)

#### A.3.4 Audit log writer (`audit.ts`)

신규 파일: `packages/auth/src/mail/audit.ts` (~40 LoC)

```typescript
import type { PrismaClient } from '@rhymix-ts/db';
import type { MailMessage } from '../mail';

/**
 * @MX:NOTE: 메일 발송 실패를 AuditLog에 기록한다. 작성 실패 자체는 swallow.
 * @MX:SPEC: SPEC-MAIL-001 REQ-MAIL-042
 */
export async function writeMailFailureAudit(
  prisma: PrismaClient,
  message: MailMessage,
  error: Error,
): Promise<void> {
  const errorCode = (error as { responseCode?: number; code?: string }).responseCode
    ?? (error as { code?: string }).code
    ?? 'NETWORK';
  try {
    await prisma.auditLog.create({
      data: {
        action: 'MAIL_DELIVERY_FAILED',
        actorId: null,
        target: message.to,
        diff: {
          template: message.template,
          errorCode: String(errorCode),
          attempts: 3,
        } as object,
      },
    });
  } catch (auditErr) {
    // AuditLog 작성 실패는 swallow — 메일 실패가 cascade 일으키지 않게.
    console.error('[mail] failed to write AuditLog for mail failure:', auditErr);
  }
}
```

검증:
- audit 작성은 smtp-dispatcher.test.ts에서 mock된 prisma로 검증 (REQ-MAIL-042의 AC-MAIL-A3)

#### A.3.5 Factory (`factory.ts`)

신규 파일: `packages/auth/src/mail/factory.ts` (~70 LoC)

```typescript
import { z } from 'zod';
import type { PrismaClient } from '@rhymix-ts/db';
import type { MailDispatcher } from '../mail';
import { NoopMailDispatcher } from '../mail';
import { SmtpMailDispatcher } from './smtp-dispatcher';
import { MailConfigError } from './errors';

const smtpEnvSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().min(3),
  SMTP_SECURE: z.string().optional().transform(v => v === 'true'),
}).refine(env => !env.SMTP_USER || !!env.SMTP_PASS, {
  message: 'SMTP_PASS is required when SMTP_USER is set',
  path: ['SMTP_PASS'],
});

export interface CreateMailDispatcherOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  prisma?: PrismaClient;
}

let warnedNoop = false;

/**
 * @MX:ANCHOR: 환경에 따라 SMTP 또는 Noop 디스패처를 선택한다.
 * @MX:REASON: dispatcher 선택 로직이 한 곳에 모여야 production/dev 동작 차이가 명시적으로 관리된다.
 * @MX:SPEC: SPEC-MAIL-001 REQ-MAIL-010, REQ-MAIL-011, REQ-MAIL-012
 */
export function createMailDispatcher(opts: CreateMailDispatcherOptions = {}): MailDispatcher {
  const env = opts.env ?? process.env;
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    if (!warnedNoop) {
      console.warn(
        '[mail] SMTP_HOST not configured — using NoopMailDispatcher. Emails will NOT be delivered.',
      );
      warnedNoop = true;
    }
    return new NoopMailDispatcher();
  }

  const parsed = smtpEnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new MailConfigError(`invalid SMTP config: ${msg}`);
  }

  return new SmtpMailDispatcher({
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    from: parsed.data.SMTP_FROM,
    secure: parsed.data.SMTP_SECURE ?? false,
    prisma: opts.prisma,
  });
}

// 테스트 전용 — 모듈 스코프 warn flag 리셋.
export function __resetMailWarning(): void {
  warnedNoop = false;
}
```

검증:
- `factory.test.ts` 4+ tests (REQ-MAIL-060 분배)

### A.4 Barrel export 갱신 + `mail.ts`의 MailTemplate union 확장

작업:
1. `packages/auth/src/mail.ts`의 `MailTemplate` union에 `'welcome'` 추가:
   ```typescript
   export type MailTemplate =
     | 'signup-verify'
     | 'password-reset'
     | 'email-change'
     | 'security-alert'
     | 'welcome';
   ```
2. `packages/auth/src/index.ts`(barrel)에 추가:
   ```typescript
   // SPEC-MAIL-001 Slice A — SMTP 메일 디스패처.
   export { SmtpMailDispatcher } from './mail/smtp-dispatcher';
   export { createMailDispatcher } from './mail/factory';
   export {
     MailConfigError,
     MailValidationError,
     MailTemplateError,
     MailDeliveryError,
   } from './mail/errors';
   export { renderTemplate } from './mail/templates/render';
   ```

검증:
- `pnpm -F @rhymix-ts/auth tsc --noEmit` 0 error
- `pnpm -F @rhymix-ts/auth test` 기존 + 신규 12개 통과

### A.5 apps/web wiring 갱신

#### A.5.1 dispatcher 싱글톤 모듈

신규 파일: `apps/web/lib/mail/dispatcher.ts` (~15 LoC)

```typescript
/**
 * SPEC-MAIL-001 — apps/web 전체에서 공유되는 mail dispatcher 싱글톤.
 *
 * @MX:NOTE: process 시작 시 env를 한 번 평가한다. .env 변경 시 process 재시작 필요.
 */
import { createMailDispatcher } from '@rhymix-ts/auth';
import { prisma } from '@rhymix-ts/db';

export const mailDispatcher = createMailDispatcher({ env: process.env, prisma });
```

#### A.5.2 actions.ts 두 callsite 교체

작업:
1. `apps/web/lib/auth/actions.ts`의 import에서 `NoopMailDispatcher` 제거하고 `mailDispatcher` 추가:
   ```typescript
   // Remove:
   //   NoopMailDispatcher,
   // Add:
   import { mailDispatcher } from '@/lib/mail/dispatcher';
   ```
2. `actions.ts:80` (signupAction 안):
   ```typescript
   // Before: mail: new NoopMailDispatcher(),
   // After:  mail: mailDispatcher,
   ```
3. `actions.ts:251` (requestPasswordResetAction 안):
   ```typescript
   // Before: { prisma, mail: new NoopMailDispatcher() },
   // After:  { prisma, mail: mailDispatcher },
   ```
4. signupAction의 mail dispatch vars에 `locale: 'ko'` 추가 (REQ-MAIL-034 default 명시):
   - signup.ts:225는 패키지 내부 — 본 SPEC은 변경 안 함. 대신 actions.ts에서 dispatch 호출 후 locale을 별도로 vars에 추가하는 경로는 signup() 시그니처 의존이므로 보류. signup.ts 내부의 dispatch 호출에 `locale: ctx.config.locale ?? 'ko'`를 옵션으로 추가하는 것은 별도 PR. 본 SPEC은 default 'ko'(REQ-MAIL-034)에 의존.

#### A.5.3 .env.example 갱신

`apps/web/.env.example` (또는 monorepo root `.env.example`)에 추가:
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

검증:
- `pnpm dev` 콘솔에 `[mail] SMTP_HOST not configured` warn이 정확히 1회 출력 (default dev 환경)
- 실제 SMTP 자격증명 설정 후 `pnpm dev` 재시작 시 warn 미출력

### A.6 Admin UI 페이지 + Server Actions

#### A.6.1 admin/site/mail 페이지

신규 파일: `apps/web/app/admin/site/mail/page.tsx` (~120 LoC)

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { mailDispatcher } from '@/lib/mail/dispatcher';
import { SmtpMailDispatcher } from '@rhymix-ts/auth';
import { testMailConnectionAction, sendTestMailAction } from './actions';
import { MailSettingsClient } from './_client';

export default async function AdminMailSettingsPage() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    redirect('/login');
  }

  const isSmtp = mailDispatcher instanceof SmtpMailDispatcher;
  const config = {
    host: process.env.SMTP_HOST ? maskHost(process.env.SMTP_HOST) : '(unset)',
    port: process.env.SMTP_PORT ?? '587',
    from: process.env.SMTP_FROM ?? '(unset)',
    secure: process.env.SMTP_SECURE === 'true',
    userSet: !!process.env.SMTP_USER,
    passSet: !!process.env.SMTP_PASS,
    dispatcherType: isSmtp ? 'SmtpMailDispatcher' : 'NoopMailDispatcher',
  };

  return (
    <main className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">메일 설정</h1>
      {!isSmtp && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded mb-6">
          ⚠ 메일 발송이 비활성화되어 있습니다. .env 에 SMTP_HOST 를 설정하세요.
        </div>
      )}
      <dl className="space-y-2 mb-6">
        <ConfigRow label="SMTP_HOST" value={config.host} />
        <ConfigRow label="SMTP_PORT" value={config.port} />
        <ConfigRow label="SMTP_FROM" value={config.from} />
        <ConfigRow label="SMTP_SECURE" value={String(config.secure)} />
        <ConfigRow label="SMTP_USER" value={config.userSet ? 'set' : '(unset)'} />
        <ConfigRow label="SMTP_PASS" value={config.passSet ? 'set' : '(unset)'} />
        <ConfigRow label="Dispatcher" value={config.dispatcherType} />
      </dl>
      <MailSettingsClient
        disabled={!isSmtp}
        testConnectionAction={testMailConnectionAction}
        sendTestMailAction={sendTestMailAction}
      />
    </main>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) { ... }
function maskHost(host: string): string {
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  return parts[0] + '.****.' + parts.slice(-1)[0];
}
```

신규 파일: `apps/web/app/admin/site/mail/_client.tsx` (~60 LoC) — 클라이언트 컴포넌트 (버튼 + toast)

#### A.6.2 Server Actions

신규 파일: `apps/web/app/admin/site/mail/actions.ts` (~60 LoC)

```typescript
'use server';

import { auth } from '@/lib/auth/config';
import { mailDispatcher } from '@/lib/mail/dispatcher';
import { SmtpMailDispatcher } from '@rhymix-ts/auth';

export async function testMailConnectionAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return { ok: false, error: 'unauthorized' };
  }
  if (!(mailDispatcher instanceof SmtpMailDispatcher)) {
    return { ok: false, error: 'NoopMailDispatcher — SMTP_HOST 미설정' };
  }
  try {
    await mailDispatcher.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function sendTestMailAction(input: { to: string }): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean })?.isAdmin) {
    return { ok: false, error: 'unauthorized' };
  }
  try {
    await mailDispatcher.dispatch({
      to: input.to,
      subject: '[Test] Rhymix 메일 설정 점검',
      template: 'signup-verify',
      vars: {
        verifyUrl: 'https://example.com/test',
        userName: 'Admin Test',
        locale: 'ko',
      },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
```

검증:
- `apps/web/app/admin/site/mail/page.tsx`가 admin 권한 없이 접근 시 `/login` redirect (manual e2e 또는 unit test)
- "연결 테스트" 버튼 클릭 시 NoopMailDispatcher 환경에서는 명시적 메시지, SMTP 환경에서는 verify() 결과 표시

### A.7 Slice A 종료 게이트

체크리스트:
- [ ] `packages/auth/src/mail/` 디렉토리 존재 + 8개 파일 (smtp-dispatcher.ts, factory.ts, errors.ts, audit.ts, templates/render.ts + 6 templates)
- [ ] `packages/auth/src/mail.ts`의 `MailTemplate` union에 `'welcome'` 추가됨
- [ ] `packages/auth/src/mail.ts`의 `MailDispatcher` 인터페이스 변경 없음 (REQ-MAIL-001)
- [ ] `packages/auth/src/index.ts`에 신규 export 5개 (SmtpMailDispatcher, createMailDispatcher, 4 error classes, renderTemplate) 추가됨
- [ ] `apps/web/lib/mail/dispatcher.ts` 싱글톤 존재
- [ ] `apps/web/lib/auth/actions.ts`의 `new NoopMailDispatcher()` 두 곳이 `mailDispatcher` import로 교체됨
- [ ] `apps/web/.env.example`에 SMTP_* 6개 변수 + 주석 추가됨
- [ ] `apps/web/app/admin/site/mail/{page.tsx, _client.tsx, actions.ts}` 3개 파일 존재
- [ ] `packages/auth/package.json`에 `nodemailer` + `@types/nodemailer` 의존성 추가됨
- [ ] `pnpm install` 성공 (lockfile 갱신)
- [ ] `pnpm test packages/auth` 통과 (기존 + 신규 ~12 tests = 총합 + ~12)
- [ ] `pnpm test apps/web` 통과
- [ ] `pnpm tsc --noEmit` (root) 0 error
- [ ] `pnpm build` apps/web 성공
- [ ] `pnpm dev` 콘솔에 `[mail] SMTP_HOST not configured` warn이 정확히 1회 출력(SMTP_HOST 미설정 시)
- [ ] nodemailer smoke test 임시 파일 삭제됨
- [ ] AC-MAIL-A1, A2, A3, A4, A5 모두 통과 (acceptance.md 시나리오 기반 테스트)
- [ ] manager-quality TRUST 5 게이트 통과: 85%+ coverage on `packages/auth/src/mail/**`
- [ ] `madge --circular packages/auth/src` 통과 (circular dep 없음)

EARS coverage: REQ-MAIL-001 ~ REQ-MAIL-075 전체

---

## Acceptance Gates per Slice

| Gate | Slice | EARS | Test Count Delta |
|---|---|---|---|
| AC-MAIL-A1 (SMTP dispatcher selection) | A | REQ-MAIL-010, 012 | +1 |
| AC-MAIL-A2 (Noop fallback + warn) | A | REQ-MAIL-011 | +1 |
| AC-MAIL-A3 (retry + audit on failure) | A | REQ-MAIL-040, 041, 042, 043 | +3 |
| AC-MAIL-A4 (template rendering i18n + escape) | A | REQ-MAIL-031, 033, 034, 035 | +3 |
| AC-MAIL-A5 (admin test connection) | A | REQ-MAIL-026, 051, 052, 053 | +2 |
| Additional infrastructure (config error, validation, permanent error no-retry) | A | REQ-MAIL-013, 014, 015, 025, 041 | +2 |
| **Total new tests** | | | **+12** |

(MP-002 target: 12 — exact match.)

---

## Risk Mitigations per Slice

| Risk (from spec.md Section 6) | Slice | Mitigation Action |
|---|---|---|
| nodemailer/Next.js 16 Turbopack 호환 | A | A.2 단계의 smoke test + serverExternalPackages 옵션 |
| SMTP 자격증명 누출 | A | .env.example만 commit, 실제 값 .env에 (.gitignore) |
| 액션 응답 지연 (재시도 3s) | A | signup.ts:222의 fire-and-forget try/catch 보존 (변경 없음) |
| 잘못된 SMTP_FROM | A | factory의 Zod 검증 + admin UI의 verify() 버튼 |
| AuditLog 작성 실패 cascade | A | audit.ts의 try/catch swallow + console.error |
| 한글 인코딩 깨짐 | A | templates.test.ts에 한글 subject + body 검증 포함 |
| welcome 템플릿 dead code | A | 템플릿은 ship하나 wiring(verifyEmailAction)은 백로그 — README에 명시 |

---

## Token Budget Estimation (per /moai run)

Slice A: ~110K tokens
- nodemailer 의존 추가 + smoke (5K)
- mail 모듈 신설 (smtp + factory + errors + audit + 7 templates + index 교체) (~60K)
- apps/web wiring (dispatcher 싱글톤 + 2 callsite + .env.example) (~10K)
- admin UI 페이지 + actions (~20K)
- 신규 12 tests (~15K)

**Total `/moai run SPEC-MAIL-001` 추정**: ~110K tokens. 180K 예산 내 — 단일 슬라이스로 실행 가능.

분할 실행 불필요 — 단일 `/moai run SPEC-MAIL-001` 호출로 완결.

---

## Dependencies & Sequencing

```
SPEC-AUTH-001 ──┐ (MailDispatcher 인터페이스 + signup/password-reset wiring)
                │
SPEC-ADMIN-001 ─┼──► SPEC-MAIL-001 Slice A
                │
(AuditLog 모델) ┘                │
                                  ▼
                         (Phase 3 production-ready mail)
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        SPEC-AUTH-POLISH-001  SPEC-MAIL-SAAS-001  SPEC-INFRA-001
        (welcome wiring)      (Resend/SendGrid)    (DB queue)
```

병행 가능:
- SPEC-FILE-001 (Phase 3 동기) — 파일 충돌 없음
- SPEC-POINT-001 (Phase 3 동기) — 파일 충돌 없음

---

## File-Level Summary

신규 파일 (~12개):
- `packages/auth/src/mail/errors.ts`
- `packages/auth/src/mail/audit.ts`
- `packages/auth/src/mail/factory.ts`
- `packages/auth/src/mail/factory.test.ts`
- `packages/auth/src/mail/smtp-dispatcher.ts`
- `packages/auth/src/mail/smtp-dispatcher.test.ts`
- `packages/auth/src/mail/templates/render.ts`
- `packages/auth/src/mail/templates/templates.test.ts`
- `packages/auth/src/mail/templates/signup-verify.ko.ts`
- `packages/auth/src/mail/templates/signup-verify.en.ts`
- `packages/auth/src/mail/templates/password-reset.ko.ts`
- `packages/auth/src/mail/templates/password-reset.en.ts`
- `packages/auth/src/mail/templates/welcome.ko.ts`
- `packages/auth/src/mail/templates/welcome.en.ts`
- `apps/web/lib/mail/dispatcher.ts`
- `apps/web/app/admin/site/mail/page.tsx`
- `apps/web/app/admin/site/mail/_client.tsx`
- `apps/web/app/admin/site/mail/actions.ts`

수정 파일 (~5개):
- `packages/auth/src/mail.ts` — `MailTemplate` union에 `'welcome'` 추가
- `packages/auth/src/index.ts` — barrel export 갱신
- `packages/auth/package.json` — nodemailer 의존 추가
- `apps/web/lib/auth/actions.ts` — `NoopMailDispatcher` → `mailDispatcher` 2 callsite
- `apps/web/.env.example` — SMTP 변수 6개 추가
- (조건부) `apps/web/next.config.ts` — serverExternalPackages

테스트 파일 (3개, 신규 12 tests):
- `factory.test.ts` (4 tests)
- `smtp-dispatcher.test.ts` (5 tests)
- `templates.test.ts` (3 tests)

---

Version: 1.0.0
Status: draft
