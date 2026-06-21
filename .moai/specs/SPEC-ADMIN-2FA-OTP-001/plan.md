# Implementation Plan — SPEC-ADMIN-2FA-OTP-001

> 우선순위 라벨(High/Medium/Low)과 슬라이스 순서로만 표기 (시간 추정 금지).
> Run phase(`/moai run SPEC-ADMIN-2FA-OTP-001`) 진입 시 본 문서를 기준으로 진행.

## 기술 접근 (요약)

- **신규 의존성**: `otplib`(TOTP), `qrcode`(서버측 QR 생성). 둘 다 `apps/web` 또는 신규 `packages/two-factor`에 설치.
- **암호화**: Node `crypto` AES-256-GCM, env 키(`TWO_FACTOR_ENC_KEY`). 키 부재 시 fail-closed.
- **저장**: `User`에 additive 컬럼(아래 M1). 시크릿은 암호문, 백업코드는 해시.
- **세션 플래그**: Auth.js v5 `update()` → jwt callback `trigger==='update'` 분기(`callbacks.ts`). fallback은 spec.md Q1.
- **게이트**: `checkAdmin2FA` 등록여부 확인을 실제 컬럼으로 교체 + 헬퍼 통합.
- **닭-달걀 방지**: `admin2FAProcedure`(`requireAdmin`만, 게이트 미적용)로 enroll/verify 보호.

배치 권장 위치(택일, Run phase 1순위 결정): 순수 TOTP/암호화/백업코드 로직을 신규 `packages/two-factor`(point/notification 패턴)로 분리하면 단위 테스트와 재사용에 유리. 대안은 `packages/admin/src/security/` 확장.

---

## 마일스톤 (우선순위 순)

### M1. 데이터 모델 + 암호화 코어 (priority: High) — REQ-2OTP-001~005

- `User` Prisma 컬럼 추가: `twoFactorSecret String?`(암호문, base64), `twoFactorEnabled Boolean @default(false)`, `twoFactorConfirmedAt DateTime?`, `twoFactorBackupCodes Json? @default("[]")`(해시 배열). additive 단일 마이그레이션.
- AES-256-GCM `encryptSecret`/`decryptSecret`(env 키, IV+tag 포함 인코딩). 키 부재 시 throw.
- 백업코드 `generateBackupCodes`(고엔트로피 N개), `hashBackupCode`/`verifyBackupCode`(constant-time).
- 단위 테스트: 암호화 round-trip, 키 부재 fail-closed, 백업코드 해시/검증.

### M2. TOTP 코어 (priority: High) — REQ-2OTP-020(부분), 080

- `generateTotpSecret`, `buildOtpauthUrl(issuer, account, secret)`, `verifyTotp(secret, code, window=1)`.
- `qrcode`로 otpauth URL → data URL/SVG.
- 단위 테스트: 알려진 벡터, ±1 step window 경계, 만료 코드 negative.

### M3. tRPC: enroll + verify mutation (priority: High) — REQ-2OTP-021~024, 040~045, 081

- `admin2FAProcedure = publicProcedure.use(requireAdmin)` 신설 (게이트 미적용).
- `adminTwoFactorRouter`: `enrollStart`(server-derived 후보 secret + otpauth/QR 반환), `enrollConfirm({code})`(검증→암호화 저장→`enabled=true`→백업코드 반환→세션 verified), `verify({code})`(TOTP 또는 백업코드 검증→세션 verified, 백업코드 1회 소비).
- `apps/web/server/api/routers/admin/index.ts`에 `twoFactor: adminTwoFactorRouter` 등록.
- 후보 secret을 user id에 바인딩(REQ-2OTP-024) — 서버측 임시 보관(요청 스코프 또는 short-lived).

### M4. 세션 플래그 set 메커니즘 (priority: High) — REQ-2OTP-042

- `callbacks.ts` jwt callback에 `trigger==='update'` 분기 추가: revocation 검사 통과 + `token.twoFactorVerified` set. session callback에 `session.user.twoFactorVerified = token.twoFactorVerified ?? false` 복사.
- enroll/verify 성공 후 클라이언트에서 `useSession().update(...)` 호출 또는 mutation 응답으로 트리거.
- **Run phase 우선 검증**: `update()`가 jwt 전략에서 claim을 실제로 채우는지 실측. 실패 시 spec.md Q1 fallback(서버측 marker + `checkAdmin2FA` 시그니처 확장).

### M5. 게이트 통합 + 헬퍼 일원화 (priority: Medium) — REQ-2OTP-060~062, 082

- `checkAdmin2FA` 등록여부 확인을 `twoFactorEnabled`/secret null 여부로 교체(`assume enrolled` 제거).
- `apps/web/lib/auth/two-factor.ts` 사용처 Grep(특히 layout.tsx) → canonical(`two-factor-gate.ts`)로 위임 or deprecate.
- 회귀 금지: `b220fd1`의 no-hardcoded-siteId + `session.user.twoFactorVerified` canonical 필드 유지.
- 상태 매트릭스 테스트(REQ-2OTP-082).

### M6. UI stub 교체 (priority: Medium) — REQ-2OTP-020, 021, 040, 043

- `enroll/page.tsx`: 하드코딩 `secret` 제거, `enrollStart` 호출로 실제 QR/secret 렌더(서버측).
- `TwoFactorEnrollForm.tsx`: `setTimeout` stub → `enrollConfirm` mutation + 백업코드 표시 + `update()`.
- `TwoFactorVerifyForm.tsx`: `setTimeout` stub → `verify` mutation(+백업코드 입력 허용) + `update()`. dead link `/admin/2fa/backup` 처리(verify 통합 또는 페이지 신설 — spec.md Q7).

### M7. e2e + 운영 문서 (priority: Low) — 검증/운영

- e2e: 정책 on → 미enroll 관리자 → enroll → /admin 접근 가능 → 새 세션 → verify → 접근. 비관리자 무영향.
- 운영 문서: `TWO_FACTOR_ENC_KEY` 설정/백업 절차 + "정책 켜기 전 본 SPEC 완료 확인" 경고.

---

## @MX 태그 대상 (Run phase)

- `encryptSecret`/`decryptSecret`: `@MX:ANCHOR`(시크릿 보호 단일 진입점) + `@MX:REASON`.
- `callbacks.ts` jwt update 분기: `@MX:WARN`(revocation 검사와 상호작용) + `@MX:REASON`.
- `checkAdmin2FA`: 기존 `@MX:ANCHOR` 갱신(등록여부 실제 확인 반영).
- enroll/verify mutation: `@MX:SPEC: SPEC-ADMIN-2FA-OTP-001`.

## 의존성

- 선행: SPEC-AUTH-001(세션/jwt callback 인프라, 완료), SPEC-ADMIN-001 Slice I(게이트, 완료), SPEC-ADMIN-EXTRAS-001(enroll/verify 페이지 골격, 완료).
- 본 SPEC 완료 → 운영 경고 해소 → `requireAdminTwoFactor` 활성화 안전.

## 리스크 → 마일스톤 매핑

- `update()` 신뢰성(spec.md Q1/§8) → M4에서 우선 실측, 실패 시 fallback.
- 보안 회귀(`b220fd1`) → M5 REQ-2OTP-062 회귀 테스트.
- 키 분실 → M1 fail-closed + M7 운영 문서.
