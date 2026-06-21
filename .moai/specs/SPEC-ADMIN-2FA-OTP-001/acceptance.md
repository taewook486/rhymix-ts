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

## AC-4: verify 통과 → 서버측 marker → 세션 플래그 → 게이트 통과 (REQ-2OTP-040, 042, 046, 047, 060)

- **Given** enroll 완료된 관리자 + `requireAdminTwoFactor=true` + 신규 세션(미verified)
- **When** `/admin/2fa/verify`에서 올바른 TOTP 코드를 제출하고, 이후 페이지를 reload/navigate
- **Then** verify mutation이 서버측 one-shot marker를 등록하고, **다음 요청의 jwt callback이 서버측 marker 스토어를 직접 조회**하여 `token.twoFactorVerified`를 set → `session.user.twoFactorVerified === true`가 되고, 이후 `checkAdmin2FA`가 `pass` 반환, `protectedAdminProcedure` 호출이 더 이상 FORBIDDEN을 받지 않는다
- **And** marker는 1회용으로 소비되어 두 번째 조회 시 부재로 처리되고, TTL(목표 60초) 경과 marker는 무효다
- **And** 이 흐름은 `jwt` 세션 전략에서 동작하며 기존 `SessionRevocation` 검사를 무력화하지 않는다
- **And** 클라이언트 `useSession().update()` 호출 없이 동작한다(해당 경로는 폐기됨)

## AC-4b: 클라이언트 update() 우회 차단 (REQ-2OTP-047)

- **Given** OTP 검증을 거치지 않은(서버측 marker 없는) 미verified 관리자
- **When** 클라이언트가 직접 세션 갱신 페이로드로 `{ twoFactorVerified: true }`를 주입 시도(또는 임의 trigger)
- **Then** jwt callback은 클라이언트 입력을 신뢰하지 않고 서버측 marker만 조회하므로 `twoFactorVerified`는 set되지 않고, `checkAdmin2FA`는 여전히 `need-verify`를 반환한다

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

## AC-10: AES-256-GCM IV 고유성 (REQ-2OTP-006, 002)

- **Given** 동일한 평문 TOTP 시크릿을 두 번 암호화
- **When** 각 암호화가 수행된다
- **Then** 두 결과의 IV(nonce)가 서로 다르고(CSPRNG 생성), IV·auth tag가 암호문과 함께 저장되어 복호화가 성공한다
- **And** 동일 IV가 두 암호화 연산에 재사용되지 않는다(단위 테스트로 검증)

## AC-11: 키 노출 시 강제 재등록 (REQ-2OTP-008)

- **Given** `TWO_FACTOR_ENC_KEY` 노출 의심 상황
- **When** 운영 절차(키 교체 → 영향 사용자 강제 비활성화)를 적용
- **Then** 영향받는 사용자의 시크릿 컬럼이 clear되고 `twoFactorEnabled=false`, 백업코드가 무효화되어, 해당 관리자는 재등록(enroll)을 요구받는다
- **And** 이 절차가 운영 문서/SPEC에 "키 노출 → 강제 재등록"의 최소 대응으로 명시되어 있다(키 버저닝·무중단 재암호화는 범위 밖)

## AC-12: enroll/verify 레이트 리미팅 (REQ-2OTP-048, 049, 084)

- **Given** enroll 또는 verify mutation을 호출하는 관리자
- **When** 10분 sliding window 안에서 잘못된 코드를 5회 제출(한도 = `maxErrorCount=5`, `windowMinutes=10`, login.ts와 동일)
- **Then** 6번째 시도는 **코드 검증 전에** 차단되어, 설령 그 코드가 올바른 TOTP/백업코드였더라도 `TRPCError(code='TOO_MANY_REQUESTS')`로 거부된다
- **And** 차단 시 `LoginAttempt`에 `result='RATE_LIMITED'` 행이 기록되고, 실패 시도는 `result='INVALID_CREDENTIALS'`(identifier=admin User.id, ip)로 기존 ledger에 기록된다 — 2FA 전용 신규 rate-limit 테이블/메커니즘이 추가되지 않았다
- **And** window 밖(10분 경과)의 과거 실패는 카운트에 포함되지 않는다
- **And** 에러 메시지에 남은 시도 횟수·TOTP/백업코드 구분·시크릿 자료가 노출되지 않는다

## AC-13: verify 폼 백업코드 모드 토글 + 형식 (REQ-2OTP-026, 050, 051, 085)

- **Given** `/admin/2fa/verify` 폼(기본 TOTP 모드: `inputMode=numeric`, `pattern=\d{6}`, `maxLength=6`)
- **When** 관리자가 "백업 코드 사용" 컨트롤을 활성화
- **Then** 단일 입력 필드가 **백업코드 모드**로 전환되어 영숫자 pattern + `maxLength`가 REQ-2OTP-026(정규화 10자) 형식으로 바뀌고, 다시 TOTP 모드로 토글 가능하며, 동시에 두 입력 필드가 보이지 않는다(항상 한 모드만 활성)
- **And** 백업코드를 하이픈 포함(`A3F9K-2M7QZ`)/미포함 어느 쪽으로 입력해도 동일한 canonical 10자 값으로 정규화되어 검증된다
- **And** dead link `/admin/2fa/backup`이 제거되고 백업코드 입력이 verify 폼에 통합되어 있다
- **And** 클라이언트가 `kind: 'totp' | 'backup'`를 함께 전달하고 서버가 그 모드로 검증 경로를 분기하며, `kind`와 값 형식이 불일치(예: `kind='totp'`인데 백업코드 모양)하면 REQ-2OTP-043과 동일한 일반 오류로 거부된다

## Edge Cases

- TOTP ±1 step 시간 윈도우 경계(직전/직후 step 코드)와 그 바깥(±2 step) 거부.
- 멀티사이트(`ctx.siteId ?? 1` 폴백)에서 동일 User의 시크릿이 일관되게 검증.
- enroll 도중 이탈 후 재진입 시 새 후보 시크릿(이전 후보 미저장).

## Definition of Done

- [ ] REQ-2OTP-001~089 전부 구현 또는 명시적 제외(spec.md §5)
- [ ] AC-1 ~ AC-13 (AC-4b 포함) + Edge Cases 전부 PASS
- [ ] `pnpm tsc --noEmit` 0 errors, lint 0 errors
- [ ] 신규 단위 테스트(TOTP/암호화·IV 유일성/백업코드 SHA-256·형식 정규화/서버측 marker one-shot·TTL/레이트 리미팅 10분·5회/verify 폼 모드 토글·모드 분기/mutation/게이트 매트릭스) 통과, 기존 게이트 테스트 무회귀
- [ ] jwt callback이 클라이언트 입력 불신·서버측 marker만 조회함을 검증하는 테스트 통과(REQ-2OTP-047, AC-4b)
- [ ] e2e: 정책 on → enroll → verify → admin 접근 흐름 PASS, 비관리자 무영향
- [ ] expert-security 리뷰: 시크릿 암호화·백업코드 해싱·세션 플래그 우회 가능성 CRITICAL/HIGH 0건
- [ ] DB/코드/로그에 평문 TOTP 시크릿·백업 코드 0건
- [ ] @MX 태그(ANCHOR/WARN) 추가, `JBSWY3DPEHPK3PXP` 및 `assume enrolled` stub 제거 확인
- [ ] 운영 문서에 `TWO_FACTOR_ENC_KEY` 절차 + "정책 켜기 전 본 SPEC 완료" 경고 반영
- [ ] spec.md 운영 경고 해소 조건 충족 (verify 흐름 동작 확인)
