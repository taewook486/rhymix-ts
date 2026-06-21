# Research — SPEC-ADMIN-2FA-OTP-001 (관리자 2FA TOTP 백엔드 구현)

> 작성: 2026-06-21 / manager-spec plan phase (Research sub-phase)
> 모든 사실은 1차 소스 직접 읽기로 검증됨. 라인 참조는 검증 시점 기준.

## 0. 한 줄 요약

관리자 2FA의 **게이트(gate)는 동작하지만 OTP 발급·검증 메커니즘 자체가 처음부터 끝까지 미구현 stub**이다. 이 SPEC은 그 gap(시크릿 생성/저장 → enroll → verify → 세션 플래그 set)을 채운다. 게이트·UI 골격·라우트는 이미 존재하므로 다시 만들지 않는다.

---

## 1. 왜 이 SPEC이 필요한가 (배경)

- 2026-06-21 SPEC-TEST-DEBT-001 triage 중 admin 2FA enforcement 게이트에서 **CRITICAL 보안 우회**(siteId 하드코딩 → 2FA가 production에서 사실상 항상 우회, CVSS≈8.8, OWASP A07:2021)를 발견하여 fail-closed로 긴급 수정함 (커밋 `b220fd1`).
- 그 수정 과정에서 더 근본적인 사실이 드러남: **2FA "검증(verify)" 흐름 전체가 미구현 stub**. 게이트는 이제 정상 동작하나, 게이트를 통과시켜줄 실제 OTP 발급/검증이 코드베이스에 없다.
- 결과적으로 현재 상태에서 운영자가 `requireAdminTwoFactor=true`를 켜면 **모든 관리자가 영구 lockout** 된다 (OTP를 검증할 방법이 없으므로). 이 SPEC이 그 위험을 해소한다.
- 커밋 `b220fd1` 메시지가 이 후속 작업을 명시적으로 defer 함: *"실제 구현(TOTP 검증)은 별도 SPEC(SPEC-ADMIN-2FA-OTP-001)으로 진행"*.

---

## 2. 현재 상태 (직접 검증 완료)

### 2.1 Prisma 스키마 — 2FA 저장 필드 전무

- `packages/db/prisma/schema.prisma` (1366 lines)에서 `twoFactor|two_factor|totp|otp` 검색 결과 **0건**.
- `User` 모델 (line 283~342): `passwordHash`, `passwordVersion`, `passwordAlgo`, `passwordChangedAt`, `sessionsRevokedAt` 등은 있으나 **2FA 시크릿/백업코드/활성화여부 컬럼이 전혀 없음**.
- `AdminMember`/`Member` 모델은 존재하지 않음 — 관리자도 `User.isAdmin = true`로 표현됨. 즉 2FA 필드는 `User`에 추가하는 것이 자연스럽다.
- `User`는 이미 `extraVars Json @default("{}")`, `dashboardWidgetPrefs Json?`를 가짐 — Json 컬럼 패턴이 코드베이스에 존재.

### 2.2 enroll 페이지 — 하드코딩 stub

- `apps/web/app/admin/2fa/enroll/page.tsx` (Server Component):
  - line 20-21: `// TODO: TOTP 시크릿 발급 (backend 팀에서 구현 필요)` + `const secret = 'JBSWY3DPEHPK3PXP'` (하드코딩 예시 문자열을 그대로 화면 표시).
  - QR 코드 영역은 주석 처리됨 (`{/* <QRCodeCanvas value={otpauthUrl} ... /> */}`), "개발 중: QR 코드 생성은 백엔드 구현이 필요합니다" 배너 표시.
  - 백업 코드 안내 텍스트만 있고 실제 코드 미생성.
- `apps/web/app/admin/2fa/enroll/TwoFactorEnrollForm.tsx` ('use client'):
  - line 31-37: 실제 mutation 없이 `// await trpc.admin.twoFactor.enroll.mutate({ code })` 주석 + `setTimeout(1000)` + 무조건 성공 토스트 + `router.push(callbackUrl)`.

