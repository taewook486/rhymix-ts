---
id: SPEC-ADDON-001
title: Implementation Plan — Addon System Declarative Hook Registry
version: 1.0.0
created: 2026-05-30
updated: 2026-05-30
parent: SPEC-ADDON-001/spec.md
language: ko
---

# SPEC-ADDON-001 — Implementation Plan

## HISTORY

- 2026-05-30 (v1.0.0): 최초 작성. 2개 슬라이스(Registry/Config/Executor/Admin UI + 통합 지점)로 분해. 예상 테스트 18개. MASTER-PLAN-002 §5.10 추정치 일치.

---

## 1. Overview

본 plan은 SPEC-ADDON-001의 구현 작업을 2개 슬라이스로 분해하여 우선순위와 작업 항목을 명시한다. 모든 작업은 TDD(quality.yaml `development_mode: tdd` 기본값) 사이클을 따른다.

### 1.1 Goal Recap

- 4개 hook 타입(`onContentTransform`, `onUserRender`, `onPageView`, `onAdminAction`)을 정의하고 그것들을 안전하게 실행하는 registry/executor 구축.
- AddonConfig DB 모델로 활성 상태/순서/자동 비활성화 사유 영속화.
- admin/addons UI로 운영자가 토글/재정렬/재활성화 가능.
- page/document/comment 렌더러, middleware, admin Server Action에 hook 실행 지점 통합.

### 1.2 Non-Goals (plan 범위 외 — spec.md §1.3 참조)

- 6개 레거시 addon의 실제 핸들러 구현(별도 후속 SPEC)
- plugin loader / 외부 addon 배포 메커니즘
- sandboxing
- drag-drop 순서 UI

---

## 2. Slice 분해 및 우선순위

### Priority High: Slice A — Registry + Config + Executor + Admin UI

목적: addon 시스템의 코어 인프라(레지스트리, 영속화 모델, 실행기, 관리자 UI) 구축.

선행 조건: 없음(Slice B의 선행).

#### A.1 작업 항목

1. **`packages/core/src/addons/types.ts`** 신규
   - `HookType` union: `'onContentTransform' | 'onUserRender' | 'onPageView' | 'onAdminAction'`
   - 4개 hook 시그니처 타입 (per REQ-ADDON-002~005)
   - `AddonContext`, `AddonUser`, `AddonDefinition`, `AddonAlreadyRegisteredError`
2. **`packages/core/src/addons/registry.ts`** 신규
   - module-level `Map<string, AddonDefinition>`
   - `registerAddon`, `getAddon`, `listAddons`, `resetAddonRegistry`
   - HMR idempotent guard(REQ-ADDON-012)
3. **`packages/core/src/addons/builtin/index.ts`** 신규
   - 빈 barrel(Phase 4 시점에 등록할 빌트인 없음). 후속 SPEC이 여기 import 추가.
4. **`packages/db/prisma/schema.prisma`** 수정 — `AddonConfig` 모델 추가
   - 필드: `name String @id`, `enabled Boolean @default(true)`, `priority Int @default(0)`, `lastDisabledAt DateTime?`, `lastDisabledReason String?`, `createdAt`, `updatedAt`, `@@map("addon_configs")`
   - Migration 명: `addon-config`
5. **`packages/core/src/addons/config.ts`** 신규
   - `listEffectiveAddons(ctx)`: registry × AddonConfig 조인 → enabled 정렬
   - `ensureAddonConfig(name, defaultPriority, prisma)`: idempotent upsert
   - `toggleAddon(name, enabled, ctx)`, `setAddonPriority(name, priority, ctx)`, `reenableAddon(name, ctx)` — 모두 AdminLog 동시 기록
   - `autoDisableAddon(name, reason, ctx)`: 자동 비활성화 + AdminLog 기록, idempotent within request
6. **`packages/core/src/addons/executor.ts`** 신규
   - `runContentTransform`, `runUserRender`, `runPageView`, `runAdminAction`
   - 순차 `for...of` + `await` 실행(REQ-ADDON-032)
   - try/catch 단위로 격리 + `autoDisableAddon` 호출(REQ-ADDON-033)
   - `signal?: AbortSignal` 지원(REQ-ADDON-035)
7. **`apps/web/app/admin/addons/page.tsx`** 신규
   - addon 목록 RSC: 등록된 것 + AddonConfig 머지
   - 활성/비활성 토글 + priority 숫자 입력 + 자동 비활성화 항목 시각화 + Re-enable 버튼
   - 비관리자 차단(기존 admin layout 가드 재사용)
