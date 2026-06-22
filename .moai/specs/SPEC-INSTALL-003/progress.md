# SPEC-INSTALL-003 — Progress

**날짜**: 2026-06-23 (plan 작성 + 구현 완료, 최종 회귀 검증 1회 미완료 — 다음 세션에서 이어감)
**방법론**: TDD (quality.yaml `development_mode: tdd`)
**베이스라인**: SPEC-INSTALL-001 완료 시점 (859/868 tests passing)
**선행 SPEC**: SPEC-INSTALL-001 (REQ-INSTALL-016~018 시드 구현 완료), SPEC-LAYOUT-001 (인덱스 모듈 dispatch), SPEC-ADMIN-001 (/admin 라우트)
**관련 SPEC (soft)**: SPEC-INSTALL-002 (자동 로그인/헤더 세션 — 구현 완료, 온보딩과 함께 Playwright로 동시 확인됨)
**근거 보고서**: `.moai/reports/install-gap-comparison/REPORT-2026-06-22.md` §3 및 우선순위 #4 (랜딩 페이지 풍부도 격차)

---

## 다음 세션 시작 시 먼저 할 일 (재개 체크리스트)

1. `git -C /mnt/d/project/rhymix-ts log --oneline -8` 로 아래 커밋들이 모두 있는지 확인:
   `98808a9 fix(test) OperatorOnboarding mock` → `fa5e227 fix(test) vitest.setup.ts 전역 mock 제거` → `a161a91`/`2ac2875 fixup!` → `510427b feat(install) Groups 1-4` → `ff827a8 feat(layout) Group 5`.
2. `git -C /mnt/d/project/rhymix-ts status --short`에 `apps/web/**` 관련 미커밋 변경이 없어야 정상(있다면 onboarding-surface 에이전트가 또 무언가를 남겼을 가능성 — 내용 검토 후 처리).
3. **마지막으로 못 끝낸 일**: `pnpm vitest run apps/web` 전체 재실행 1회가 명령 도중 중단됨(시간이 늦어 사용자 요청으로 정리). 직전(중단 전) 실행 결과는 모두 정상이었음(`## 테스트 결과` 섹션 참조) — 재실행해서 동일하게 나오는지만 재확인하면 Task #7(통합 품질 검증)을 공식 종료할 수 있음.
4. dev 서버/vitest 백그라운드 프로세스는 세션 종료 시 모두 정리됨(`pkill -f "next dev"`, `pkill -f "vitest run"`) — 새로 띄워야 함.

---

## 상태 개요

| 그룹 | 내용 | REQ | 우선순위 | 상태 |
|------|------|-----|----------|------|
| 1 | first-run 온보딩 surface 라이프사이클 | REQ-INSTALL3-001~006 | P2 | **완료** (커밋 510427b, a161a91, 98808a9) |
| 2 | 운영자 온보딩 패널 (verified admin 링크) | REQ-INSTALL3-010~014 | P2 | **완료** |
| 3 | 환영/히어로 (설치 성공 인지) | REQ-INSTALL3-020~023 | P2 | **완료** |
| 4 | 외부/커뮤니티 링크 (GitHub) | REQ-INSTALL3-030~032 | P3 | **완료** |
| 5 | 최소 공개 푸터 (선택) | REQ-INSTALL3-040~042 | P3 | **완료** (커밋 ff827a8) |

---

## REQ 매핑 (구현 추적용)

