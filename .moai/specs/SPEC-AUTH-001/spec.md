---
id: SPEC-AUTH-001
title: Authentication & Member System
status: draft
priority: P0
created: 2026-05-10
domain: auth
related: [SPEC-CONTENT-001, SPEC-ADMIN-001]
---

# SPEC-AUTH-001: Authentication & Member System

## Overview

Rhymix CMS의 핵심 회원·인증 시스템을 Next.js 16(App Router)와 PostgreSQL/Prisma 기반으로 그린필드 재설계한다. 기존 PHP Rhymix의 16개 회원 관련 테이블이 가진 도메인 지식(다중 식별자 로그인, 그룹 권한, 자동로그인, 디바이스 추적, 이메일 인증, 가입 폼 커스터마이징, 차단 목록, IP 기반 레이트 리미팅)을 보존하면서, Auth.js v5의 Credentials Provider와 tRPC + Server Actions 하이브리드 API 레이어로 현대화한다. 본 SPEC은 회원가입부터 탈퇴까지의 전체 라이프사이클, 관리자 회원/그룹 관리, 감사 로그, 그리고 향후 OAuth/SMS/SSO 확장을 위한 안정적인 기반을 정의한다.

## User Stories

### US-AUTH-001: 신규 회원 가입
일반 사용자로서, 사이트가 요구하는 가입 폼(필수/선택 필드)을 채워 회원가입을 신청할 수 있다. 사이트 정책에 따라 즉시 활성화되거나 이메일 인증 또는 관리자 승인을 거쳐야 한다.

### US-AUTH-002: 다중 식별자 로그인
회원으로서, 사이트 설정에 따라 user_id, email, phone_number 중 허용된 식별자로 로그인할 수 있다. 비밀번호가 구버전 해시인 경우 로그인 성공 시 자동으로 Argon2id로 재해싱된다.

### US-AUTH-003: 이메일 인증
가입자로서, 가입 직후 발송된 이메일의 인증 링크를 클릭해 계정을 활성화할 수 있다. 인증 토큰은 만료 시간이 있고 1회만 사용 가능하다.

### US-AUTH-004: 비밀번호 재설정
회원으로서, 등록된 이메일로 비밀번호 재설정 링크를 요청하고, 토큰 검증 후 새 비밀번호를 설정할 수 있다.

### US-AUTH-005: 자동 로그인
회원으로서, "로그인 유지" 옵션을 선택하면 안전한 쿠키와 디바이스 기록을 통해 다음 방문 시 자동으로 로그인될 수 있다. 디바이스/IP가 변경되면 보안상 거부된다.

### US-AUTH-006: 프로필 편집
회원으로서, 닉네임, 전화번호, 추가 정보(extra_vars)를 수정할 수 있고, 비밀번호 변경 시 현재 비밀번호 확인이 필요하다.

### US-AUTH-007: 계정 정지/거부 처리
관리자로서, 특정 회원을 정지(SUSPENDED)·거부(DENIED)·소프트 삭제(DELETED) 상태로 변경하면 즉시 모든 세션이 무효화되고 로그인이 차단된다.

### US-AUTH-008: 그룹 권한 관리
관리자로서, 회원 그룹을 생성하고 회원을 그룹에 할당하여 권한을 위임할 수 있다. is_admin 그룹에 속한 회원은 관리자 권한을 가진다.

### US-AUTH-009: 가입 폼 커스터마이징
관리자로서, 사이트별 회원가입 폼의 필드 노출/필수 여부/순서를 설정할 수 있다.

### US-AUTH-010: 차단 목록 관리
관리자로서, 특정 user_id 패턴이나 nickname을 차단 목록에 추가하여 향후 가입 및 변경을 막을 수 있다.

### US-AUTH-011: 레이트 리미팅·브루트포스 방어
시스템으로서, 동일 IP의 로그인 실패 횟수가 임계값을 초과하면 일정 시간 동안 추가 로그인 시도를 거부한다.

### US-AUTH-012: 개인정보 내보내기
회원으로서, GDPR 준수 차원에서 본인의 모든 데이터를 JSON 형식으로 내보낼 수 있다.

## EARS Requirements

