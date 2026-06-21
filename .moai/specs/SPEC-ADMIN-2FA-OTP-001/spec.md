---
id: SPEC-ADMIN-2FA-OTP-001
version: 0.2.0
status: draft
created: 2026-06-21
updated: 2026-06-21
author: manager-spec
priority: P1
issue_number: null
---

# SPEC-ADMIN-2FA-OTP-001 — 관리자 2단계 인증(TOTP) 실제 백엔드 구현

## HISTORY

- 2026-06-21 (v0.1.0, draft): 최초 작성. SPEC-TEST-DEBT-001 triage 중 발견한 admin 2FA CRITICAL 우회 취약점 긴급 수정(`b220fd1`) 후, 그 과정에서 드러난 "2FA verify 흐름 전체 미구현 stub" gap을 메우기 위한 신규 구현 SPEC. 게이트·UI 골격·라우트는 이미 존재하므로 제외. research.md 기반 작성, Open Questions 7건은 best-judgment로 confidence와 함께 §6에 확정.
- 2026-06-21 (v0.2.0, draft): plan-audit annotation iteration. 사용자 검토 라운드에서 Q1·Q3 두 결정을 보안 근거로 변경(SPEC-FEED-001/SPEC-NOTIFICATION-001과 동일한 annotation 패턴).
  - **Q1 (세션 플래그 set 메커니즘)**: `useSession().update()` → jwt callback `trigger==='update'` 경로를 **완전히 폐기**하고, **서버측 단기 one-shot 검증 marker를 1차(유일) 메커니즘으로 승격**. 근거: (a) OTP 검증(서버)과 세션 갱신(클라이언트 추가 호출)이 2단계로 쪼개져 중간 실패 시 "OTP 통과·세션 미반영" 불일치 발생, (b) **더 중요**: `trigger==='update'`일 때 jwt callback이 클라이언트가 보낸 페이로드를 신뢰하면 OTP 검증 없이 클라이언트가 직접 `update({twoFactorVerified:true})`로 플래그를 우회할 수 있는 구멍이 생김 — jwt callback은 클라이언트 입력을 신뢰하지 말고 서버측 진실의 소스(marker 스토어)를 직접 조회해야 함. autologin-marker(`packages/auth/src/autologin-marker.ts`)의 in-memory one-shot Map 패턴을 따르며 TTL을 추가. confidence medium → high.
  - **Q3 (시크릿/백업코드 저장)**: (a) 백업코드 해싱을 **SHA-256으로 확정**(Argon2id 옵션 제거 — 백업코드는 이미 고엔트로피 랜덤이라 사전공격 방어용 Argon2id는 불필요한 성능 낭비), (b) AES-256-GCM **IV(nonce) 고유성**을 신규 REQ로 명시(매 연산마다 CSPRNG 고유 IV, 재사용 금지 — GCM은 IV 재사용 시 기밀성·인증 모두 붕괴), (c) **암호화 키 노출 시 강제 재등록 운영 절차**를 신규 REQ로 추가(키 버저닝·무중단 재암호화는 범위 밖, Exclusions에 명시).
  - 영향 REQ: §4.3 verify 흐름(REQ-2OTP-042/046/047 재작성·신설), §4.1 데이터 모델(REQ-2OTP-003/006/007/008 수정·신설). §6 Q1·Q3 본문 교체, §5 Exclusions·§8 Risks 보강. version 0.2.0, status draft 유지(구현 전).

---