| REQ | 설명 | 대상 파일(예상) | 상태 |
|-----|------|------------------|------|
| REQ-INSTALL3-001 | 인증 운영자·미해제 시 온보딩 surface 추가 렌더 | `apps/web/app/page.tsx` | 완료 |
| REQ-INSTALL3-002 | dismiss → 영속 상태 set, 재렌더 시 부재 | dismiss action + SiteSetting/플래그 | 완료 |
| REQ-INSTALL3-003 | 해제 시 board만 렌더 | `apps/web/app/page.tsx` | 완료 |
| REQ-INSTALL3-004 | 익명은 board만, 운영자 패널 부재 | `apps/web/app/page.tsx` | 완료 |
| REQ-INSTALL3-005 | 인덱스 모듈 출력 불변(additive only) | `apps/web/app/page.tsx` | 완료 |
| REQ-INSTALL3-006 | seed.ts 무변경 | (검증) `packages/db/src/install/seed.ts` | 완료 |
| REQ-INSTALL3-010 | 5개 task → verified admin 라우트 링크 | `apps/web/components/onboarding/*` | 완료 |
| REQ-INSTALL3-011 | 최소 5개 가이드 링크 + 레이블 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-012 | 존재하지 않는 admin 라우트 링크 금지 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-013 | 미인증에 admin 내비 미노출 | 인증 게이트 | 완료 |
| REQ-INSTALL3-014 | (선택) 완료 진척 표시 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-020 | 환영 카피 = 설치 성공 인지 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-021 | 기본 CTA → `/admin` | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-022 | 캐러셀/정확 카피 복제 불요 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-023 | 기존 Tailwind 컨벤션 사용 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-030 | GitHub repo 링크 포함 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-031 | 날조 외부 링크 금지 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-032 | 레거시 URL 복제 금지 | `components/onboarding/*` | 완료 |
| REQ-INSTALL3-040 | "Powered by Rhymix-TS" 푸터 | `app/layout.tsx` / `GlobalFooter.tsx` | 완료 |
| REQ-INSTALL3-041 | 미존재 Terms/Privacy 링크 금지 | 푸터 | 완료 |
| REQ-INSTALL3-042 | 푸터는 온보딩 해제와 무관(영구) | 푸터 | 완료 |

---

## 수락 기준 추적

| AC | REQ | 상태 |
|----|-----|------|
| AC-INSTALL3-001 | 001, 003 | 대기 |
| AC-INSTALL3-002 | 002, 003 | 대기 |
| AC-INSTALL3-003 | 004, 005, 013 | 대기 |
| AC-INSTALL3-004 | 010, 011, 012 | 대기 |
| AC-INSTALL3-005 | 020, 021 | 대기 |
| AC-INSTALL3-006 | 006 | 대기 |
| AC-INSTALL3-007 | 030, 031, 032 | 대기 |
| AC-INSTALL3-008 | 040, 041, 042 | 대기 |

---

## ANALYZE Phase

plan 단계 사전 조사(spec.md "Background" 섹션)를 그대로 따라 구현. `apps/web/app/page.tsx`(RootPage)의 3-분기 구조, 루트 레이아웃에 푸터 부재, 실재 admin 라우트 5종을 확인 후 진행.

### Baseline

SPEC-INSTALL-002 완료 시점. `apps/web` vitest: 98 파일/636 테스트 중 11 failed/64 tests failed — 전부 SPEC-TEST-DEBT-001 사전 존재 카탈로그와 매칭(신규 회귀 없음, SPEC-INSTALL-002 작업 시 확인됨).

### 발견된 주요 사항

- RootPage에는 "비어있음" 신호가 없어(인덱스 모듈이 이미 시드됨) 온보딩 노출 조건을 별도 인증+해제 플래그로 설계해야 함 — plan 단계 판단이 정확했음.
- **OperatorOnboarding/RootPage 같은 async Server Component는 vitest+RTL로 직접 `render()`할 수 없음** — React가 "async/await is not yet supported in Client Components"를 던짐. SPEC-TEST-DEBT-001의 NextJS-AppRouter 카테고리와 동일 제약. → 게이팅 로직(`getOnboardingDismissed`)만 순수 함수로 export해 단위 테스트, RootPage 자체의 인증 게이트는 Playwright 실브라우저 검증으로 대체.
- vitest.setup.ts에 SPEC-INSTALL-002 작업 중 추가된 전역 mock 2개(`next/server`, `@/lib/auth/config`)가 부정확(누락된 export)하여 middleware.test.ts에 새 에러를 유발 — 제거. 제거 후 middleware.test.ts/proxy.test.ts의 pass/fail 결과는 베이스라인과 동일함을 worktree 비교로 확인(이미 사전 존재하는 next-auth/next 모듈 해석 이슈, 회귀 아님). 단, 제거로 인해 OperatorOnboarding.test.tsx가 새로 그 이슈에 노출되어 로컬 mock 추가로 해결.

---

## PRESERVE Phase

- `packages/db/src/install/seed.ts` 무변경 확인 (`git diff bacd3c7 HEAD -- packages/db/src/install/seed.ts` 결과 empty) — REQ-INSTALL3-006 충족.
- 익명 홈(`GET /`) board 출력 불변을 Playwright로 직접 확인(로그아웃 후 `/` 재방문 → board 게시글 목록 동일).

---

