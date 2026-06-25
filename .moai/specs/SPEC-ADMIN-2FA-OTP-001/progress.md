# SPEC-ADMIN-2FA-OTP-001 진행 상황

상태: 구현 완료 (M1~M7), 최종 E2E 실제 실행 확인만 남음. 커밋 안 함(unstaged).

## 완료된 마일스톤

- M1 데이터 모델 + 암호화 코어 — `packages/auth/src/two-factor-crypto.ts`, Prisma 마이그레이션 `20260623000001_spec_admin_2fa_otp_001_m1_data_model`
- M2 TOTP 코어 — `packages/auth/src/two-factor-totp.ts`, `two-factor-backup-codes.ts` (otplib/qrcode 의존성 추가됨)
- M3 tRPC enroll/verify — `apps/web/server/api/routers/admin/two-factor.ts` (admin2FAProcedure, enrollStart/enrollConfirm/verify, login.ts 패턴 재사용 레이트 리미팅)
- M4 세션 플래그 마커 — `packages/auth/src/two-factor-verified-marker.ts` (autologin-marker.ts 패턴), `apps/web/lib/auth/callbacks.ts` jwt update 분기 (클라이언트 payload 불신, 서버 marker만 신뢰 — spec.md Q1 최종 결정)
- M5 게이트 통합 — `packages/admin/src/security/two-factor-gate.ts` checkAdmin2FA 실제 구현, `apps/web/lib/auth/two-factor.ts` canonical 위임
- M6 UI stub 교체 — enroll/verify 폼 실제 mutation 연결, 백업코드 1회 표시 + 명시적 확인 게이트, TOTP/백업코드 모드 토글
- M7 e2e + 운영 문서 — `.env.example` ×2 (TWO_FACTOR_ENC_KEY 문서화), `apps/web/e2e/admin-2fa-enforcement.spec.ts`에 전체 루프 테스트 추가

## 위임 작업 검증 중 직접 수정한 버그 (3건)

1. `two-factor-totp.ts` — URL 인코딩 테스트 버그 + `buildOtpauthUrl`에 `issuer` 파라미터 누락 (M1/M2, 이전 세션 작업분)
2. **`apps/web/app/admin/layout.tsx`** — 2FA 게이트가 등록 여부와 무관하게 항상 `/admin/2fa/enroll`로만 보내던 미해결 TODO. `checkAdmin2FA`(need-enroll/need-verify 구분)로 교체 완료. tester가 작성한 e2e 재챌린지 테스트에서 발견됨.
3. e2e 테스트의 `otplib` API 오용 — `generateSync({ type: 'totp' })` → `{ strategy: 'totp' }` (otplib v13 API)

## 검증 상태

- 유닛/통합 테스트 437개 전체 통과 (`packages/auth/src`, `packages/admin/src`, `apps/web/server/api/trpc.two-factor.test.ts`, `apps/web/server/api/routers/admin/two-factor.test.ts`, `apps/web/lib/auth/two-factor.test.ts`)
- 타입체크 클린 (2FA 관련 파일 전체)
- **Playwright e2e 미완료**: 사용자가 세션 중간에 Docker(Postgres 5444)를 띄워줘서 재시도했으나, 다음 세션 시작 시점에도 결과 확인 전 종료됨. 백그라운드 task id `b9asyrx3o`, 로그 경로: `/tmp/claude-1000/-mnt-d-project-rhymix-ts/74ce392f-694b-409d-87ae-5cbd3150bb28/scratchpad`(세션별 임시 디렉터리라 다음 세션에서는 사라짐 — 재실행 필요).

## 다음 세션에서 할 일

1. Postgres(127.0.0.1:5444, rhymix/rhymix/rhymix_ts)가 떠 있는지 확인 후 `cd apps/web && pnpm exec playwright test e2e/admin-2fa-enforcement.spec.ts --reporter=line` 재실행 (타임아웃 없이, 설치 위저드+Turbopack 첫 컴파일로 테스트당 60초+ 소요 가능)
2. 통과 확인되면 커밋 진행 여부 사용자에게 확인
3. (낮은 우선순위, 별건) 이번 세션에서 발견한 무관 결함 2건은 손대지 않음:
   - `apps/web/lib/auth/actions.test.ts` — `createMailDispatcher` mock 누락
   - `apps/web/app/admin/layout.test.tsx` — Next.js 16 `headers()` request-scope mock 부재 (jsdom 환경 Server Component 렌더링 테스트 한계)