> ## 🚨 운영 경고 (READ FIRST)
>
> **이 SPEC이 구현·배포 완료되기 전까지 운영자는 `SiteSetting.requireAdminTwoFactor` 를 절대 `true` 로 설정하면 안 된다.**
>
> 현재 2FA verify 흐름은 stub(`setTimeout` 시뮬레이션)이며, OTP를 어떻게 입력해도 `session.user.twoFactorVerified` 플래그가 set되지 않는다. 따라서 정책을 켜면 게이트(`requireAdmin2FAIfEnabled`)가 모든 `protectedAdminProcedure` 호출에 `FORBIDDEN`을 반환하여 **모든 관리자가 admin 패널에서 영구 lockout** 된다. 이는 fail-closed 설계(커밋 `b220fd1`)의 의도된 결과다. 본 SPEC의 verify 흐름(REQ-2OTP-040~) 구현 완료 후에만 정책 활성화가 안전하다.

---

## 1. Goal / Why

관리자 2FA의 **게이트(정책 확인 + 세션 플래그 확인)는 동작하지만, 그 게이트를 통과시켜줄 실제 OTP 발급/검증 메커니즘이 코드베이스에 전혀 없다** (research.md §2). 즉 TOTP 시크릿 생성·저장, enroll 확정, OTP 검증, verify 통과 시 세션 플래그 set이 모두 미구현 stub이다.

이 SPEC은 그 gap을 채워:
1. 운영자가 `requireAdminTwoFactor`를 켜도 관리자가 실제로 2FA를 등록·통과할 수 있게 하고,
2. 위 운영 경고가 해소되도록 만든다.

## 2. Stakeholders

- **관리자(End User)**: 인증 앱(Google Authenticator 등)으로 TOTP를 등록·검증하는 주체.
- **시스템 관리자(Operator)**: `requireAdminTwoFactor` 정책을 켜는 주체. 본 SPEC 완료가 정책 활성화의 전제.
- **expert-backend (Run phase)**: Prisma 마이그레이션, 시크릿 암호화, TOTP 검증, tRPC 라우터, 세션 플래그 set 구현.
- **expert-frontend (Run phase)**: enroll/verify 페이지의 stub을 실제 mutation 호출로 교체, QR 코드 렌더링.
- **expert-security (Run phase, 권장)**: 시크릿 암호화·백업코드 해싱·세션 플래그 우회 가능성 리뷰.

## 3. 용어

- **TOTP**: Time-based One-Time Password (RFC 6238). 30초 주기 6자리 코드.
- **otpauth URL**: `otpauth://totp/{issuer}:{account}?secret=...&issuer=...` — 인증 앱이 스캔하는 QR의 페이로드.
- **백업 코드**: 인증 앱 분실 시 1회용으로 사용하는 복구 코드.
- **enroll**: 시크릿 발급 → 사용자가 첫 OTP로 소유 증명 → DB 저장(활성화).
- **verify**: 이미 enroll된 사용자가 새 세션에서 OTP로 재인증 → 세션 플래그 set.

---

## 4. 요구사항 (EARS)

### 4.1 데이터 모델 (REQ-2OTP-001 ~ 009)

**REQ-2OTP-001 (Ubiquitous)**: The system SHALL store, per `User`, an encrypted TOTP secret, a `twoFactorEnabled` boolean flag, a `twoFactorConfirmedAt` timestamp, and a set of hashed backup codes. New columns SHALL be added to the `User` model via a single additive Prisma migration.

**REQ-2OTP-002 (Ubiquitous)**: The TOTP secret SHALL be stored encrypted at rest using AES-256-GCM. The plaintext secret SHALL NOT be persisted to the database, logs, or audit records. Each encryption operation SHALL use a unique IV (nonce) per REQ-2OTP-006.

**REQ-2OTP-003 (Unwanted)**: The system SHALL NOT store backup codes in plaintext. Each backup code SHALL be stored only as a SHA-256 one-way hash (optionally salted); verification SHALL compare hashes using a constant-time comparison. Argon2id SHALL NOT be used for backup-code hashing — backup codes are already high-entropy random values, so Argon2id's password-stretching protection is unnecessary and is pure performance cost (research.md §3.1).