### Ubiquitous Requirements

- **REQ-AUTH-001**: The system shall store all member passwords using Argon2id hashing with configurable work factor (default: memory=64MB, iterations=3, parallelism=4).
- **REQ-AUTH-002**: The system shall use citext (case-insensitive text) for `user_id` and `email_address` columns to prevent duplicate accounts differing only in case.
- **REQ-AUTH-003**: The system shall persist all authentication-related timestamps as `timestamptz` in UTC.
- **REQ-AUTH-004**: The system shall record an audit log entry for every state-changing auth event (signup, login, logout, password change, status change, deletion).
- **REQ-AUTH-005**: The system shall never expose `password`, `security_key`, or `auth_key` fields in any tRPC procedure output, Server Action response, or API route response.
- **REQ-AUTH-006**: The system shall validate all user inputs with Zod schemas at the API boundary before reaching the persistence layer.

### Event-Driven Requirements

- **REQ-AUTH-010**: When a user submits the signup form, the system shall validate uniqueness of `user_id`, `email_address`, and `phone_number` (where applicable) before creating the member record.
- **REQ-AUTH-011**: When `enable_confirm` is true and a user completes signup, the system shall create a member with `status = UNAUTHED`, generate an `EmailAuthToken` of type `SIGNUP`, and dispatch a verification email.
- **REQ-AUTH-012**: When a user clicks a valid signup verification link before expiry, the system shall transition the member's `status` from `UNAUTHED` to `APPROVED` and invalidate the token.
- **REQ-AUTH-013**: When a user submits valid credentials, the system shall create a session via Auth.js v5, update `last_login_ip` and `last_login_at`, and reset the IP-based failure counter for that IP.
- **REQ-AUTH-014**: When a user successfully logs in and their stored password hash uses an outdated algorithm or below the current work factor, the system shall transparently rehash the password with the current Argon2id parameters and persist the new hash.
- **REQ-AUTH-015**: When a user submits invalid credentials, the system shall increment the `LoginAttempt` counter for the request IP and return a generic "invalid credentials" error without disclosing whether the identifier or password was wrong.
- **REQ-AUTH-016**: When a user requests a password reset, the system shall generate an `EmailAuthToken` of type `PASSWORD_RESET` with a 1-hour expiry and send a reset link to the registered email.
- **REQ-AUTH-017**: When a user submits the password reset form with a valid token and new password, the system shall update the password hash, invalidate all existing sessions and autologin entries for that member, and mark the token as consumed.
- **REQ-AUTH-018**: When a user enables "remember me" at login, the system shall create an `AutoLogin` record with a fresh `security_key`, `previous_key = null`, and current device fingerprint (IP, user-agent, device id).
- **REQ-AUTH-019**: When a returning visitor presents a valid autologin cookie, the system shall verify the `security_key`, rotate it (move current to `previous_key`, generate new `security_key`), update the device record, and establish a session.
- **REQ-AUTH-020**: When an admin changes a member's `status` to `SUSPENDED`, `DENIED`, or `DELETED`, the system shall invalidate all active sessions and autologin records for that member.
- **REQ-AUTH-021**: When an admin deletes a member, the system shall perform a soft delete (`status = DELETED`, anonymize PII fields) and retain the row for audit-trail integrity for a configurable retention period (default 90 days) before hard deletion.

### State-Driven Requirements

- **REQ-AUTH-030**: While a member's `status` is `UNAUTHED`, the system shall reject login attempts with a "verify your email" error and offer a resend-verification action.
- **REQ-AUTH-031**: While a member's `status` is `SUSPENDED` or `DENIED`, the system shall reject login attempts. (Note: 2026-05-10 amendment — status-specific 메시지 요구는 REQ-AUTH-051(정보 누출 방지) 우선 정책에 의해 무효화됨. 응답은 INVALID_CREDENTIALS로 통일된다. Slice C 구현 일치.)
- **REQ-AUTH-032**: While `password_force_change_after_days` is configured and a member's password is older than the configured threshold, the system shall require password change on next login before granting full access.
- **REQ-AUTH-033**: While the count of failed `LoginAttempt` records for an IP within the configured window exceeds `max_error_count`, the system shall reject all further login attempts from that IP until the window expires.
- **REQ-AUTH-034**: While a member belongs to a group with `is_admin = true` OR has `is_admin = true` directly, the system shall grant administrator privileges.