### 2.3 verify 페이지 — 동일 stub

- `apps/web/app/admin/2fa/verify/TwoFactorVerifyForm.tsx`:
  - line 31-37: enroll과 동일 패턴 — `// await trpc.admin.twoFactor.verify.mutate({ code })` 주석 + `setTimeout(1000)` + 무조건 성공.
  - line 92: `<a href="/admin/2fa/backup">백업 코드 사용</a>` 링크 존재. **그러나 `/admin/2fa/backup` 페이지는 존재하지 않음** (`apps/web/app/admin/2fa/`에 `enroll`, `verify` 디렉토리만 존재, `backup` 없음 → dead link).

### 2.4 게이트 로직 — 정책+세션 플래그는 동작, 등록여부 확인은 skip

- `packages/admin/src/security/two-factor-gate.ts`:
  - `getSiteAdminTwoFactorPolicy(prisma, siteId)`: `SiteSetting{ siteId, key:'requireAdminTwoFactor' }` 의 boolean value 조회 — **정상 동작**.
  - `checkAdmin2FA(session, prisma, siteId)`: 1) 세션 검사 → 2) 정책 검사 → 3) **등록여부 확인 skip** (line 90-95: `// TODO: needs schema with twoFactorSecret field` + `// For now, assume enrolled if required`) → 4) `session.user.twoFactorVerified === true` 확인 (line 99).
  - 반환: `'pass' | 'need-enroll' | 'need-verify'`.
  - `invalidateAll2FAVerified(prisma, siteId)`: 정책 변경 시 `AdminLog` 기록 (검증 무효화 audit).
  - 파일 헤더 line 6-7: *"This is a stub implementation. The actual 2FA fields (twoFactorSecret, etc.) are not yet in the Prisma schema."*

### 2.5 세션 검증 플래그 — 어디서도 set 되지 않음

- `checkAdmin2FA`는 `session.user.twoFactorVerified === true`를 확인함 (오늘 수정으로 `session.user` 내부로 통일됨; 이전엔 `session.adminTwoFactorVerified`였음 — `b220fd1` 메시지의 "필드 위치 불일치" 항목 참조).
- `apps/web/lib/auth/callbacks.ts` (jwt/session callback의 단일 정의 지점)에서 `twoFactorVerified` 검색 결과 **0건**. 즉 이 플래그를 NextAuth 세션에 채우는 코드가 없다 → 현재는 영구 `false`.

### 2.6 중복 헬퍼 2개

- `apps/web/lib/auth/two-factor.ts`:
  - `isAdminTwoFactorRequired(prisma)`: `SiteSetting{ key:'requireAdminTwoFactor' }` (siteId 없이) 조회.
  - `isSessionTwoFactorVerified(session)`: `session.user.twoFactorVerified === true` 확인.
- 이 둘은 `two-factor-gate.ts`의 `getSiteAdminTwoFactorPolicy` / `checkAdmin2FA`와 **기능 중복**. 단, `two-factor.ts`는 현재 tRPC 미들웨어에서 호출되지 않음 (`requireAdmin2FAIfEnabled`는 `checkAdmin2FA`만 호출). `two-factor.ts`는 `@MX:ANCHOR REQ-ADMIN-023`로 표기되어 있고 layout.tsx에서 호출될 수 있음 — 통합 여부는 이 SPEC에서 결정 필요.

### 2.7 게이트가 걸린 위치 (enforcement points)

- `apps/web/server/api/trpc.ts`:
  - line 189-208: `requireAdmin2FAIfEnabled` 미들웨어 — `checkAdmin2FA(ctx.session, ctx.prisma, ctx.siteId ?? 1)` 호출, `need-enroll`/`need-verify`면 `FORBIDDEN` throw.
  - line 276-279: `protectedAdminProcedure = publicProcedure.use(requireAdmin).use(requireAdmin2FAIfEnabled).use(auditLogger)`.