8. **Server Actions** (`apps/web/app/admin/addons/actions.ts` 신규)
   - `toggleAddonAction(name, enabled)`
   - `setAddonPriorityAction(name, priority)` (multi-update atomic)
   - `reenableAddonAction(name)`
   - 모두 `config.ts`의 함수 호출 + 비관리자 검증

#### A.2 단위 테스트 (Slice A — 13+ tests)

| 파일 | 테스트 | 검증 항목 | EARS |
|---|---|---|---|
| `addons/registry.test.ts` | register/get/list | 기본 동작, 모르는 이름 → undefined | REQ-ADDON-010, 013 |
| 〃 | duplicate registration error | 동일 이름 두 번 register → throw | REQ-ADDON-012 |
| 〃 | HMR idempotent guard | 같은 모듈 재import 안전 | REQ-ADDON-012 |
| `addons/config.test.ts` | first-execution upsert | 빈 DB → ensureAddonConfig 호출 → 행 생성 | REQ-ADDON-022, 025 |
| 〃 | toggle + AdminLog | toggleAddon → enabled 변경 + AdminLog 1행 | REQ-ADDON-023 |
| 〃 | reorder + AdminLog | setAddonPriority → priority 변경 + AdminLog 1행 | REQ-ADDON-024 |
| 〃 | autoDisable idempotent within request | 같은 요청 내 두 번 호출 → AdminLog 1행만 | REQ-ADDON-037 |
| `addons/executor.test.ts` | sequential 순차 실행 | priority 10, 20 → 10 먼저 실행 | REQ-ADDON-031, 032 |
| 〃 | onContentTransform 체인 | N의 출력이 N+1 입력 | REQ-ADDON-031 |
| 〃 | 예외 격리 + auto-disable | 핸들러 throw → 해당 addon 비활성화 + 체인 계속 | REQ-ADDON-033 |
| 〃 | onUserRender merge (later wins) | priority 10 icon=A, priority 20 icon=B → 결과 icon=B | REQ-ADDON-034 |
| 〃 | AbortSignal cancellation | 두 번째 핸들러 직전 abort → 첫 핸들러 결과만 반영 | REQ-ADDON-035 |
| 〃 | empty effective set no-op | 등록 addon 0개 → 원본 input 그대로 반환 | REQ-ADDON-036 |
| `admin/addons/actions.test.ts` | toggle action / 비관리자 차단 | 관리자 → 정상, 비관리자 → 401 | REQ-ADDON-051, 054 |
| 〃 | 멀티 priority update 트랜잭션 | 2개 행 priority 동시 변경 → 모두 적용 또는 모두 롤백 | REQ-ADDON-052 |

#### A.3 검증

- `pnpm tsc --noEmit` 0 error
- `pnpm --filter @rhymix-ts/db prisma migrate dev --name addon-config` 성공
- `pnpm test packages/core` 통과
- `pnpm test apps/web` 통과(admin/addons 영역)

#### A.4 EARS coverage

REQ-ADDON-001~016, REQ-ADDON-020~025, REQ-ADDON-030~039, REQ-ADDON-050~055, REQ-ADDON-070~078

---

### Priority Medium: Slice B — 기존 렌더러 / Middleware 통합

목적: Slice A의 executor를 page/document/comment 렌더링, middleware, admin Server Action에 endpoint로 연결.

선행 조건: Slice A 완료(executor가 stable 시그니처를 제공).

#### B.1 작업 항목

1. **page 렌더러 통합** (`apps/web/app/[mid]/page.tsx` 또는 page 모듈 디스패치 위치)
   - `renderBodyWithWidgets` 호출 결과(React 노드 트리 또는 위젯 사이 정적 세그먼트)에 `runContentTransform` 적용.
   - §5.6 패턴 B(위젯 사이 세그먼트만 transform). 위젯 출력 자체는 transform하지 않음.
   - REQ-ADDON-060, 066
2. **document 렌더러 통합** (`packages/document/src/...` body 렌더 경로)
   - 문서 본문을 `runContentTransform` → sanitize → DOM 주입.
   - REQ-ADDON-061
3. **comment 렌더러 통합** (`packages/comment/src/...` body 렌더 경로)
   - 댓글 본문 동일 패턴.
   - REQ-ADDON-062