### Optional Requirements

- **REQ-AUTH-040**: Where the site configuration enables phone number login, the system shall accept E.164 formatted phone numbers as a valid login identifier.
- **REQ-AUTH-041**: Where the password policy is set to `strong` or `very_strong`, the system shall enforce additional complexity rules (length, character classes, common-password blocklist) at signup and password change.
- **REQ-AUTH-042**: Where 2FA hooks are configured for the future SPEC, the system shall expose extension points in the login flow for a second-factor challenge step without changing the public API contract.
- **REQ-AUTH-043**: Where multi-device tracking is enabled, the system shall record each unique (member, device-fingerprint) tuple in `MemberDevice` with first-seen and last-seen timestamps.

### Unwanted Behavior Requirements

- **REQ-AUTH-050**: The system shall not store passwords in plaintext, reversible encryption, or unsalted hashes under any circumstance.
- **REQ-AUTH-051**: The system shall not reveal in any public response whether a given user_id or email exists (uniform error messages for login, password-reset request, signup).
- **REQ-AUTH-052**: The system shall not permit signup with `user_id` or `nick_name` values present in the `DeniedIdentifier` table.
- **REQ-AUTH-053**: If an autologin cookie presents a `security_key` that does not match the latest `security_key` AND does not match `previous_key`, the system shall delete the autologin record entirely and force a fresh login (token-theft response).
- **REQ-AUTH-054**: The system shall not allow a member to demote the last remaining admin in the system below admin privileges.
- **REQ-AUTH-055**: The system shall not log password values, full session tokens, or autologin secrets in application logs.

## Acceptance Criteria

### AC-AUTH-010 (REQ-AUTH-010 신규 가입 중복 검증)
- **Given** 데이터베이스에 user_id="alice"인 회원이 이미 존재하고
- **When** 새 사용자가 user_id="ALICE"로 가입을 시도하면
- **Then** citext 컬럼 비교로 중복이 감지되어 "이미 사용 중인 아이디입니다" 에러가 반환된다

### AC-AUTH-011 (REQ-AUTH-011 이메일 인증 발송)
- **Given** site config의 `enable_confirm = true`이고
- **When** 사용자가 유효한 정보로 가입을 완료하면
- **Then** 회원 레코드가 status=UNAUTHED로 생성되고, EmailAuthToken(type=SIGNUP, expiresAt=now+24h)이 생성되며, 인증 메일이 발송 큐에 들어간다

### AC-AUTH-012 (REQ-AUTH-012 인증 링크 클릭)
- **Given** 만료되지 않은 SIGNUP 토큰이 존재하고
- **When** 사용자가 인증 링크를 클릭하면
- **Then** 회원 status가 APPROVED로 변경되고 토큰의 consumedAt이 설정되며 환영 페이지로 리다이렉트된다

### AC-AUTH-013 (REQ-AUTH-013 정상 로그인)
- **Given** APPROVED 상태의 회원이 존재하고
- **When** 올바른 자격증명으로 로그인하면
- **Then** Auth.js 세션이 생성되고, member.last_login_at/last_login_ip가 갱신되며, 해당 IP의 LoginAttempt 카운터가 0으로 초기화된다

### AC-AUTH-014 (REQ-AUTH-014 자동 비밀번호 업그레이드)
- **Given** 회원의 비밀번호가 bcrypt 해시로 저장되어 있고
- **When** 올바른 평문 비밀번호로 로그인에 성공하면
- **Then** 검증 후 Argon2id로 재해싱되어 password 컬럼이 업데이트되고 알고리즘 메타데이터가 기록된다

### AC-AUTH-015 (REQ-AUTH-015 실패 로그인 일관 응답)
- **Given** 존재하지 않는 user_id "bob"로 로그인 시도와 존재하는 "alice"의 잘못된 비밀번호로 시도가 있고
- **When** 두 케이스 모두 실행하면
- **Then** 동일한 "Invalid credentials" 응답과 유사한 응답 시간이 반환되고, 두 IP 모두 LoginAttempt가 +1 증가한다