- SPEC-ADMIN-EXTRAS-001 REQ-ADMIN-EXTRAS-041/042/045는 layout 단계 redirect(`/admin/2fa/enroll`, `/admin/2fa/verify`)와 **이중 가드**(tRPC 미들웨어 + layout server check)를 요구함. (단, layout redirect 구현 여부는 별도 확인 필요 — 본 SPEC의 enroll/verify 데이터 흐름과 직교.)

---

## 3. 재사용 가능한 기존 패턴 (이 SPEC이 따라야 할 컨벤션)

### 3.1 비밀번호 해싱 (보안 일관성 기준점)

- `packages/auth/src/password.ts`: `hash-wasm`의 Argon2id 사용 (WebAssembly, edge 호환, 모든 플랫폼 prebuilt 불필요).
- `packages/auth/src/password-config.ts`: 워크 팩터 단일 진실 원천 (`ARGON2ID_PARAMS`).
- 시사점: 백업 코드는 **단방향 해시로 저장**해야 하며 (평문 금지), Argon2id 또는 SHA-256(고엔트로피 랜덤 코드이므로 충분) 중 선택. TOTP 시크릿은 **검증을 위해 복원 가능해야** 하므로 해시 불가 → 대칭 암호화 또는 (운영 정책상) 보호된 컬럼 저장 결정 필요.

### 3.2 crypto 사용처

- `crypto.getRandomValues` (password.ts salt 생성), Node `crypto` 모듈이 `packages/auth/src/{autologin-marker,password,tokens}.ts`에서 사용됨. 즉 Node `crypto` 기반 AES-256-GCM 대칭 암호화 / `randomBytes` 백업코드 생성이 컨벤션과 일치.

### 3.3 JWT 세션 + 토큰 augmentation 패턴 (핵심 — verify 흐름 설계 기준)

- `apps/web/lib/auth/callbacks.ts`:
  - 세션 전략은 `jwt` (DB 세션 아님 — `config.ts` line 53-56). PrismaAdapter는 `User.id Int` 호환성 문제로 폐기됨.
  - `createJwtCallback`: 초기 sign-in 시 `token.sub`/`token.iat` 주입 + RBAC claims(`isAdmin`/`groups`) enrichment. **후속 요청마다 `isSessionRevoked(userId, tokenIat)` 검사** → revoked면 `token=null` 반환(세션 거부).
  - `createSessionCallback`: `token.sub`/`isAdmin`/`groups`를 `session.user`로 복사.
  - **시사점 (중요)**: `twoFactorVerified`도 동일하게 `token.twoFactorVerified`로 보관 → session callback에서 `session.user.twoFactorVerified`로 복사하는 패턴을 따라야 한다. 토큰을 갱신하는 트리거(아래 §4 Open Q1)가 verify 흐름의 핵심 미지수.

### 3.4 tRPC admin 라우터 등록 패턴

- `apps/web/server/api/routers/admin/index.ts`: 각 도메인 라우터를 `adminRouter` 객체에 키로 등록 (`module`, `menu`, ... `poll`). 신규 `twoFactor` 라우터는 여기에 `twoFactor: adminTwoFactorRouter` 한 줄 추가.
- **주의**: enroll/verify는 `protectedAdminProcedure`로 보호할 수 없다 (2FA 게이트가 enroll/verify 자체를 막아 닭-달걀 문제 발생). enroll/verify는 `requireAdmin`까지만 통과한 별도 procedure(2FA 게이트 미적용)여야 한다 — §4 Open Q4.

### 3.5 SiteSetting 정책 저장

- `SiteSetting{ siteId, key, value Json }`, `@@unique([siteId, key])`. `requireAdminTwoFactor`는 이미 이 테이블 키로 사용됨. 신규 컬럼/마이그레이션 불필요 (정책은 이미 동작).

---

## 4. 직접 설계 결정이 필요한 항목 (Open Questions — spec.md에서 best-judgment 확정)

