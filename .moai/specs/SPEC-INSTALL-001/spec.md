---
id: SPEC-INSTALL-001
title: Initial Installation Wizard & First-Run Bootstrap
status: completed
priority: P0
created: 2026-05-10
domain: install
related: [SPEC-ADMIN-001, SPEC-AUTH-001, SPEC-THEME-001]
---

## HISTORY

- 2026-05-10 (v0.1.0, completed): 최초 작성 및 구현. REQ-INSTALL-001~054, Slice A~D 완료(PR #19~#22, 859/868 tests passing). frontmatter에 `version` 필드 없음(원본 컨벤션 유지).
- 2026-06-21 (v0.1.1, completed): **문서 추가 전용 변경(구현 미포함).** Playwright로 설치 마법사를 끝까지 실행해 레거시 PHP Rhymix와 비교한 결과 발견된 post-install 부트스트랩 갭을 메우기 위해 신규 Event-driven 요구사항 REQ-INSTALL-016(인덱스 모듈 지정)·REQ-INSTALL-017(기본 메뉴 생성)·REQ-INSTALL-018(샘플 콘텐츠, `seed_sample_content` Where 절)을 추가하고, 대응 수락 기준 AC-INSTALL-008~011 및 Traceability 행을 추가. `status`는 `completed` 유지하되, 신규 REQ는 코드 미구현 갭으로 `progress.md` "구현 갭(Implementation Gap)" 섹션에 기록(추후 manager-ddd/expert-backend가 `packages/db/src/install/seed.ts` 보완 시 참조). frontmatter `version` 필드는 원본 컨벤션 유지를 위해 추가하지 않음 — 버전은 본 HISTORY 항목으로만 추적.
- 2026-06-22 (v0.1.2, completed): **구현 완료.** manager-tdd가 `packages/db/src/install/seed.ts`에 REQ-INSTALL-016~018을 구현(9~12단계: Board×3 생성 → Menu×1/MenuItem×3 생성 → Domain.update(indexModuleInstanceId, defaultMenuId) → 샘플 Document×2). `seed.test.ts`에 신규 테스트 추가, 7 tests 전부 통과(`pnpm vitest run packages/db/src/install/seed.test.ts`). `progress.md` "구현 갭" 섹션을 해소 완료로 갱신.

---

## Overview

Rhymix-TS의 **최초 설치 마법사**를 정의한다. 사용자가 빈 데이터베이스를 가진 새 인스턴스에 처음 접속했을 때, GPL 라이선스 동의 → 환경 진단 → 데이터베이스 설정 → 첫 관리자 계정 생성 → 사이트 락(SiteLock) 옵션 → 부트스트랩 완료까지의 4-단계 위저드를 제공한다. 원본 Rhymix v2.1.32의 4단계 인스톨러를 모티브로 하되, 다음을 현대화한다:

- MySQL 고정 → **PostgreSQL 16+** + Prisma `db push`/`migrate deploy`
- PHP 환경 진단 → **Node.js 22+ / Next.js 16 / Edge runtime** 진단
- `files/config/config.php` 파일 기반 설정 → **환경 변수(.env) + `Site` 테이블** 하이브리드
- 13개 언어 인스톨러 다국어 → next-intl 기반 다국어 위저드
- AJAX `mod_rewrite` 체크 → middleware/rewrite 동작 확인 핑

설치는 **idempotent + irreversible** 해야 한다. 한 번 완료된 인스턴스는 다시 설치 흐름으로 돌아갈 수 없으며(`/install` 라우트는 기설치 상태에서 410 응답), 설치 중간 단계에서는 임시 상태가 안전하게 보존되거나 명시적으로 폐기된다.

## User Stories

- **US-INSTALL-001**: 사이트 운영자가 처음 도메인에 접속하면 자동으로 `/install` 위저드로 리다이렉트된다.
- **US-INSTALL-002**: 운영자는 13개 언어 중 위저드 표시 언어를 선택할 수 있다(기본: 브라우저 `Accept-Language`).
- **US-INSTALL-003**: 운영자는 GPL v2 라이선스 본문을 읽고 동의 체크박스를 체크해야 다음 단계로 진행할 수 있다.
- **US-INSTALL-004**: 운영자는 시스템이 자동 진단한 환경 체크 결과를 확인하고, 문제가 있으면 안내에 따라 해결한 뒤 재진단할 수 있다.
- **US-INSTALL-005**: 운영자는 PostgreSQL 접속 정보(host, port, user, password, database, schema)를 입력하면 시스템이 즉시 연결성/권한/기존 테이블 충돌을 검사한다.
- **US-INSTALL-006**: 운영자는 root/superuser 계정으로 설치를 시도할 수 없으며 명시적으로 차단된다.
- **US-INSTALL-007**: 운영자는 첫 관리자 계정의 이메일/비밀번호/닉네임/유저ID/타임존을 입력하고 SSL 강제 여부와 SiteLock(IP 화이트리스트) 활성화를 선택한다.
- **US-INSTALL-008**: 시스템은 비밀번호 강도 정책(REQ-AUTH-041)을 즉시 클라이언트 측에서 안내하고, 서버에서 재검증한다.
- **US-INSTALL-009**: 설치 완료 후 운영자는 자동으로 관리자 대시보드에 로그인되며, 환영 가이드(첫 모듈 인스턴스 생성 안내)를 본다.
- **US-INSTALL-010**: SiteLock이 켜진 경우, 설치 직후 화이트리스트 IP 외의 모든 접근은 503 잠금 페이지로 안내된다.
- **US-INSTALL-011**: 운영자는 설치 중 어느 단계에서도 이전 단계로 돌아가 입력을 수정할 수 있고, 마지막 `procInstall` 단계 직전까지는 데이터베이스에 영구 변경이 일어나지 않는다.
- **US-INSTALL-012**: 시스템은 설치 진행 중 브라우저가 닫혀도, 입력된 DB 설정과 관리자 정보는 암호화된 서버 세션에만 저장되고 60분 후 자동 폐기된다.

## EARS Requirements

### Ubiquitous (불변 조건)

- **REQ-INSTALL-001**: The system shall route any unauthenticated request to a non-installed instance to `/install` (HTTP 302) except for static assets under `/_next/`, `/favicon.ico`, and `/api/install/*`.
- **REQ-INSTALL-002**: The system shall persist installation status in a single source of truth: presence of the `Site` row with `installed_at IS NOT NULL` AND environment variable `INSTALL_LOCK=1` (set by the wizard upon completion).
- **REQ-INSTALL-003**: The system shall include a CSRF token in every wizard form via `next-auth`-compatible double-submit cookie pattern.
- **REQ-INSTALL-004**: The system shall log every wizard step transition with timestamp, IP address, user agent to a temporary in-memory ring buffer (no DB writes during steps 1–3).
- **REQ-INSTALL-005**: The system shall encrypt the wizard's session payload (DB credentials, admin password) using the application encryption key before writing to the iron-session cookie.

### Event-driven (입력→처리)

- **REQ-INSTALL-010**: When the operator visits `/install` for the first time, the system shall detect the browser language from `Accept-Language` and present the wizard in that language if supported, otherwise English.
- **REQ-INSTALL-011**: When the operator submits the license agreement form with `agreed=true`, the system shall set the wizard session flag `licenseAgreed=true` and redirect to `/install/check-env`.
- **REQ-INSTALL-012**: When the operator visits `/install/check-env`, the system shall execute the following diagnostics in parallel and render results within 5 seconds:
  - Node.js version >= 22.0.0
  - Required environment variables present (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
  - Write permission on `./public/uploads`, `./.next/cache`
  - PostgreSQL client library available (`@prisma/client` resolvable)
  - Email transport reachable (optional, soft-fail)
  - Middleware rewrite test (issue HEAD to `/install/_rewrite_test/{nonce}` and verify response)
- **REQ-INSTALL-013**: When the operator submits the DB config form, the system shall:
  1. Reject if `db_user` ∈ {`postgres`, `root`, `admin`} (case-insensitive) unless `NODE_ENV=development`.
  2. Open a connection using submitted credentials with statement timeout 5s.
  3. Verify `CREATE`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` permissions on the target schema.
  4. Verify the schema does not contain any of `users`, `documents`, `comments`, `modules`, `sites` tables.
  5. Encrypt and store the validated config in the wizard session.
  6. Redirect to `/install/admin-config`.
- **REQ-INSTALL-014**: When the operator submits the admin config form with valid input, the system shall execute `procInstall`:
  1. Run `prisma migrate deploy` against the target database in a single transaction (or savepoint per migration).
  2. Insert the default `Site` row with the chosen `default_language`, `time_zone`, `default_layout`, and `installed_at = NOW()`.
  3. Hash the admin password with Argon2id (REQ-AUTH-001) and insert the first `User` row with `is_admin=true`, `status=APPROVED`.
  4. Insert the default `MemberGroup` rows (`admin`, `member`).
  5. Generate `INSTALL_LOCK=1` and write to `.env.local` (or set process env if cloud-deployed).
  6. If `use_sitelock=true`, persist the operator's request IP into `SiteSetting.sitelock_allowlist`.
  7. Issue an Auth.js session cookie for the new admin and redirect to `/admin/welcome`.
- **REQ-INSTALL-015**: When migration fails at any point during `procInstall`, the system shall roll back the entire transaction, leave the database empty, and return the operator to `/install/db-config` with an error message identifying the failed migration.
- **REQ-INSTALL-016**: When `procInstall` reaches the seed step (after the default `ModuleInstance` rows are created in REQ-INSTALL-014 sub-step 7), the system shall designate the `board` `ModuleInstance` as the default index module by setting `Domain.indexModuleInstanceId` of the default domain to that instance's `id`, within the same install transaction.
  - Rationale: without this, the homepage of a freshly installed instance renders only "No index module configured for this domain." The schema already provides `Domain.indexModuleInstanceId` and the `IndexModule` relation (`schema.prisma:86`, `:95`, `:131`); the seed must populate it.
- **REQ-INSTALL-017**: When `procInstall` reaches the seed step, the system shall create one default `Menu` for the default site, populate it with `MenuItem` rows linking to the seeded board modules (Welcome/Notice/Q&A/Board, mapping to the `board`, `notice`, and `qna` module instances), and set `Domain.defaultMenuId` of the default domain to that menu's `id`, within the same install transaction.
  - Rationale: without this, `/admin/menu` shows "등록된 메뉴가 없습니다" and the site has no navigation. The schema already provides `Menu`/`MenuItem` (`schema.prisma:158`, `:177`) and `Domain.defaultMenuId` (`schema.prisma:84`); the seed must populate them. The legacy Rhymix installer seeds an equivalent default menu.
- **REQ-INSTALL-018**: Where `seed_sample_content=true` (default `true`), when `procInstall` reaches the seed step, the system shall create at least one welcome/announcement sample `Document` in each of the `board` and `notice` board modules, within the same install transaction.
  - Note: a `Document` requires a `boardId` referencing a `Board` row, and a `Board` requires a `moduleInstanceId`. The current seed creates `ModuleInstance` rows only (no `Board` rows). Therefore this requirement implicitly requires the seed to also create the corresponding `Board` rows (`schema.prisma:640`, FK `moduleInstanceId`) for the `board`/`notice`/`qna` module instances before inserting sample documents.
  - Rationale: the legacy Rhymix installer seeds sample posts so a fresh site is not empty. Operators who want a blank site set `seed_sample_content=false`.

### State-driven (지속 상태)

- **REQ-INSTALL-020**: While `installed_at IS NULL` for the default `Site`, all routes outside `/install/*` and `/api/install/*` shall return HTTP 302 to `/install`.
- **REQ-INSTALL-021**: While the wizard session has `licenseAgreed=false`, navigation to `/install/check-env`, `/install/db-config`, or `/install/admin-config` shall redirect back to `/install`.
- **REQ-INSTALL-022**: While the wizard session contains `dbConfigValidated=false`, navigation to `/install/admin-config` shall redirect back to `/install/db-config`.
- **REQ-INSTALL-023**: While `INSTALL_LOCK=1` is set in the runtime environment, all `/install/*` and `/api/install/*` routes shall return HTTP 410 Gone.
- **REQ-INSTALL-024**: While `Site.use_sitelock=true` AND the request IP ∉ `Site.sitelock_allowlist`, the system shall return HTTP 503 with a "Site Locked" page for all routes except `/admin/*` (which still requires login).

### Optional (조건부 기능)

- **REQ-INSTALL-040**: Where the operator has set `use_ssl=always`, the system shall persist `Site.scheme = "https"` and emit `Strict-Transport-Security` headers from middleware after install.
- **REQ-INSTALL-041**: Where the operator has set `use_sitelock=true`, the system shall present a confirmation modal explaining the IP allowlist mechanism and provide an "I understand" affordance before activation.
- **REQ-INSTALL-042**: Where the deployment is a cloud platform that does not allow writing to `.env.local` (e.g., Vercel, Railway), the system shall fall back to writing the install lock to a `_install_lock` row in the `SiteSetting` table.
- **REQ-INSTALL-043**: Where the environment variable `RHYMIX_TS_IMPORT_FROM=<URL>` is present, the wizard shall offer an "Import from existing Rhymix" optional step that reads from the legacy MySQL DB and seeds the new Postgres schema (deferred to SPEC-MIGRATE-001).

### Unwanted (금지 사항)

- **REQ-INSTALL-050**: The system shall NOT write any data to the target database during steps 1–3 of the wizard.
- **REQ-INSTALL-051**: The system shall NOT log the admin password or DB password in plaintext to any log sink (stdout, file, telemetry).
- **REQ-INSTALL-052**: The system shall NOT permit installation if `NEXTAUTH_SECRET` is missing or shorter than 32 bytes.
- **REQ-INSTALL-053**: The system shall NOT allow concurrent installations: a distributed advisory lock (`pg_advisory_lock(0xRMXINSTL)`) shall guard `procInstall`.
- **REQ-INSTALL-054**: The system shall NOT accept admin emails matching disposable email patterns (`mailinator.com`, `tempmail.*`) by default; this rule may be relaxed in `NODE_ENV=development`.

## Acceptance Criteria

### AC-INSTALL-001 (REQ-INSTALL-001, 020)

- **Given** a fresh deployment with empty database
- **When** an operator navigates to `https://example.com/`
- **Then** the response is HTTP 302 with `Location: /install` and the install page renders

### AC-INSTALL-002 (REQ-INSTALL-013)

- **Given** the operator is on `/install/db-config`
- **When** they submit `db_user=postgres` in production mode
- **Then** the form returns 400 with message `"Cannot install using a superuser account. Create a dedicated database user."`

### AC-INSTALL-003 (REQ-INSTALL-013, 015)

- **Given** the operator submits valid DB credentials but a table named `users` already exists
- **When** the validation runs
- **Then** the form returns 409 with `"Table 'users' already exists. Use an empty schema or drop existing tables."`

### AC-INSTALL-004 (REQ-INSTALL-014, 015)

- **Given** the operator completes all 4 steps and `procInstall` is executing
- **When** the second migration fails due to a permission error
- **Then** the entire migration transaction rolls back, the database is empty, and the operator is redirected to `/install/db-config` with the error

### AC-INSTALL-005 (REQ-INSTALL-023)

- **Given** the install has completed and `INSTALL_LOCK=1`
- **When** an attacker navigates to `/install`
- **Then** the response is HTTP 410 Gone with a generic message and no installer UI is rendered

### AC-INSTALL-006 (REQ-INSTALL-024, 041)

- **Given** the operator enabled SiteLock and their IP `203.0.113.5` was added to the allowlist
- **When** a visitor from `198.51.100.10` visits `/`
- **Then** the response is HTTP 503 with the "Site Locked" page

### AC-INSTALL-007 (REQ-INSTALL-053)

- **Given** two operators submit `procInstall` simultaneously from different sessions
- **When** both reach the migration step
- **Then** only one acquires `pg_advisory_lock`, the other waits, and upon receiving the lock detects `INSTALL_LOCK=1` and returns 410

### AC-INSTALL-008 (REQ-INSTALL-016)

- **Given** the operator completes all 4 steps and `procInstall` succeeds
- **When** a visitor navigates to the site homepage `/`
- **Then** the default `Domain.indexModuleInstanceId` is set to the `board` module instance's `id`, and the homepage renders the board module (not "No index module configured for this domain.")

### AC-INSTALL-009 (REQ-INSTALL-017)

- **Given** the operator completes installation successfully
- **When** an admin opens `/admin/menu`
- **Then** at least one `Menu` exists with `MenuItem` rows linking to the seeded board modules, the default `Domain.defaultMenuId` points to that menu, and the page does not show "등록된 메뉴가 없습니다"

### AC-INSTALL-010 (REQ-INSTALL-018)

- **Given** installation runs with the default `seed_sample_content=true`
- **When** `procInstall` completes
- **Then** each of the `board` and `notice` board modules has a backing `Board` row and contains at least one sample `Document`, and the homepage/board listing shows the welcome post

### AC-INSTALL-011 (REQ-INSTALL-018, sample content opt-out)

- **Given** the operator (or deployment config) sets `seed_sample_content=false`
- **When** `procInstall` completes
- **Then** no sample `Document` rows are created, while the index module (REQ-INSTALL-016) and default menu (REQ-INSTALL-017) are still configured

## Domain Model

### Wizard Session (server-side, iron-session encrypted cookie)

```typescript
type InstallSession = {
  step: 'license' | 'check-env' | 'db-config' | 'admin-config';
  licenseAgreed: boolean;
  envChecksPass: boolean;
  dbConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;       // encrypted at rest in cookie
    database: string;
    schema: string;     // default 'public'
  };
  dbConfigValidated: boolean;
  adminConfig?: {
    email: string;
    password: string;   // encrypted at rest in cookie
    nickName: string;
    userId: string;
    timeZone: string;
    useSsl: 'always' | 'none';
    useSitelock: boolean;
  };
  language: string;     // BCP-47 tag
  startedAt: Date;
  expiresAt: Date;      // startedAt + 60min
};
```

### Persistent Bootstrap Tables (created during procInstall)

```prisma
model Site {
  id                    Int      @id @default(autoincrement())
  defaultLanguage       String   @default("en")
  timeZone              String   @default("UTC")
  scheme                String   @default("https") // 'http' | 'https'
  installedAt           DateTime?
  installedBy           Int?
  installerIp           String?
  installerUserAgent    String?
  rhymixTsVersion       String   // populated from package.json at install time
  databaseSchemaVersion String   // last applied migration name

  settings              SiteSetting[]
  domains               Domain[]
}

model SiteSetting {
  id        Int      @id @default(autoincrement())
  siteId    Int
  key       String   // e.g. 'sitelock_allowlist', 'sitelock_enabled', 'install_lock'
  value     Json
  updatedAt DateTime @updatedAt

  site      Site     @relation(fields: [siteId], references: [id])

  @@unique([siteId, key])
}
```

### Environment Diagnostics

Server-side check executor returns a structured result:

```typescript
type EnvCheckResult = {
  category: 'runtime' | 'env' | 'fs' | 'database' | 'mail' | 'middleware';
  key: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  remediation?: string;  // i18n key
};

type EnvCheckReport = {
  overall: 'ok' | 'warn' | 'error';
  results: EnvCheckResult[];
  generatedAt: Date;
};
```

## API Surface

### Public Routes (Next.js App Router)

| Path | Method | Purpose |
|---|---|---|
| `/install` | GET | License agreement page (step 1) |
| `/install/check-env` | GET | Environment diagnostics page (step 2) |
| `/install/db-config` | GET | DB config form (step 3) |
| `/install/admin-config` | GET | Admin account form (step 4) |
| `/install/complete` | GET | Welcome screen post-install |

### Server Actions

```typescript
'use server';

export async function agreeLicense(formData: FormData): Promise<ActionResult>;
export async function runEnvDiagnostics(): Promise<EnvCheckReport>;
export async function validateDbConfig(input: DbConfigInput): Promise<DbValidationResult>;
export async function performInstall(input: AdminConfigInput): Promise<InstallResult>;
export async function setWizardLanguage(lang: string): Promise<void>;
```

### tRPC Router (admin-only, used by SiteLock management post-install)

```typescript
export const installRouter = router({
  status: publicProcedure.query(() => ({ installed: boolean, lockedAt?: Date })),
  // No procedures exposed for re-running the wizard. Reset requires DB-level intervention.
});
```

## Wizard Flow Diagram

```
[/]
  └─(not installed)─> [/install] (Step 1: License)
                           │ POST agreeLicense
                           ▼
                      [/install/check-env] (Step 2: Diagnostics)
                           │ runEnvDiagnostics() (server action, no nav)
                           │ click "Next" if all ok
                           ▼
                      [/install/db-config] (Step 3: DB)
                           │ POST validateDbConfig
                           ▼ (encrypted in session)
                      [/install/admin-config] (Step 4: Admin)
                           │ POST performInstall
                           │   - acquire pg_advisory_lock
                           │   - prisma migrate deploy
                           │   - seed Site, MemberGroup, User
                           │   - write INSTALL_LOCK
                           │   - sign Auth.js session
                           ▼
                      [/install/complete] -> [/admin/welcome]
```

## Security Considerations

- **Session encryption**: Wizard session cookie encrypted with `NEXTAUTH_SECRET`-derived key (HKDF). Cookie scope `/install`, `Secure`, `HttpOnly`, `SameSite=Strict`.
- **DB credential lifetime**: DB password lives in session cookie max 60 minutes; cleared immediately after successful `procInstall`.
- **CSRF**: Double-submit cookie token on every form post.
- **Brute-force on admin password creation**: Rate-limit `performInstall` to 3 attempts per IP per hour.
- **Logging hygiene**: All log emitters MUST go through a redactor that strips `password`, `pass`, `secret` keys.
- **Advisory lock**: `pg_advisory_lock(hashtext('rhymix_ts_install'))` prevents race during install.
- **No re-install**: Once `INSTALL_LOCK=1`, the wizard returns 410 even if the env var is later removed; the `Site.installedAt` timestamp is the authoritative gate.

## Mapping from Rhymix v2.1.32 (Reference)

| Rhymix Concept | Rhymix-TS Equivalent | Notes |
|---|---|---|
| `files/env/license_agreement` flag file | `installSession.licenseAgreed` | In-memory only |
| `files/config/config.php` | `.env.local` + `Site` table | Hybrid: secrets in env, business config in DB |
| `installController::procDBConfig` | `validateDbConfig` server action | Same validations + Postgres-specific |
| `installController::procInstall` | `performInstall` server action | Wraps Prisma migrate + seed in transaction |
| `Context::isInstalled()` | `await getSite().then(s => s?.installedAt != null)` | DB-backed, cached per-request |
| `db_prefix` (rx_) | not applicable | Prisma generates schema-namespaced models |
| `use_sitelock` | `SiteSetting.sitelock_enabled` + `sitelock_allowlist` | Same UX |
| `use_ssl` (always/none) | `Site.scheme` + middleware HSTS | Same UX |
| 13-language wizard | next-intl (ko, en, ja, zh-CN, zh-TW, de, es, fr, mn, ru, tr, vi, id) | Reuse Rhymix lang keys for parity |
| `mod_rewrite` AJAX check | middleware ping (`HEAD /install/_rewrite_test/{nonce}`) | Verifies Next.js rewrite chain |

## Out of Scope

- **Migration from existing Rhymix MySQL DB** → SPEC-MIGRATE-001 (deferred). Only the optional hook (REQ-INSTALL-043) reserves the integration point.
- **Multi-tenant install** (creating multiple `Site` rows during initial install) → SPEC-ADMIN-001 covers post-install multi-domain setup.
- **Cluster install** (multiple Next.js instances bootstrapping shared DB) → handled implicitly by advisory lock; no special UX.
- **Headless/CLI install** (`pnpm rhymix install --config=...`) → optional future story.
- **Update wizard** (running migrations on version bump) → SPEC-OPS-001 (deferred).

## Open Questions

1. **Cloud lock fallback strategy**: REQ-INSTALL-042 proposes a DB-row-based lock when `.env.local` writes are forbidden. Should we always prefer the DB-row strategy for consistency, or keep file-based as default for self-hosted?
2. **Rate-limit storage**: REQ-INSTALL-053 advisory lock + REQ-INSTALL-054 disposable email check both need a low-cardinality store. Use the same Postgres table or introduce Redis already at install time?
3. **Two-step admin verification**: Should the wizard require email verification of the admin email before completing install (delays bootstrap by SMTP roundtrip) or accept post-install verification?
4. **Rollback on failure**: REQ-INSTALL-015 specifies full rollback. Should we keep partial migration progress for debugging (with explicit `--keep-failed` flag) or always wipe?
5. **i18n parity strategy**: Reuse Rhymix lang/install/lang.php keys verbatim for translation memory, or rewrite from scratch with Crowdin-friendly keys?
6. **First-run telemetry**: Send anonymized install completion event (version, OS, Node version) to a Rhymix-TS telemetry endpoint with explicit opt-in?

## Dependencies & Risks

### Depends on

- **SPEC-AUTH-001**: User model, Argon2id password hashing, MemberGroup model
- **SPEC-ADMIN-001**: Site, Domain, ModuleInstance models (this SPEC seeds the Site)
- **SPEC-THEME-001**: Default theme to assign to fresh Site

### Blocks

- All other SPECs at runtime: a non-installed instance has no usable surface.

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Operator misconfigures `DATABASE_URL` after install, breaking access | High | Show DATABASE_URL fingerprint (last 4 chars) on `/admin/system` for sanity check |
| Cloud platform resets `.env.local` between deploys, removing INSTALL_LOCK | Critical | Use DB-row-based lock by default on Vercel/Railway (REQ-INSTALL-042) |
| Migration partial failure leaves orphaned tables | High | Use single transaction OR wrap each migration in savepoint with cleanup script |
| Operator loses admin password during wizard (browser crash) | Medium | Provide CLI tool `pnpm rhymix admin reset-password` as recovery path |
| Multiple deploys racing on first install | Critical | `pg_advisory_lock` (REQ-INSTALL-053) |
| Wizard session token theft via XSS during install | Critical | `Secure`, `HttpOnly`, `SameSite=Strict`; CSP `default-src 'self'` enforced from step 1 |
| Disposable email bypass | Low | Allow operator to override in dev; production-only enforcement |

### Performance Targets

- License page TTFB < 200ms (no DB calls)
- Env diagnostics complete < 5s p95
- DB validation < 3s p95
- Full `procInstall` (migrate + seed) < 30s p95 on a fresh schema

### Security Targets

- OWASP ASVS Level 2 for installer surface
- All wizard inputs validated with Zod at server action boundary
- DB credentials never written to disk in plaintext during wizard

## Traceability

| REQ | AC | Test Strategy |
|---|---|---|
| REQ-INSTALL-001, 020 | AC-INSTALL-001 | Playwright: fresh DB → expect redirect |
| REQ-INSTALL-013 | AC-INSTALL-002, 003 | Vitest: validateDbConfig with mock pg client |
| REQ-INSTALL-014, 015 | AC-INSTALL-004 | Integration: real Postgres + intentional migration failure |
| REQ-INSTALL-016 | AC-INSTALL-008 | Playwright: post-install homepage renders index module (not "No index module configured"); Integration: assert `Domain.indexModuleInstanceId` set to board instance |
| REQ-INSTALL-017 | AC-INSTALL-009 | Playwright: `/admin/menu` shows seeded menu; Integration: assert `Menu`/`MenuItem` rows + `Domain.defaultMenuId` set |
| REQ-INSTALL-018 | AC-INSTALL-010, 011 | Integration: `seed_sample_content` true → `Board` rows + sample `Document` per board/notice; false → zero sample docs but index+menu still set; Playwright: welcome post visible on fresh site |
| REQ-INSTALL-023 | AC-INSTALL-005 | Playwright: post-install navigation to /install |
| REQ-INSTALL-024 | AC-INSTALL-006 | Integration: middleware test with simulated IPs |
| REQ-INSTALL-053 | AC-INSTALL-007 | Concurrent integration test with two HTTP clients |