**REQ-2OTP-004 (State-Driven)**: WHILE `twoFactorEnabled === false` (or the encrypted secret column is null) for a given admin user, `checkAdmin2FA` SHALL treat that user as **not enrolled** (return `need-enroll` when the site policy requires 2FA), replacing the current `assume enrolled if required` stub (research.md §2.4).

**REQ-2OTP-005 (Unwanted)**: The encryption key for the TOTP secret SHALL be sourced from an environment variable and SHALL NOT be committed to version control. WHEN the key is absent at runtime, the system SHALL fail closed (refuse enroll/verify with a clear error) rather than store an unencrypted secret.

**REQ-2OTP-006 (Ubiquitous)**: Every AES-256-GCM encryption of a TOTP secret SHALL use a fresh IV (nonce) generated by a cryptographically secure random source (e.g. Node `crypto.randomBytes`). An IV SHALL NEVER be reused across encryption operations, because IV reuse under GCM breaks both confidentiality and authenticity. The IV (and the GCM auth tag) SHALL be persisted alongside the ciphertext (same column with a defined layout, or dedicated columns) so the secret can be decrypted for verification.

**REQ-2OTP-008 (Event-Driven)**: WHEN the `TWO_FACTOR_ENC_KEY` is suspected to be compromised, the operator-facing recovery procedure SHALL be: rotate the env key, then force-disable 2FA for every affected user (clear the encrypted secret column, set `twoFactorEnabled = false`, invalidate backup codes) so that all affected admins are required to re-enroll. The SPEC SHALL document this "key compromise → forced re-enrollment" procedure as the minimum required key-rotation response. (Rationale: rotating the key makes all secrets encrypted under the old key undecryptable; forced re-enrollment is the MVP recovery path. Key versioning and zero-downtime re-encryption are out of scope — see §5.)

### 4.2 Enrollment 흐름 (REQ-2OTP-020 ~ 035)

**REQ-2OTP-020 (Event-Driven)**: WHEN an authenticated admin opens `/admin/2fa/enroll`, the system SHALL generate a fresh, cryptographically random TOTP secret and SHALL present its `otpauth://` URL as a scannable QR code AND the base32 secret as a manual-entry fallback. The hardcoded example secret (`JBSWY3DPEHPK3PXP`) SHALL be removed.

**REQ-2OTP-021 (Event-Driven)**: WHEN the admin submits a 6-digit code on the enroll form, the system SHALL invoke a tRPC mutation (replacing the `setTimeout` stub) that verifies the code against the candidate secret using the TOTP algorithm with a ±1 step time window.

**REQ-2OTP-022 (Event-Driven)**: WHEN the submitted enroll code is valid, the system SHALL persist the encrypted secret, set `twoFactorEnabled = true`, set `twoFactorConfirmedAt = now()`, generate and display a one-time set of backup codes, and treat the current session as 2FA-verified (per REQ-2OTP-042).

**REQ-2OTP-023 (Unwanted)**: WHEN the submitted enroll code is invalid, the system SHALL NOT persist any secret and SHALL return a generic validation error without revealing the candidate secret.

**REQ-2OTP-024 (Unwanted)**: The system SHALL NOT allow the enroll candidate secret to be confirmed by a third party. The candidate secret SHALL be bound to the requesting admin's user id for the duration of the enroll attempt (server-derived candidate, not client-supplied).

**REQ-2OTP-025 (Ubiquitous)**: Backup codes SHALL be generated as high-entropy random values, displayed exactly once at enrollment, and SHALL NOT be retrievable again after the enroll page is left.

### 4.3 Verification 흐름 + 세션 플래그 (REQ-2OTP-040 ~ 055)

**REQ-2OTP-040 (Event-Driven)**: WHEN an enrolled admin submits a 6-digit code on `/admin/2fa/verify`, the system SHALL invoke a tRPC mutation that decrypts the stored secret and verifies the code via the TOTP algorithm (±1 step window).