| # | 질문 | 본 research의 잠정 권고 |
|---|---|---|
| Q1 | verify 통과 후 `twoFactorVerified=true`를 JWT에 어떻게 set 하나? (jwt 전략) | Auth.js v5 `useSession().update()` → jwt callback `trigger==='update'` 경유가 표준. **그러나** 이 코드베이스 jwt callback은 매 요청 revocation 검사를 하므로 update 경로에서 token augmentation 분기를 명시 추가해야 함. 대안: short-lived 서버측 verified-marker 테이블(autologin-marker 패턴). spec.md에서 confidence와 함께 확정. |
| Q2 | TOTP 라이브러리 | 모노레포에 otplib/speakeasy/otpauth/qrcode 미설치(0건). `otplib`(TOTP) + `qrcode`(QR data URL 서버 생성) 신규 도입 권고. |
| Q3 | 시크릿 저장 방식 | TOTP 시크릿은 복원 가능해야 함 → AES-256-GCM 대칭 암호화 후 `User`에 저장(env 키). 평문 금지. 백업코드는 Argon2id/SHA-256 단방향 해시. |
| Q4 | enroll/verify procedure 보호 수준 | `protectedAdminProcedure`(2FA 게이트 포함) 사용 시 닭-달걀. → `requireAdmin`까지만 적용한 신규 `admin2FAProcedure` 도입. |
| Q5 | `checkAdmin2FA` 등록여부 skip 채우기 | 신규 `User.twoFactorEnabled`(또는 secret null 여부)로 실제 확인하도록 교체. |
| Q6 | 중복 헬퍼 통합 | `two-factor.ts`는 게이트에서 미사용 → `two-factor-gate.ts`로 일원화하고 `two-factor.ts`는 deprecate 또는 게이트로 위임. 단 layout.tsx 사용처 확인 후 결정. |
| Q7 | 백업 코드 / `/admin/2fa/backup` 페이지 | dead link 존재. 백업 코드 생성/검증은 이 SPEC 범위에 포함, `/admin/2fa/backup` 페이지 추가 여부는 슬라이스 분리(MVP는 enroll 시 표시 + verify에서 백업코드 입력 허용까지). |

---

## 5. 참조 REQ / SPEC

- **REQ-ADMIN-023** (SPEC-ADMIN-001 Slice I) — 2FA 강제 게이트. `slice-i-plan.md` F1/F2가 "SiteSetting 키-값 + 세션 플래그 검사 훅만 도입, 실제 OTP는 SPEC-AUTH-001 후속으로 이월"로 명시. **게이트는 구현됨**.
- **REQ-2FA-001~005 / REQ-ADMIN-EXTRAS-040~047** (SPEC-ADMIN-EXTRAS-001 Slice B) — enroll/verify UI 골격 + enforcement gate. `spec.md` line 157(REQ-044): *"TOTP(RFC 6238) ... reusing the 2FA model and verification logic already defined in SPEC-AUTH-001"* 라고 적었으나 **SPEC-AUTH-001에 실제 2FA 모델은 존재하지 않음** (전제가 틀린 forward reference). 본 SPEC이 그 "존재한다고 가정된" 모델을 실제로 만든다.
- 이 SPEC이 **새로 추가하는 것**: Prisma 2FA 필드 + 시크릿 생성/암호화/저장 + QR/otpauth URL 생성 + TOTP 검증 + 백업코드 + verify 통과 시 세션 플래그 set + 게이트 등록여부 확인 채우기 + 중복 헬퍼 정리.
- 이 SPEC이 **다시 만들지 않는 것**: 게이트 강제 미들웨어(`requireAdmin2FAIfEnabled`), enroll/verify 페이지 라우트 골격, SiteSetting 정책 저장.

---

## 6. 운영 경고 (spec.md에 굵게 명시 필수)

**이 SPEC이 구현·배포되기 전까지 운영자는 `SiteSetting.requireAdminTwoFactor`를 절대 `true`로 설정하면 안 된다.** 현재 verify 흐름이 stub이므로 OTP를 어떻게 입력해도 `session.user.twoFactorVerified`가 set되지 않아 **모든 관리자가 admin 패널에서 영구 lockout** 된다. (fail-closed 설계의 의도된 결과.)
