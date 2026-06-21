# Acceptance Criteria — SPEC-ADMIN-2FA-OTP-001

> Given-When-Then 시나리오. 모든 시나리오 PASS + Definition of Done 충족 시 완료.

## AC-1: 시크릿 발급 + QR (REQ-2OTP-020)

- **Given** 인증된 관리자(`User.isAdmin=true`)가 2FA 미enroll 상태
- **When** `/admin/2fa/enroll`을 연다
- **Then** 화면에 (a) 서버가 새로 생성한 TOTP 시크릿의 QR(otpauth URL)과 (b) base32 수동 입력 fallback이 표시된다
- **And** 하드코딩 문자열 `JBSWY3DPEHPK3PXP`는 코드/화면 어디에도 없다 (Grep 0건)

## AC-2: enroll 확정 + 저장 (REQ-2OTP-021, 022, 002)

- **Given** AC-1의 후보 시크릿
- **When** 관리자가 인증 앱이 표시한 올바른 6자리 코드를 제출
- **Then** mutation이 코드를 검증하고, 시크릿을 AES-256-GCM **암호문**으로 `User`에 저장하며, `twoFactorEnabled=true` + `twoFactorConfirmedAt`을 set하고, 백업 코드 1회 표시
- **And** DB의 `twoFactorSecret`에 평문 base32가 존재하지 않는다 (복호화해야만 원본이 나옴)

## AC-3: enroll 실패 시 무저장 (REQ-2OTP-023)

- **Given** AC-1의 후보 시크릿
- **When** 잘못된 6자리 코드를 제출
- **Then** 어떤 시크릿도 저장되지 않고 `twoFactorEnabled`는 false 유지, 일반 검증 오류 반환
- **And** 오류 메시지에 후보 시크릿이 노출되지 않는다

## AC-4: verify 통과 → 세션 플래그 → 게이트 통과 (REQ-2OTP-040, 042, 060)

- **Given** enroll 완료된 관리자 + `requireAdminTwoFactor=true` + 신규 세션(미verified)
- **When** `/admin/2fa/verify`에서 올바른 TOTP 코드를 제출
- **Then** `session.user.twoFactorVerified === true`가 되고, 이후 `checkAdmin2FA`가 `pass` 반환, `protectedAdminProcedure` 호출이 더 이상 FORBIDDEN을 받지 않는다
- **And** 이 흐름은 `jwt` 세션 전략에서 동작하며 기존 `SessionRevocation` 검사를 무력화하지 않는다

## AC-5: 백업 코드 단일 사용 (REQ-2OTP-041, 003)

- **Given** enroll 시 발급된 백업 코드 1개
- **When** verify에서 그 백업 코드를 입력
- **Then** 검증 통과 + 세션 verified, 해당 백업 코드는 무효화(재사용 불가)
- **And** 동일 백업 코드 재입력 시 실패한다
- **And** DB에 백업 코드 평문이 없다 (해시만 저장, constant-time 비교)

## AC-6: 닭-달걀 방지 (REQ-2OTP-045)

- **Given** 미verified 관리자
- **When** enroll/verify mutation을 호출
- **Then** `requireAdmin2FAIfEnabled` 게이트에 막히지 않고 도달 가능하다 (단 `requireAdmin`은 통과해야 함)
- **And** 비관리자가 동일 mutation 호출 시 거부된다

## AC-7: 게이트 상태 매트릭스 (REQ-2OTP-082)

- **Given** 정책 on
- **Then** `checkAdmin2FA`는: 미enroll→`need-enroll`, enroll+미verified→`need-verify`, enroll+verified→`pass`
- **And** 정책 off일 땐 enroll/verified 무관하게 `pass`
- **And** `// For now, assume enrolled if required` stub 로직이 제거되었다 (Grep 0건)

## AC-8: 보안 회귀 금지 (REQ-2OTP-062)

- **Given** 통합(REQ-2OTP-061) 후
- **Then** `b220fd1` 수정(하드코딩 siteId 없음, `session.user.twoFactorVerified` canonical 필드)이 유지된다
- **And** 기존 게이트/미들웨어 테스트가 모두 통과한다

## AC-9: fail-closed (REQ-2OTP-005, 044)

- **Given** `TWO_FACTOR_ENC_KEY` 미설정 또는 시크릿 복호화 실패
- **When** enroll 또는 verify 시도
- **Then** 시스템은 평문 저장/우회 없이 명확한 오류로 거부(fail closed)하고, 시크릿 자료를 로그에 노출하지 않는다

## Edge Cases

- TOTP ±1 step 시간 윈도우 경계(직전/직후 step 코드)와 그 바깥(±2 step) 거부.
- 멀티사이트(`ctx.siteId ?? 1` 폴백)에서 동일 User의 시크릿이 일관되게 검증.
- enroll 도중 이탈 후 재진입 시 새 후보 시크릿(이전 후보 미저장).

## Definition of Done

- [ ] REQ-2OTP-001~089 전부 구현 또는 명시적 제외(spec.md §5)
- [ ] AC-1 ~ AC-9 + Edge Cases 전부 PASS
- [ ] `pnpm tsc --noEmit` 0 errors, lint 0 errors
- [ ] 신규 단위 테스트(TOTP/암호화/백업코드/mutation/게이트 매트릭스) 통과, 기존 게이트 테스트 무회귀
- [ ] e2e: 정책 on → enroll → verify → admin 접근 흐름 PASS, 비관리자 무영향
- [ ] expert-security 리뷰: 시크릿 암호화·백업코드 해싱·세션 플래그 우회 가능성 CRITICAL/HIGH 0건
- [ ] DB/코드/로그에 평문 TOTP 시크릿·백업 코드 0건
- [ ] @MX 태그(ANCHOR/WARN) 추가, `JBSWY3DPEHPK3PXP` 및 `assume enrolled` stub 제거 확인
- [ ] 운영 문서에 `TWO_FACTOR_ENC_KEY` 절차 + "정책 켜기 전 본 SPEC 완료" 경고 반영
- [ ] spec.md 운영 경고 해소 조건 충족 (verify 흐름 동작 확인)