**REQ-2OTP-041 (Event-Driven)**: WHEN the verify code is a valid TOTP code OR a valid unused backup code, the system SHALL mark the current session as 2FA-verified. WHEN a backup code is consumed, that code SHALL be invalidated (single use).

**REQ-2OTP-042 (Event-Driven)**: WHEN a 2FA challenge is successfully passed (enroll-confirm per REQ-2OTP-022 or verify per REQ-2OTP-041), the system SHALL cause `session.user.twoFactorVerified = true` to take effect on the subsequent request via a **server-side one-shot verification marker** (REQ-2OTP-046/047), such that the existing `checkAdmin2FA` gate (which reads exactly this field) subsequently returns `pass`. The mechanism SHALL be compatible with the project's `jwt` session strategy and SHALL NOT bypass the existing `SessionRevocation` enforcement in the jwt callback (research.md §3.3). The client-side `useSession().update()` path SHALL NOT be used; after a successful verify mutation the client simply reloads or navigates, and the next request's jwt callback fills the flag from the server-side marker.

**REQ-2OTP-043 (Unwanted)**: WHEN the verify code is invalid (neither a valid TOTP code nor a valid unused backup code), the system SHALL NOT set the verified flag and SHALL return a generic error. The system SHALL NOT distinguish "wrong TOTP" from "wrong backup code" in the error message.

**REQ-2OTP-044 (State-Driven)**: WHILE the encryption key is present and the secret decrypts successfully, verification SHALL proceed. IF decryption fails (corrupt data or missing key), THEN the system SHALL fail closed (deny verification) and log the failure without exposing secret material.

**REQ-2OTP-045 (Unwanted)**: The verify/enroll tRPC procedures SHALL NOT be gated by `requireAdmin2FAIfEnabled` itself (chicken-and-egg). They SHALL be reachable by an authenticated admin who has NOT yet passed 2FA, but SHALL still require `requireAdmin` (admin session).

**REQ-2OTP-046 (Event-Driven)**: WHEN a verify or enroll-confirm mutation succeeds (REQ-2OTP-041 / REQ-2OTP-022), the server SHALL register a short-lived, single-use verification marker keyed by the admin's user id, following the existing in-memory one-shot pattern of `packages/auth/src/autologin-marker.ts` (process-scoped `Map`, server-generated, never client-supplied). The marker SHALL carry a short TTL (target 60 seconds); a marker older than its TTL SHALL be treated as absent. The marker SHALL be created from server-trusted state only — it SHALL NOT be derivable or settable from any client-supplied payload.

**REQ-2OTP-047 (Event-Driven)**: WHEN the jwt callback runs on a request for an admin whose `token.twoFactorVerified` is not yet set, it SHALL query the server-side marker store directly (NOT any client-supplied session-update payload) and, IF a valid unexpired marker exists for that user id, THEN set `token.twoFactorVerified = true` and immediately consume the marker (one-shot — a second read returns absent). The session callback SHALL copy `token.twoFactorVerified` to `session.user.twoFactorVerified` (same pattern as the RBAC `isAdmin`/`groups` claims, research.md §3.3). The jwt callback SHALL NOT trust any client-provided `{ twoFactorVerified: ... }` value under any trigger.

> **MX 후보**: `@MX:WARN` on the marker store (autologin-marker와 동일하게 process-scoped Map → multi-instance/serverless 비호환, `@MX:REASON` 필수). `@MX:ANCHOR` on the jwt-callback marker-consume branch (fan_in: 모든 admin 요청이 통과하는 보안 경계).

### 4.4 게이트 통합 + 헬퍼 정리 (REQ-2OTP-060 ~ 069)

**REQ-2OTP-060 (Ubiquitous)**: `checkAdmin2FA` SHALL be updated so that step 3 (enrollment check) uses the real `twoFactorEnabled`/secret column instead of the `assume enrolled if required` stub: when 2FA is required AND the user is not enrolled, it returns `need-enroll`; when enrolled but the session is not verified, it returns `need-verify`; otherwise `pass`.