## IMPROVE Phase

### 완료된 작업

- Group 5(공개 푸터): `GlobalFooter.tsx` 신규 + `layout.tsx` 통합 (커밋 ff827a8)
- Group 1~4(온보딩 surface): `OperatorOnboarding.tsx`/`WelcomeHero.tsx`/`OnboardingPanel.tsx`/`DismissButton.tsx`/dismiss action 신규 (커밋 510427b, fixup a161a91)
- 테스트 인프라 회귀 수정: vitest.setup.ts 부정확한 전역 mock 제거 + OperatorOnboarding.test.tsx 로컬 mock 보강 (커밋 fa5e227, 98808a9)

### 진행 중인 작업

없음 — 코드/테스트는 모두 커밋 완료. 남은 것은 최종 전체 회귀 재확인 1회뿐(아래 "다음 세션 시작 시 먼저 할 일" 참조).

---

## 테스트 결과

**단위/컴포넌트 테스트** (모두 통과, 직접 실행 확인):
- `OperatorOnboarding.test.tsx` 4/4 (getOnboardingDismissed 분기 로직)
- `OnboardingPanel.test.tsx` 2/2, `WelcomeHero.test.tsx` 2/2
- `onboarding.test.ts`(dismiss action) 3/3
- `GlobalFooter.test.tsx` 3/3, `app/layout.test.tsx` 3/3
- `GlobalHeader.test.tsx` 6/6 (회귀 없음 재확인)
- `install/actions.test.ts` 22/25 통과 (3건은 SPEC-TEST-DEBT-001 사전 존재 — `validateDbConfig` 실DB 연결 이슈)
- `install/complete/page.test.tsx` 1/1

**Playwright 실브라우저 검증** (admin/swbin046@ 설치 후, 2026-06-22/23):
- AC-INSTALL3-001: 인증+미해제 → 온보딩(히어로+패널+GitHub링크)과 board 동시 렌더 ✓
- AC-INSTALL3-002: "이 안내 숨기기" 클릭 후 재방문 → 온보딩만 사라짐, board/푸터 유지 ✓
- AC-INSTALL3-003: 로그아웃(익명) → 온보딩/admin 링크 완전 미노출, board/푸터 유지 ✓
- AC-INSTALL3-004: 5개 admin 링크 정확히 `/admin/settings/site`, `/admin/menu`, `/admin/site/design`, `/admin/modules`, `/admin/domains` ✓
- AC-INSTALL3-005: 히어로 카피("설치가 성공적으로 완료되었습니다!") + CTA href=`/admin` ✓
- AC-INSTALL3-006: seed.ts diff empty ✓
- AC-INSTALL3-007: 외부 링크 단 1개, `https://github.com/taewook486/rhymix-ts` ✓
- AC-INSTALL3-008: "Powered by Rhymix-TS" 노출(인증/익명 모두), Terms/Privacy 링크 없음, 온보딩 상태와 무관하게 항상 노출 ✓
- 부가 확인: SPEC-INSTALL-002의 자동 로그인 + 헤더 세션 동기화도 함께 정상 동작(헤더에 "admin"/로그아웃 표시)

**전체 회귀 검사** (`pnpm vitest run apps/web`, 마지막 완전 종료 확인된 1회 — 회귀 수정 직전 버전):
- 105 파일 중 14 failed/91 passed, 655 테스트 중 71 failed/584 passed
- 실패 전부 SPEC-TEST-DEBT-001 카탈로그와 1:1 매칭(middleware ~18, proxy ~14, login 5, admin/layout 2, lib/auth/actions.test.ts, feed page 2, widgets/render 1, tRPC document/comment/attachment 라우터 다수) — 신규 회귀 0건
- 회귀 수정(vitest.setup.ts 정리 + OperatorOnboarding mock 보강) 적용 후 재실행은 시간 관계로 중단됨 — **다음 세션에서 1회 재실행하여 동일 결과(또는 그 이상) 확인 필요**

---

## 재계획 게이트 추적

| 반복 | 충족 AC 수 | 에러 delta | 비고 |
|------|-----------|-----------|------|
| (초기) | 0 / 8 | — | plan 단계 |
| (1차 구현) | 8 / 8 | 0(신규 회귀 없음) | Playwright 실브라우저로 8개 AC 전부 검증 완료. 전체 vitest 회귀 재확인만 다음 세션으로 이연 |