### AC-AUTH-017 (REQ-AUTH-017 비밀번호 재설정 완료)
- **Given** 유효한 PASSWORD_RESET 토큰이 있고 회원에 active session 2개와 autologin 1개가 있고
- **When** 새 비밀번호로 재설정을 완료하면
- **Then** 비밀번호가 갱신되고, 모든 세션과 모든 autologin이 삭제되며, 토큰이 consumed로 마킹된다

### AC-AUTH-019 (REQ-AUTH-019 자동로그인 키 회전)
- **Given** AutoLogin{security_key=K1, previous_key=null}이 존재하고
- **When** 쿠키 K1으로 자동로그인이 성공하면
- **Then** 레코드가 {security_key=K2, previous_key=K1}으로 갱신되고 device 정보(IP, UA)가 업데이트되며 세션이 생성된다

### AC-AUTH-020 (REQ-AUTH-020 정지 시 세션 무효화)
- **Given** APPROVED 회원이 active session 3개를 가지고 있고
- **When** 관리자가 status를 SUSPENDED로 변경하면
- **Then** 해당 회원의 모든 session, autologin 레코드가 즉시 삭제되고 다음 요청부터 로그인 페이지로 리다이렉트된다

### AC-AUTH-031 (REQ-AUTH-031 정지 회원 로그인 차단)
- **Given** member.status = SUSPENDED인 회원이 있고
- **When** 올바른 자격증명으로 로그인을 시도하면
- **Then** 시스템은 INVALID_CREDENTIALS로 통일된 에러 응답을 반환한다 (REQ-AUTH-051 우선)
- Note: REQ-AUTH-031의 status-specific 메시지 요구는 REQ-AUTH-051(정보 누출 방지) 우선 정책에 의해 무효화됨. 2026-05-10 amendment, Slice C 구현 일치.

### AC-AUTH-033 (REQ-AUTH-033 IP 레이트리미팅)
- **Given** site config의 max_error_count=5, window=10min이고 같은 IP에서 5회 실패가 누적되었고
- **When** 6번째 로그인 시도가 발생하면
- **Then** 자격증명 검증 없이 "잠시 후 다시 시도하세요" 응답이 반환되고 차단 해제 시각이 헤더에 포함된다

### AC-AUTH-034 (REQ-AUTH-034 그룹 기반 관리자 권한)
- **Given** member.is_admin=false이지만 is_admin=true인 group에 속해 있고
- **When** 관리자 전용 페이지에 접근하면
- **Then** 권한 체크가 통과되고 페이지가 정상 렌더링된다

### AC-AUTH-052 (REQ-AUTH-052 차단 식별자 가입 거부)
- **Given** DeniedIdentifier에 user_id="admin"이 등록되어 있고
- **When** 신규 사용자가 user_id="admin"으로 가입을 시도하면
- **Then** "사용할 수 없는 아이디입니다" 에러가 반환되고 회원 레코드는 생성되지 않는다

### AC-AUTH-053 (REQ-AUTH-053 토큰 도용 탐지)
- **Given** AutoLogin{security_key=K2, previous_key=K1}이 존재하고
- **When** 공격자가 도용한 K1보다 더 이전 키 K0를 쿠키로 제시하면
- **Then** AutoLogin 레코드가 즉시 삭제되고 회원의 모든 세션이 무효화되며 보안 알림 이메일이 발송된다

### AC-AUTH-054 (REQ-AUTH-054 마지막 관리자 보호)
- **Given** 시스템에 is_admin=true인 회원이 1명만 남아있고
- **When** 그 회원의 is_admin을 false로 변경하려 시도하면
- **Then** "마지막 관리자는 권한을 해제할 수 없습니다" 에러가 반환되고 변경은 거부된다

## Domain Model

Prisma 스키마 스케치 (PostgreSQL, citext extension 사용):