**REQ-2OTP-061 (Ubiquitous)**: The system SHALL consolidate the two overlapping helpers — `apps/web/lib/auth/two-factor.ts` (`isAdminTwoFactorRequired`, `isSessionTwoFactorVerified`) and `packages/admin/src/security/two-factor-gate.ts` (`getSiteAdminTwoFactorPolicy`, `checkAdmin2FA`) — so that there is a single source of truth for policy lookup and session-flag checking. Any retained wrapper SHALL delegate to the canonical implementation rather than duplicate logic.

**REQ-2OTP-062 (Unwanted)**: The consolidation in REQ-2OTP-061 SHALL NOT change the observable contract of `requireAdmin2FAIfEnabled` (still throws `FORBIDDEN` on `need-enroll`/`need-verify`, returns `pass` otherwise) and SHALL NOT regress the security fix from commit `b220fd1` (no hardcoded siteId, `session.user.twoFactorVerified` as the canonical field).

### 4.5 테스트 (REQ-2OTP-080 ~ 089)

**REQ-2OTP-080 (Ubiquitous)**: The TOTP generation/verification, secret encryption/decryption round-trip, backup-code generation/SHA-256-hash/verify, and AES-256-GCM IV-uniqueness (two encryptions of the same plaintext yield distinct IVs, REQ-2OTP-006) SHALL have unit tests, including the ±1 step window boundary and an expired-code negative case.

**REQ-2OTP-083 (Ubiquitous)**: The server-side verification marker (REQ-2OTP-046/047) SHALL have tests covering: one-shot consumption (second read returns absent), TTL expiry (a marker past its TTL is treated as absent), and the rule that the jwt callback sets `token.twoFactorVerified` ONLY from a valid server-side marker and NEVER from a client-supplied session-update payload (REQ-2OTP-047 bypass guard).

**REQ-2OTP-081 (Ubiquitous)**: The enroll and verify tRPC mutations SHALL have tests covering: valid code success, invalid code failure (no persistence / no flag set), backup-code single-use consumption, and the chicken-and-egg access rule (REQ-2OTP-045).

**REQ-2OTP-082 (Ubiquitous)**: `checkAdmin2FA` SHALL have tests covering the full state matrix: (not enrolled / enrolled) × (session verified / not verified) × (policy on / off), confirming `need-enroll` / `need-verify` / `pass` transitions match REQ-2OTP-060.

---

## 5. Exclusions (What NOT to Build)

이 SPEC은 **WHAT/WHY**만 정의한다. 아래는 명시적으로 범위 밖이다:

- **게이트 강제 미들웨어 재구현**: `requireAdmin2FAIfEnabled` (trpc.ts) 및 SiteSetting 정책 저장은 이미 동작 — 다시 만들지 않는다. 본 SPEC은 게이트를 **통과시키는** 메커니즘만 추가한다.
- **enroll/verify 페이지 라우트 골격**: `/admin/2fa/enroll`, `/admin/2fa/verify` 페이지와 폼 컴포넌트는 이미 존재 — stub 내부(`setTimeout`, 하드코딩 시크릿)만 실제 호출로 교체한다.
- **layout 단계 redirect 흐름**: REQ-ADMIN-EXTRAS-041/042의 `/admin/*` → enroll/verify redirect는 별개 enforcement 레이어이며 본 SPEC의 데이터 흐름과 직교 — 본 SPEC은 redirect 정책을 변경하지 않는다.
- **SMS/이메일 OTP, WebAuthn/Passkey, 하드웨어 키**: TOTP(RFC 6238) 단일 방식만 다룬다.
- **"이 기기 N일 기억" 옵션**: REQ-ADMIN-EXTRAS-046이 명시적으로 금지 — 모든 새 세션은 재챌린지. 본 SPEC은 이 금지를 유지한다.
- **일반 사용자(비관리자) 2FA**: 본 SPEC은 admin(`User.isAdmin = true`) 흐름만 다룬다. 단, 추가하는 `User` 컬럼은 향후 일반 사용자 2FA에도 재사용 가능한 형태로 둔다(설계 시 고려하되 일반 사용자 UI/게이트는 구현 안 함).
- **2FA 정책 관리 admin UI**: `requireAdminTwoFactor` 토글 UI는 기존 site settings 영역 소관 — 본 SPEC은 정책을 읽기만 한다.
- **암호화 키 버저닝 / 무중단 재암호화**: 키 노출 대응은 "키 교체 → 영향받는 사용자 강제 재등록"(REQ-2OTP-008) 절차까지만 범위에 포함한다. 다중 키 버전 동시 보관, 백그라운드 무중단 재암호화(re-encryption) 같은 고급 키 로테이션 기능은 본 SPEC 범위 밖이다.
- **클라이언트측 `useSession().update()` 기반 플래그 set**: Q1 변경으로 폐기됨. 세션 플래그는 서버측 one-shot marker(REQ-2OTP-046/047)로만 설정하며, 클라이언트가 세션 갱신 페이로드로 `twoFactorVerified`를 주입하는 경로는 구현하지 않는다(보안상 금지).

---

## 6. Open Questions (best-judgment 확정)

> 본 에이전트는 사용자에게 직접 질문할 수 없으므로(서브에이전트), 각 결정을 confidence와 함께 확정한다. Run phase에서 반증 발견 시 plan.md를 갱신한다.

### Q1. verify 통과 후 `twoFactorVerified=true`를 JWT에 어떻게 set 하나? — **확정 (confidence: high)** [v0.2.0 변경]

**결정**: **서버측 단기 one-shot 검증 marker를 1차(유일) 메커니즘으로 채택**한다. `useSession().update()` → jwt callback `trigger==='update'` 경로는 **완전히 폐기**(대안으로도 남기지 않음).

흐름:
1. verify/enroll-confirm tRPC mutation이 성공하면, 서버가 `packages/auth/src/autologin-marker.ts`와 동일한 in-memory one-shot 패턴(process-scoped `Map`, 서버 생성, 클라이언트 미전달)으로 user id 기준 marker를 등록한다(REQ-2OTP-046). marker에는 단기 TTL(목표 60초)을 둔다.
2. mutation 성공 응답 후 클라이언트는 단순히 페이지를 reload하거나 navigate한다 — `update()` 호출은 필요 없다.
3. 다음 요청의 jwt callback이 `token.twoFactorVerified`가 아직 없으면 **클라이언트 입력이 아니라 서버측 marker 스토어를 직접 조회**하여, 유효한 marker가 있으면 `token.twoFactorVerified = true`로 set하고 marker를 즉시 소비(one-shot)한다(REQ-2OTP-047). session callback이 이를 `session.user.twoFactorVerified`로 복사한다.

**근거 (왜 `update()` 폐기)**:
1. **불일치 위험**: OTP 검증(서버)과 세션 갱신(클라이언트 추가 `update()` 호출)이 2단계로 쪼개져, 중간에 실패하면 "OTP는 통과했지만 세션엔 미반영" 상태가 생긴다.
2. **(더 중요) 우회 취약점**: jwt callback이 `trigger==='update'`일 때 클라이언트가 보낸 페이로드(`{twoFactorVerified:true}`)를 그대로 신뢰하면, OTP 검증을 거치지 않고 클라이언트가 직접 `update()`를 호출해 플래그를 우회할 수 있는 구멍이 생긴다. jwt callback은 클라이언트가 보낸 값을 절대 신뢰해서는 안 되고 서버측 진실의 소스(marker 스토어)를 직접 조회해야 한다. 서버측 marker로 이 문제를 구조적으로 제거하므로 confidence를 medium → **high**로 상향.