4. **middleware / route after-effect** (`apps/web/middleware.ts` 또는 `/[mid]` 라우트의 after-effect)
   - 200 응답 직후 `runPageView(mid, ctx)` 발사. response 블록 안 함.
   - REQ-ADDON-063
5. **admin Server Action 통합** — 기존 AdminLog를 쓰는 모든 admin Server Action에 `runAdminAction(action, payload, ctx)` 발사 추가
   - AdminLog 쓰기 자체는 변경 없음. addon hook이 추가 callout일 뿐.
   - REQ-ADDON-064
6. **`apps/web/components/user/AddonDecoratedUser.tsx`** 신규
   - `<AddonDecoratedUser user={...}>` wrapper. 내부에서 `runUserRender` 호출 → 결과 `icon`/`badge` 적용.
   - Phase 4 시점에 실제 핸들러는 없으므로 시각적 변화 없음. wrapper만 준비.
   - REQ-ADDON-065

#### B.2 통합 테스트 (Slice B — 5+ tests + 1 e2e)

| 파일 | 테스트 | 검증 항목 | EARS |
|---|---|---|---|
| `apps/web/app/[mid]/page.integration.test.ts` | page 렌더 + content transform pipeline | 모킹된 transform 핸들러 등록 → 페이지 본문 transform 결과 포함 | REQ-ADDON-060, 066 |
| `packages/document/src/render.test.ts` | document 본문 + content transform | document 본문 transform 적용 | REQ-ADDON-061 |
| `packages/comment/src/render.test.ts` | comment 본문 + content transform | comment 본문 transform 적용 | REQ-ADDON-062 |
| `apps/web/middleware.test.ts` | onPageView 발사 | 200 응답 후 `runPageView` 호출 검증(스파이) | REQ-ADDON-063 |
| `apps/web/app/admin/<some>/actions.integration.test.ts` | onAdminAction 발사 | 성공한 admin action 후 `runAdminAction` 호출 검증 | REQ-ADDON-064 |
| `apps/web/e2e/addon-content-transform.spec.ts` | e2e: 가짜 핸들러 활성화 → document 페이지 방문 → transform 결과 노출 | 전 경로 통합 검증 | REQ-ADDON-074, 075 |

#### B.3 검증

- `pnpm test apps/web` 통과(통합 영역)
- `pnpm test packages/document packages/comment` 통과
- e2e: `pnpm playwright test apps/web/e2e/addon-content-transform.spec.ts` 통과
- 가짜 transform 핸들러를 등록 → 실제 사이트 페이지에서 transform이 적용되는 것을 e2e로 확인

#### B.4 EARS coverage

REQ-ADDON-060~068, REQ-ADDON-074, REQ-ADDON-075

---

## 3. File List

### Slice A 신규 / 수정 파일

| 경로 | 종류 | 비고 |
|---|---|---|
| `packages/core/src/addons/types.ts` | 신규 | 4 hook 타입 + Context/User/Definition |
| `packages/core/src/addons/registry.ts` | 신규 | Map-based registry + HMR guard |
| `packages/core/src/addons/config.ts` | 신규 | listEffective/ensure/toggle/setPriority/autoDisable/reenable |
| `packages/core/src/addons/executor.ts` | 신규 | 4개 executor + 예외 격리 + AbortSignal |
| `packages/core/src/addons/builtin/index.ts` | 신규 | 빈 barrel(후속 SPEC이 채움) |
| `packages/core/src/addons/index.ts` | 신규 | 패키지 진입 — 위 모듈 re-export |
| `packages/core/src/index.ts` | 수정 | `export * from './addons'` 추가 |
| `packages/db/prisma/schema.prisma` | 수정 | `AddonConfig` model 추가 |
| `packages/db/prisma/migrations/<timestamp>_addon_config/migration.sql` | 신규 | Prisma 자동 생성 |
| `apps/web/app/admin/addons/page.tsx` | 신규 | RSC: 목록 + 토글/순서 UI |
| `apps/web/app/admin/addons/actions.ts` | 신규 | Server Actions(toggle/reorder/reenable) |
| `apps/web/app/admin/addons/AddonRow.tsx` | 신규 | client island(스위치 + 숫자 입력) |
| 테스트 파일 (Slice A 테이블 참조) | 신규 | Vitest 단위/통합 테스트 |

### Slice B 신규 / 수정 파일