```prisma
// schema.prisma (excerpt)

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [citext, pgcrypto]
}

enum MemberStatus {
  APPROVED
  UNAUTHED
  DENIED
  SUSPENDED
  DELETED
}

enum EmailAuthTokenType {
  SIGNUP
  PASSWORD_RESET
  EMAIL_CHANGE
}

enum DeniedIdentifierKind {
  USER_ID
  NICK_NAME
}

enum LoginAttemptResult {
  SUCCESS
  INVALID_CREDENTIALS
  STATUS_BLOCKED
  RATE_LIMITED
}

enum PasswordPolicyLevel {
  NORMAL
  STRONG
  VERY_STRONG
}

model User {
  id              String       @id @default(cuid())
  userId          String       @unique @db.Citext      // login identifier
  email           String       @unique @db.Citext
  phoneNumber     String?      @unique
  phoneCountry    String?      // ISO 3166-1 alpha-2
  password        String       // Argon2id encoded hash including params
  passwordAlgo    String       @default("argon2id")
  passwordChangedAt DateTime   @default(now()) @db.Timestamptz
  userName        String
  nickName        String       @db.Citext
  status          MemberStatus @default(UNAUTHED)
  isAdmin         Boolean      @default(false)
  denied          Boolean      @default(false)        // legacy denied flag
  regdate         DateTime     @default(now()) @db.Timestamptz
  lastLoginAt     DateTime?    @db.Timestamptz
  lastLoginIp     String?
  extraVars       Json         @default("{}") @db.JsonB
  deletedAt       DateTime?    @db.Timestamptz

  groups          MemberGroupMember[]
  autoLogins      AutoLogin[]
  emailTokens    EmailAuthToken[]
  devices         MemberDevice[]
  agreements      MemberAgreement[]

  @@index([status])
  @@index([regdate])
  @@map("users")
}

model MemberGroup {
  id          String   @id @default(cuid())
  siteSrl     Int      @default(0)              // multi-site support
  title       String
  isDefault   Boolean  @default(false)
  isAdmin     Boolean  @default(false)
  imageMark   String?
  listOrder   Int      @default(0)
  createdAt   DateTime @default(now()) @db.Timestamptz

  members     MemberGroupMember[]

  @@unique([siteSrl, title])
  @@map("member_groups")
}

model MemberGroupMember {
  userId    String
  groupId   String
  joinedAt  DateTime @default(now()) @db.Timestamptz

  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  group     MemberGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([userId, groupId])
  @@index([groupId])
  @@map("member_group_members")
}

model AutoLogin {
  id           String   @id @default(cuid())
  userId       String
  securityKey  String   @unique
  previousKey  String?  @unique
  ip           String
  userAgent    String   @db.Text
  deviceId     String?
  createdAt    DateTime @default(now()) @db.Timestamptz
  lastUsedAt   DateTime @default(now()) @db.Timestamptz
  expiresAt    DateTime @db.Timestamptz

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("auto_logins")
}

model EmailAuthToken {
  id           String              @id @default(cuid())
  userId       String
  authKey      String              @unique
  authType     EmailAuthTokenType
  payload      Json?               @db.JsonB     // e.g., new email for EMAIL_CHANGE
  createdAt    DateTime            @default(now()) @db.Timestamptz
  expiresAt    DateTime            @db.Timestamptz
  consumedAt   DateTime?           @db.Timestamptz

  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, authType])
  @@index([expiresAt])
  @@map("email_auth_tokens")
}

model MemberDevice {
  id            String   @id @default(cuid())
  userId        String
  deviceId      String   // hashed fingerprint
  ip            String
  userAgent     String   @db.Text
  firstSeenAt   DateTime @default(now()) @db.Timestamptz
  lastSeenAt    DateTime @default(now()) @db.Timestamptz
  trusted       Boolean  @default(false)

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, deviceId])
  @@index([userId])
  @@map("member_devices")
}

model JoinFormField {
  id            String   @id @default(cuid())
  siteSrl       Int      @default(0)
  fieldName     String
  fieldType     String   // text, email, select, etc.
  label         String
  required      Boolean  @default(false)
  visible       Boolean  @default(true)
  order         Int      @default(0)
  options       Json?    @db.JsonB

  @@unique([siteSrl, fieldName])
  @@map("join_form_fields")
}

model MemberAgreement {
  id            String   @id @default(cuid())
  userId        String
  agreementKey  String   // tos, privacy, marketing
  version       String
  agreedAt      DateTime @default(now()) @db.Timestamptz
  ip            String

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, agreementKey])
  @@map("member_agreements")
}

model LoginAttempt {
  id          String              @id @default(cuid())
  ip          String
  identifier  String?             // attempted user_id/email (hashed for privacy)
  result      LoginAttemptResult
  createdAt   DateTime            @default(now()) @db.Timestamptz

  @@index([ip, createdAt])
  @@index([createdAt])             // for window-based pruning
  @@map("login_attempts")
}

model DeniedIdentifier {
  id        String                 @id @default(cuid())
  kind      DeniedIdentifierKind
  pattern   String   @db.Citext    // exact match or glob, see app logic
  reason    String?
  createdBy String?
  createdAt DateTime @default(now()) @db.Timestamptz

  @@unique([kind, pattern])
  @@map("denied_identifiers")
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?  // null for anonymous/system
  targetId   String?
  action     String   // SIGNUP, LOGIN, PWD_CHANGE, STATUS_CHANGE, ...
  metadata   Json     @default("{}") @db.JsonB
  ip         String?
  userAgent  String?  @db.Text
  createdAt  DateTime @default(now()) @db.Timestamptz

  @@index([actorId, createdAt])
  @@index([targetId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

설계 노트:
- `extra_vars` JSONB는 Rhymix의 동적 회원 필드를 그대로 보존하면서 PostgreSQL의 GIN 인덱스로 쿼리 가능.
- 비밀번호 컬럼은 Argon2id encoded string (`$argon2id$v=19$m=...,t=...,p=...$salt$hash`)로 저장하여 파라미터 메타데이터까지 포함.
- citext 확장으로 user_id/email/nickname 케이스 비교를 DB 레벨에서 처리.
- `LoginAttempt`는 시간 기반 파티셔닝을 향후 적용할 수 있도록 created_at 인덱스를 분리.

## API Surface

### tRPC Router: `auth`

```ts
// server/api/routers/auth.ts (sketch)
export const authRouter = router({
  // ── Signup ──────────────────────────────
  signup: publicProcedure
    .input(SignupInput)              // { userId, email, password, nickName, phone?, extraVars?, agreements[] }
    .output(SignupOutput)            // { userId: string, status: MemberStatus, requiresEmailVerification: boolean }
    .mutation(...),

  resendVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .output(z.object({ status: z.nativeEnum(MemberStatus) }))
    .mutation(...),

  // ── Password ────────────────────────────
  requestPasswordReset: publicProcedure
    .input(z.object({ identifier: z.string() }))
    .output(z.object({ ok: z.literal(true) }))           // always ok (REQ-AUTH-051)
    .mutation(...),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  // ── Profile ─────────────────────────────
  me: protectedProcedure
    .output(MeOutput)                // sanitized user + groups + flags
    .query(...),

  updateProfile: protectedProcedure
    .input(UpdateProfileInput)
    .output(MeOutput)
    .mutation(...),

  exportMyData: protectedProcedure
    .output(z.object({ url: z.string().url(), expiresAt: z.string() }))
    .mutation(...),                  // GDPR export → signed URL

  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  // ── Sessions / Devices ──────────────────
  listDevices: protectedProcedure
    .output(z.array(DeviceDto))
    .query(...),

  revokeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  // ── Admin ───────────────────────────────
  adminListUsers: adminProcedure
    .input(AdminUserFilter)
    .output(z.object({ items: z.array(AdminUserDto), total: z.number() }))
    .query(...),

  adminUpdateStatus: adminProcedure
    .input(z.object({ userId: z.string(), status: z.nativeEnum(MemberStatus), reason: z.string().optional() }))
    .output(AdminUserDto)
    .mutation(...),

  adminAssignGroup: adminProcedure
    .input(z.object({ userId: z.string(), groupId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  adminRemoveGroup: adminProcedure
    .input(z.object({ userId: z.string(), groupId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(...),

  // ── Groups ──────────────────────────────
  adminListGroups: adminProcedure
    .output(z.array(GroupDto)).query(...),
  adminCreateGroup: adminProcedure
    .input(GroupCreateInput).output(GroupDto).mutation(...),
  adminUpdateGroup: adminProcedure
    .input(GroupUpdateInput).output(GroupDto).mutation(...),
  adminDeleteGroup: adminProcedure
    .input(z.object({ id: z.string() })).output(z.object({ ok: z.literal(true) })).mutation(...),

  // ── Denied identifiers ──────────────────
  adminListDenied: adminProcedure.output(z.array(DeniedDto)).query(...),
  adminAddDenied: adminProcedure.input(DeniedInput).output(DeniedDto).mutation(...),
  adminRemoveDenied: adminProcedure.input(z.object({ id: z.string() })).output(z.object({ ok: z.literal(true) })).mutation(...),

  // ── Join form ───────────────────────────
  adminGetJoinForm: adminProcedure.input(z.object({ siteSrl: z.number().default(0) })).output(z.array(JoinFieldDto)).query(...),
  adminUpdateJoinForm: adminProcedure.input(JoinFormUpdateInput).output(z.object({ ok: z.literal(true) })).mutation(...),
});
```

### Server Actions

브라우저에서 직접 호출 가능한 form-action 형태로 노출:

- `loginAction(prevState, formData)` — Auth.js Credentials Provider 래퍼. 실패 시 `useActionState` 호환 에러 객체 반환.
- `logoutAction()` — 현재 세션 + 해당 세션의 autologin 1건 삭제.
- `signupAction(prevState, formData)` — `auth.signup` mutation 래퍼 + 자동 로그인 또는 verification 안내 페이지로 redirect.
- `requestPasswordResetAction(formData)` — 항상 동일 응답 반환 (정보 누설 방지).
- `submitPasswordResetAction(prevState, formData)` — 토큰 + 새 비밀번호 처리, 성공 시 `/login`으로 redirect.
- `revokeDeviceAction(deviceId)` — 디바이스 폐기 (form-based fallback).

### Auth.js v5 Configuration

```ts
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 14 }, // 14d sliding
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: { identifier: {}, password: {}, remember: {} },
      async authorize(creds, req) {
        return await authenticateMember(creds, requestContext(req));
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) { /* attach groups, isAdmin */ },
    async signIn({ user }) { /* status check, last_login update */ },
  },
  events: {
    signIn: writeAudit("LOGIN"),
    signOut: writeAudit("LOGOUT"),
  },
  pages: { signIn: "/login", error: "/login" },
});
```

## Out of Scope

본 SPEC에서는 다음 항목을 다루지 않으며, 후속 SPEC에서 확장:

- **OAuth 소셜 로그인** (Google, Kakao, GitHub 등) — 향후 `SPEC-AUTH-002`로 분리.
- **SMS 기반 휴대폰 인증** — Twilio/NHN 연동, 향후 `SPEC-AUTH-003`.
- **TOTP/WebAuthn 2차 인증** — `REQ-AUTH-042`의 hook만 정의, 구현은 `SPEC-AUTH-004`.
- **SSO/SAML/OIDC Provider 모드** (Rhymix를 IdP로 노출) — `SPEC-AUTH-005`.
- **CAPTCHA 통합** — 회원가입 봇 차단, `SPEC-SECURITY-001`에서 다룸.
- **이메일 발송 인프라 자체** (SMTP, SES, Resend 선택) — `SPEC-INFRA-001`.
- **결제 연동 회원 등급 (paid membership)** — `SPEC-BILLING-001`.

## Open Questions

1. **Session 전략**: Auth.js `database` 세션 vs `jwt` 세션 — 즉시 무효화(REQ-AUTH-020) 요구 때문에 database가 유리하지만, edge runtime 비용을 고려해 hybrid가 필요한지 결정 필요.
2. **AutoLogin 키 회전 주기**: 매 요청마다 회전 vs N분/요청마다 회전 — 보안 vs DB 부하 트레이드오프.
3. **Phone Number 정규화**: E.164 강제 vs 국가별 raw 보존 — `phone_country` 컬럼과의 관계.
4. **소프트 삭제 기간 후 익명화 정책**: 외래키(게시물 등) 보존을 위해 어디까지 익명화하고 어떤 시점에 hard delete를 수행할지.
5. **Multi-site (`site_srl`)**: 단일 인스턴스에서 여러 사이트를 호스팅하는 Rhymix 패턴을 그대로 둘지, 아니면 멀티 테넌시를 별도 SPEC으로 분리할지.
6. **법적 합의서 버전 관리**: `MemberAgreement.version` 변경 시 재합의 강제 워크플로우 — UX 영향 큼.

## Dependencies & Risks

### Dependencies

- **PostgreSQL 16+** (citext, pgcrypto 확장 필요).
- **Prisma 5.x** (`previewFeatures = ["postgresqlExtensions"]`).
- **Auth.js v5 (next-auth@beta)** — Credentials Provider, PrismaAdapter.
- **argon2** node 패키지 (네이티브 빌드 필요) 또는 `@node-rs/argon2` (prebuilt) — Vercel/Edge 호환성 확인 필수.
- **Zod 3.23+** — 모든 입력 검증.
- **이메일 발송 서비스**: 별도 SPEC이지만 본 SPEC의 인증 메일 흐름 차단 의존성.
- **Redis (선택)**: LoginAttempt 카운터를 DB 대신 Redis로 이전 시 성능 향상, 그러나 본 SPEC은 PostgreSQL only로 출발.

### Risks

| 리스크 | 영향 | 완화 전략 |
|---|---|---|
| **Argon2 native 의존성** | Vercel Edge Runtime 미지원 | 인증 경로를 Node.js runtime에 고정, edge 배포에서 제외 |
| **citext 인덱스 성능** | 대량 회원에서 LIKE 쿼리 느림 | citext + B-tree + pg_trgm 보조 인덱스 |
| **세션 즉시 무효화 비용** | 매 요청 DB 조회 | adapter level cache + 짧은 TTL in-memory layer |
| **AutoLogin 토큰 도용 false positive** | 정상 사용자 로그아웃 | previous_key grace period + 보안 알림 메일 |
| **레거시 비밀번호 호환성** | 기존 PHP Rhymix 마이그레이션 시 다양한 해시 | `passwordAlgo` 컬럼 + 로그인 시 자동 업그레이드 (REQ-AUTH-014) |
| **GDPR export 대용량** | 다수 게시물/첨부 포함 시 시간 초과 | 비동기 작업 + signed URL 발급 패턴 |
| **마지막 관리자 보호 race condition** | 동시 demote 트랜잭션 | SELECT FOR UPDATE + COUNT 쿼리 |
| **EmailAuthToken 재사용 공격** | 토큰 유출 시 반복 사용 | `consumedAt` 단일 사용 + 짧은 expiry + 발급 시 이전 토큰 무효화 |
| **citext + Prisma 호환성** | preview feature 의존 | Prisma 버전 핀 고정 + 통합 테스트 |
| **회원 16개 테이블 → 11개 모델 매핑 누락** | 도메인 손실 | DDD ANALYZE 단계에서 PHP 원본과 1:1 비교 검증 |

### Performance Targets

- 로그인 P95 < 250ms (Argon2 검증 포함).
- 회원가입 P95 < 400ms (해싱 + 메일 큐잉 포함, 발송 자체는 비동기).
- 자동로그인 검증 P95 < 100ms.
- 관리자 회원 검색 (10만 회원, citext + 부분 일치) P95 < 500ms.

### Security Targets

- OWASP ASVS Level 2 준수.
- Argon2id memory 64MB / iterations 3 / parallelism 4 (서버 사양에 맞게 튜닝).
- 모든 인증 토큰: `crypto.randomBytes(32)` + base64url, 만료 ≤ 24h (signup), ≤ 1h (password reset).
- 비밀번호 정책 default: min 10자 + 영숫자 + 특수문자 1개 이상 (NORMAL 레벨).

---

**Next Steps**: `/moai:2-run SPEC-AUTH-001` 실행하여 DDD 구현 사이클 시작. 우선순위: (1) Prisma schema + migration, (2) Argon2 password module + 단위 테스트, (3) signup/login Server Actions + Auth.js 설정, (4) verification 흐름, (5) admin tRPC 라우터, (6) autologin 회전 로직, (7) audit log + rate limiting.