**미지수/주의**: autologin-marker와 동일하게 process-scoped Map은 multi-instance/serverless에서 비호환(해당 파일 `@MX:WARN` 참조) — 단일 프로세스 배포 또는 sticky session 전제. 다중 인스턴스 전환 시 Redis 등 외부 스토어로 교체(SPEC-INFRA-001 후속)가 필요하며, 이는 본 SPEC 범위 밖이다.

### Q2. TOTP / QR 라이브러리 — **확정 (confidence: high)**

**결정**: `otplib`(TOTP 생성/검증, RFC 6238) + `qrcode`(서버측 otpauth URL → data URL/SVG 생성) 신규 도입. 모노레포에 TOTP/QR 라이브러리가 0건 설치됨(research.md §2.1, Q2). 클라이언트 QR 렌더링(`qrcode.react`) 대신 **서버에서 QR을 생성**하여 secret이 클라이언트 번들/네트워크에 노출되는 표면을 줄인다(enroll page는 Server Component).

### Q3. 시크릿 저장 방식 — **확정 (confidence: high)** [v0.2.0 변경]

**결정**:
1. **TOTP 시크릿**: 검증을 위해 복원 가능해야 하므로 해시 불가 → **AES-256-GCM 대칭 암호화**(Node `crypto`, env 키) 후 `User`에 저장(REQ-2OTP-002).
2. **AES-256-GCM IV(nonce) 고유성 (신규 확정, REQ-2OTP-006)**: 매 암호화 연산마다 CSPRNG로 생성한 **고유 IV**를 사용하고 IV를 **절대 재사용하지 않는다**. GCM은 IV 재사용 시 기밀성·인증이 모두 깨지는 잘 알려진 취약점이 있다. IV(및 GCM auth tag)는 암호문과 함께(또는 별도 컬럼에) 저장하여 복호화 가능하게 한다.
3. **백업 코드 (SHA-256 확정, REQ-2OTP-003)**: 복원 불필요한 1회용 → **SHA-256 단방향 해시(선택적 salt) + constant-time 비교**로 확정. ~~Argon2id 재사용 허용·Run phase 택일~~ 문구 제거. 근거: 백업코드는 이미 고엔트로피 랜덤값이라 저엔트로피 비밀번호를 사전공격에서 보호하는 Argon2id가 불필요하며, Argon2id는 순수 성능 낭비다.
4. **키 노출 대응 (신규 확정, REQ-2OTP-008)**: env 암호화 키가 노출 의심 시 → 키 교체 후 영향받는 모든 사용자의 2FA를 강제 비활성화(시크릿 컬럼 clear, `twoFactorEnabled=false`, 백업코드 무효화)하여 재등록을 요구한다. 키 버저닝·무중단 재암호화는 범위 밖(§5 Exclusions).
5. 평문 저장은 어떤 경우에도 금지(REQ-2OTP-002/003).

### Q4. enroll/verify procedure 보호 수준 — **확정 (confidence: high)**

**결정**: 신규 `admin2FAProcedure = publicProcedure.use(requireAdmin)` (2FA 게이트 미적용)를 도입하고 enroll/verify mutation을 여기에 건다. `protectedAdminProcedure`(게이트 포함)를 쓰면 enroll/verify 자체가 막혀 닭-달걀 발생(research.md §3.4, REQ-2OTP-045). audit 로깅은 필요 시 별도 적용.

### Q5. `checkAdmin2FA` 등록여부 skip 채우기 — **확정 (confidence: high)**

**결정**: REQ-2OTP-060대로 `twoFactorEnabled` 컬럼(또는 secret null 여부)으로 실제 등록 확인. 현재 `// For now, assume enrolled if required` 주석/로직 제거.

### Q6. 중복 헬퍼 통합 — **확정 (confidence: medium)**