| 경로 | 종류 | 비고 |
|---|---|---|
| `apps/web/app/[mid]/page.tsx` | 수정 | post-widget body에 `runContentTransform` 적용 |
| `packages/document/src/render.ts`(혹은 동등) | 수정 | document 본문 transform 통합 |
| `packages/comment/src/render.ts`(혹은 동등) | 수정 | comment 본문 transform 통합 |
| `apps/web/middleware.ts` (혹은 라우트 after-effect) | 수정 | onPageView 발사 |
| `apps/web/app/admin/<existing actions>` | 수정 | 각 admin action에 `runAdminAction` 발사 추가 |
| `apps/web/components/user/AddonDecoratedUser.tsx` | 신규 | runUserRender wrapper |
| 테스트 파일 (Slice B 테이블 참조) | 신규 | 통합 테스트 + e2e |

---

## 4. Implementation Order

Slice 내부의 작업 순서(TDD RED → GREEN → REFACTOR 사이클 가정):

### Slice A 권장 순서

1. types.ts (signature 확정)
2. registry.ts + registry.test.ts (단순, 의존 없음)
3. schema.prisma + migration 생성 + 적용
4. config.ts + config.test.ts (registry + DB 의존)
5. executor.ts + executor.test.ts (config + registry 의존)
6. admin/addons Server Actions + actions.test.ts
7. admin/addons page.tsx + AddonRow.tsx
8. 전체 회귀: `pnpm tsc --noEmit`, 단위 테스트 통과

### Slice B 권장 순서

1. page 렌더러 통합(가장 영향 큼 → 단위 테스트 우선)
2. document/comment 렌더러 통합(동형 패턴)
3. middleware/route after-effect로 onPageView 통합
4. admin Server Action들에 onAdminAction 통합(grep 기반 일괄)
5. AddonDecoratedUser wrapper 신규
6. e2e 1건 작성 및 통과 확인

---

## 5. Risks & Mitigations

| Risk | Mitigation | Owner Slice |
|---|---|---|
| Prisma migration 적용이 기존 환경 깸 | additive-only(테이블 신규 추가) — 기존 데이터 무손실(REQ-ADDON-020) | A |
| executor가 throw하는 핸들러로 사이트 다운 | try/catch + auto-disable + identity transform 보장(REQ-ADDON-033, 036). 단위 테스트로 회귀 방지 | A |
| Slice B 통합 시 위젯 출력까지 transform되어 결과 깨짐 | REQ-ADDON-066 명시 + 패턴 B 구현 + 단위 테스트로 보장 | B |
| 통합 사이트가 너무 많아 누락 발생 | grep 기반 admin action 일괄 식별 + checklist 작성. 누락된 사이트는 일반 코드처럼 사후 추가 가능(시스템 동작에 치명 영향 없음) | B |
| AddonConfig와 registry 불일치(DB orphan 행) | `listEffectiveAddons`에서 `getAddon !== undefined` 필터링. orphan은 admin UI에서 향후 stale 라벨로 시각화(현재는 단순 미표시) | A |

---

## 6. Test Strategy

| 항목 | 값 |
|---|---|
| 예상 테스트 수 | **18+** (Slice A: 13+, Slice B: 5+ 통합 + 1 e2e) — master plan §5.10 추정치 일치 |
| 단위 테스트 프레임워크 | Vitest |
| 통합 테스트 프레임워크 | Vitest + msw 또는 Prisma test client |
| e2e 프레임워크 | Playwright |
| 커버리지 목표 | 신규 코드 85% 이상(REQ-ADDON-070) |
| 회귀 테스트 | 기존 packages/core / packages/page / packages/document / packages/comment 단위 테스트 모두 통과 |

---

## 7. Acceptance Sign-off

본 plan이 완료되었다고 판단하는 기준(spec.md §4 acceptance criteria와 일치):

- [ ] AC-ADDON-A1: 순차 체인 transform 동작
- [ ] AC-ADDON-A2: 예외 throw 핸들러 → auto-disable + AdminLog
- [ ] AC-ADDON-A3: 빈 AddonConfig에서 effective 목록 = registered 전체(default priority)
- [ ] AC-ADDON-B1: page 렌더 시 위젯 먼저, content transform 그 다음 (순서 보장)

모든 AC가 통과하면 `<moai>DONE</moai>`.

---

Version: 1.0.0
Status: draft (awaiting plan-auditor + user approval)