**결정**: `two-factor-gate.ts`(`packages/admin`)를 canonical로 삼고, `apps/web/lib/auth/two-factor.ts`는 (a) layout.tsx 등 실제 사용처를 Grep 확인 후, 사용처가 있으면 canonical로 위임하는 thin wrapper로, 없으면 deprecate. Run phase 1순위로 사용처 조사. 단일 진실 원천 확보가 목적(REQ-2OTP-061).

### Q7. 백업 코드 / `/admin/2fa/backup` 페이지 — **확정 (confidence: medium)**

**결정**: 백업 코드 **생성/저장/검증은 본 SPEC 범위에 포함**(REQ-2OTP-003/022/025/041). verify 폼에서 백업 코드 입력을 허용한다(현재 `/admin/2fa/backup` dead link 대신 verify 흐름에 통합 권장). 별도 `/admin/2fa/backup` 전용 페이지 신설은 선택(Optional) — MVP는 "enroll 시 1회 표시 + verify에서 백업코드 입력 허용"까지로 한정하고, 전용 재발급 페이지는 후속 슬라이스로 분리 가능.

---

## 7. 가정 (Assumptions)

1. 관리자는 `User.isAdmin = true`로 표현되며 별도 `AdminMember` 모델은 없다 (research.md §2.1 검증됨).
2. 세션 전략은 `jwt` 유지 (DB 세션/PrismaAdapter 미사용, config.ts 검증됨).
3. `session.user.twoFactorVerified`가 게이트가 읽는 canonical 필드다 (`b220fd1`로 통일됨).
4. `requireAdminTwoFactor` 정책 저장/조회는 이미 동작하며 변경 불필요.
5. 단일 사이트 운영이 기본이나 게이트는 `ctx.siteId ?? 1` 폴백을 가짐 — 2FA 시크릿은 사이트가 아닌 **사용자** 귀속(멀티사이트라도 동일 User 시크릿 공유)으로 설계한다.

→ 위 가정이 틀리면 즉시 알려주세요. 그렇지 않으면 이대로 진행합니다.

## 8. 위험 (Risks)

| 위험 | 완화 |
|---|---|
| 서버측 marker(process-scoped Map)가 multi-instance/serverless에서 비공유 → 검증 직후 다음 요청이 다른 인스턴스로 가면 플래그 미반영 | 단일 프로세스/sticky session 전제 명시(REQ-2OTP-046, autologin-marker `@MX:WARN`와 동일). 다중 인스턴스 전환 시 Redis 등 외부 스토어 교체는 SPEC-INFRA-001 후속(§5 범위 밖). |
| 클라이언트가 `update()`로 OTP 검증 없이 `twoFactorVerified` 우회 | Q1 변경으로 `update()` 경로 폐기. jwt callback은 클라이언트 페이로드 불신, 서버측 marker만 조회(REQ-2OTP-047). |
| 암호화 키 분실 시 모든 관리자 2FA 시크릿 복호화 불가 | fail-closed(REQ-2OTP-044) + 백업코드로 복구 + 운영 문서에 키 백업 절차 명시. |
| 암호화 키 **노출**(분실과 별개) | 키 교체 + 영향 사용자 강제 재등록 절차(REQ-2OTP-008). 키 버저닝·무중단 재암호화는 범위 밖. |
| GCM IV 재사용으로 기밀성·인증 붕괴 | 매 연산 CSPRNG 고유 IV + 재사용 금지(REQ-2OTP-006), 단위 테스트로 IV 유일성 검증. |
| 통합(REQ-2OTP-061) 중 `b220fd1` 보안 수정 회귀 | REQ-2OTP-062로 회귀 금지 명시 + 기존 게이트 테스트 유지. |
| enroll/verify를 게이트로 보호해버려 닭-달걀 | Q4 `admin2FAProcedure` 분리로 차단. |

---

상세 구현 계획은 `plan.md`, 검증 시나리오는 `acceptance.md` 참조.
