---
id: SPEC-TEST-PRISMA-MOCK-001
title: 공유 완전 Prisma mock 팩토리 도입 (사전 존재 테스트 실패 카테고리 1 해소)
version: 0.1.0
status: completed
created: 2026-06-25
updated: 2026-06-27
author: MoAI manager-spec
priority: P2
phase: 9
parent: SPEC-TEST-DEBT-001
depends-on: [SPEC-TEST-DEBT-001]
issue_number: TBD
language: ko
---

# SPEC-TEST-PRISMA-MOCK-001 — 공유 완전 Prisma mock 팩토리 도입 (Test Infra / P2)

## HISTORY

- 2026-06-25 (v0.1.0): 최초 작성(draft). 상위 triage `SPEC-TEST-DEBT-001` §4.1(카테고리 1) 및 REQ-TDEBT-011을 **확정된 입력**으로 소비하는 후속 수정 SPEC. 근본 원인(테스트별 부분 hand-rolled Prisma mock의 모델 accessor 누락)은 상위 SPEC에서 이미 git-checkout 재현으로 확정되었고 REQ-TDEBT-020에 의해 **재유도 금지** 대상이므로, 본 SPEC은 원인 분석이 아니라 *수정 전략의 요구사항·수용 기준*만 기술한다. 현 상태 정찰로 확인: 영향 파일 9종 전부 존재, `vitest-mock-extended`/`mockDeep`는 현재 미사용(신규 도입 후보), 공유 test-utils 디렉터리 부재, 현 패턴은 파일별 inline `vi.fn()` 모델 스텁(`packages/document`) 및 주입형 `mockPrisma` 객체(`comment.test.ts`)로 triage 서술과 일치. 본 SPEC은 **테스트 인프라 전용** — production/소스 코드 변경 0건, 테스트 대상 동작(behavior under test) 불변.

---

## 1. Overview

### 1.1 목적

상위 triage `SPEC-TEST-DEBT-001`이 카테고리 1로 분류한 **~50+건의 사전 존재 단위 테스트 실패**(에러 시그니처: `TypeError: Cannot read properties of undefined (reading 'findFirst'/'findMany'/'findUnique'/'findUniqueOrThrow'/'create'/'$transaction')`, tRPC 라우터 테스트에서는 이를 감싼 `TRPCError`/`Caused by:` 형태)를 실제로 해소한다.

해소 수단은 REQ-TDEBT-011이 권고한 방향 — **파일별 부분 ad-hoc mock을 공유된 완전(complete) Prisma mock 팩토리로 대체** — 이다. 팩토리는 mock의 *완전성*(코드가 호출할 수 있는 모든 모델·메서드가 정의돼 있음)만 보장하고, **테스트가 검증하는 동작은 바꾸지 않는다**.

### 1.2 본 SPEC이 소비하는 확정 입력 (재유도 금지)

다음은 `SPEC-TEST-DEBT-001` REQ-TDEBT-020에 의해 **확정**된 입력이다. 본 SPEC은 이를 재조사·재정당화하지 않는다:

- **근본 원인(확정):** 테스트 파일이 작성 시점에 필요했던 모델 메서드만 부분적으로 스텁한 hand-rolled mock `ctx.prisma`/mock Prisma client를 만들었고, 이후 서비스/라우터 코드가 더 많은 Prisma 모델을 호출하도록 성장했으나 mock은 갱신되지 않아 누락된 accessor에서 `undefined` 참조가 발생.
- **권장 수정 방향(REQ-TDEBT-011):** 여러 영향 파일에서 재사용되는 공유·완전 Prisma mock 팩토리. 팩토리는 테스트 대상 동작을 변경하지 않고 mock 형태(shape)의 완전성만 채운다.

### 1.3 대상 (Audience)

- manager-tdd / manager-ddd / expert-backend / expert-testing — 본 SPEC의 요구사항·수용 기준을 입력으로 run phase에서 팩토리를 구현하고 영향 파일을 마이그레이션
- MoAI 오케스트레이터 — 구현 위임 및 라이브러리 선택(아래 §5 Open Questions Q1) 결정 중재

### 1.4 본 SPEC이 구현하지 않는 것

`## Exclusions` 참조. 핵심: production/소스 코드 변경 0건, 테스트 대상 동작 불변, 카테고리 2/3/4 미접촉.

---

## 2. Scope

### 2.1 In Scope

- 공유·완전 Prisma mock 팩토리(테스트 헬퍼) 1종 신설.
- 카테고리 1 시그니처로 실패하던 테스트 파일을 팩토리 기반으로 마이그레이션.
- 팩토리가 `PrismaClient`의 모든 모델 delegate(및 각 delegate의 표준 메서드 `findFirst`/`findMany`/`findUnique`/`findUniqueOrThrow`/`create`/`update`/`delete`/`count`/`aggregate`/`groupBy` 등)와 클라이언트 레벨 메서드(`$transaction` 등)를 **정의된 상태(undefined 아님)**로 제공하도록 보장.
- 마이그레이션된 각 테스트가 모델별 반환값을 per-test로 덮어쓸 수 있는(override) 메커니즘 유지.

### 2.2 Out of Scope

- `## Exclusions` 전체 참조. 특히: 카테고리 2(App Router 테스트 환경), 카테고리 3(2FA — 이미 RESOLVED), 카테고리 4(미분류 one-off), production/소스 코드, vitest/vite 설정의 비-mock 변경.

### 2.3 영향 파일 (비전수 — "동일 시그니처를 가진 모든 테스트"가 진짜 경계)

> [HARD] 아래 목록은 triage 시점 스냅샷이며 **비전수**다. 동일 근본 원인 시그니처(누락 Prisma accessor의 `undefined` 참조)를 가진 테스트가 추가로 존재할 수 있다. 수용 기준은 "이 enumerated 목록"이 아니라 **"이 시그니처를 가진 모든 테스트"**를 대상으로 한다(REQ-PMOCK-002). run phase는 착수 시점에 `npx vitest run --reporter=dot 2>&1 | grep "FAIL "`로 현재 실패 집합을 갱신해 본 목록과 대조한다.

triage가 enumerate한 알려진 영향 파일(전부 존재 확인됨):

- `packages/document/src/document.test.ts` (A-9, B-401, B-402, DD-F1, DD-F5, AC-DOC-B1 — `$transaction is not a function` 류)
- `packages/board/src/routes/index-page.test.ts` (IP-1~IP-6)
- `packages/board/src/routes/view-page.test.tsx` (VP-1~VP-7)
- `apps/web/server/api/routers/content/comment.test.ts` (B-801, B-803, B-804, B-805 — `spamDeniedWord`/`spamDeniedIp`/`spamRule` mock 메서드 누락, `checkSpamGuard`(`packages/admin/src/spamfilter/guard.ts:44`)에서 procedure 본문 진입 전 실패)
- `apps/web/server/api/routers/content/document.test.ts` (B-704, B-707, CT-1, CT-2, CT-3)
- `apps/web/server/api/routers/content/attachment.test.ts` (C-1, C-2, list)
- `apps/web/server/api/routers/content/category.test.ts` (CC-1 류)
- `apps/web/server/api/routers/content/search.test.ts` (CS-1, CS-2)
- `apps/web/server/api/routers/admin/category.test.ts` (AC-1)
- `[auditLogger] AdminLog.create failed: TypeError: ... (reading 'create')` 4회 — 동일 계열(audit log mock의 `AdminLog.create` 누락). 발생 위치는 run phase grep으로 핀포인트(REQ-PMOCK-021).

---

## 3. Requirements (EARS Format)

REQ ID는 `REQ-PMOCK-XXX`. 요구사항은 (3.A) 팩토리 자체의 성질, (3.B) 마이그레이션·완결 게이트, (3.C) 불변 경계로 구분한다.

### 3.A 팩토리 성질

**REQ-PMOCK-001** (Ubiquitous) — *P2*: The test infrastructure SHALL provide a single shared Prisma mock factory that returns a mock Prisma client object in which every model delegate and every standard delegate method (`findFirst`, `findMany`, `findUnique`, `findUniqueOrThrow`, `create`, `update`, `delete`, `count`, `aggregate`, `groupBy`) and every client-level method actually invoked by the code under test (notably `$transaction`) is **defined** (a callable mock), so that no access resolves to `undefined`.

**REQ-PMOCK-002** (Ubiquitous) — *P2*: The factory SHALL be reusable across all affected test files; the acceptance target is **any test exhibiting the category-1 root-cause signature** (an `undefined` Prisma accessor / its `$transaction is not a function` and `TRPCError`-wrapped variants), NOT merely the enumerated list in §2.3.

**REQ-PMOCK-003** (Event-Driven) — *P2*: WHEN a migrated test needs a specific return value for a given model method, the factory SHALL allow that test to override the mock per-call (e.g. `mockResolvedValue` on the specific delegate method) without redefining the whole client, so existing per-test assertions remain expressible.

**REQ-PMOCK-004** (State-Driven) — *P2*: WHILE the code under test reaches an inner mock-call chain (e.g. `checkSpamGuard` touching `spamDeniedWord`/`spamDeniedIp`/`spamRule`, or `auditLogger` touching `AdminLog.create`), the factory-provided client SHALL already expose those delegates as defined mocks, so failures inside helper chains (not the procedure under test) no longer occur due to mock incompleteness.

**REQ-PMOCK-005** (Event-Driven) — *P2*: WHEN the underlying Prisma schema gains a new model in the future, the factory SHALL surface that model's delegate as a defined mock **without requiring a manual per-model edit to every test file** (i.e. completeness is derived from the Prisma client type/shape, not hand-enumerated per test). The implementation MAY satisfy this via a typed deep-mock approach; the exact mechanism is a run-phase decision (see Open Questions Q1).

### 3.B 마이그레이션·완결 게이트

**REQ-PMOCK-010** (Event-Driven) — *P2*: WHEN a test file that previously failed with the category-1 signature is migrated to the factory, that file SHALL pass under `npx vitest run` **with the same set of assertions** it had before (assertions MAY be re-expressed mechanically against the factory's override API, but their meaning SHALL NOT change).

**REQ-PMOCK-011** (Event-Driven) — *P2*: WHEN the full enumerated affected-file set (§2.3) plus any additionally discovered same-signature test is migrated, the category-1 failure count SHALL drop to **zero** as measured by the absence of the `undefined` Prisma accessor signature across the affected suites.

**REQ-PMOCK-012** (Unwanted) — *P2*: The migration SHALL NOT introduce any new test failure or regression in previously-passing tests; the net change to the suite SHALL be "category-1 failures removed, nothing else broken".

**REQ-PMOCK-013** (Event-Driven) — *P2*: WHEN a new dependency (e.g. `vitest-mock-extended`) is added to satisfy REQ-PMOCK-005, it SHALL be added as a `devDependency` only and SHALL NOT appear in any production dependency graph.

### 3.C 불변 경계 (Behavior-Preservation Firewall)

**REQ-PMOCK-020** (Unwanted) — *P2*: The factory and its adoption SHALL NOT alter the behavior under test — only the **completeness of the mock shape**. No production source file (any file outside test files / test-helper files) SHALL be modified by this SPEC.

**REQ-PMOCK-021** (Event-Driven) — *P2*: WHEN the location of a not-yet-pinpointed same-signature failure is needed (e.g. the 4× `[auditLogger] AdminLog.create failed`), it SHALL be located by grep/run during the run phase and folded into the migration — but its discovery SHALL NOT expand scope beyond category-1 (mock completeness).

**REQ-PMOCK-022** (Unwanted) — *P2*: This SPEC SHALL NOT re-analyze or re-derive the category-1 root cause (confirmed in SPEC-TEST-DEBT-001 per REQ-TDEBT-020); it consumes that finding directly and proceeds to the fix.

**REQ-PMOCK-023** (Unwanted) — *P2*: This SPEC SHALL NOT touch category 2 (Next.js App Router test env: `middleware.test.ts`, `proxy.test.ts`, `login/page.test.tsx`, `admin/layout.test.tsx`), category 3 (2FA — already RESOLVED; `trpc.two-factor.test.ts` SHALL remain untouched), or category 4 (misc one-off).

---

## 4. Disposition / 전략 메모

- **단일 출처 팩토리.** 현재 공유 test-utils 디렉터리가 없으므로(정찰 확인), 모노레포 순환 의존을 피할 위치에 팩토리를 둔다(Open Questions Q2). 후보: 테스트 전용 공유 패키지(`packages/test-utils` 신설) vs 각 영역 내부 헬퍼 + 얇은 공유. run phase가 결정.
- **완전성의 출처.** 현재 패턴은 모델별 `vi.fn()`을 손으로 나열한다(`packages/document/src/document.test.ts`). 손 나열은 미래 모델 추가 시 재발하므로, 완전성을 Prisma 클라이언트 타입에서 파생하는 deep-mock(예: `vitest-mock-extended`의 `mockDeep<PrismaClient>()`)을 후보로 평가하되, 라이브러리 채택 여부·범위는 run phase 구현 결정(REQ-PMOCK-005, Open Questions Q1).
- **오버라이드 보존.** 마이그레이션은 "mock 골격은 팩토리에서, 반환값 셋업은 각 테스트에서"로 분리한다. 기존 단언의 *의미*는 보존(REQ-PMOCK-010).
- **회귀 방지.** 영향 파일 외 통과 테스트가 깨지지 않아야 한다(REQ-PMOCK-012). 마이그레이션은 파일 단위로 진행하고 각 단위 후 해당 패키지 스위트를 재실행한다.

---

## 5. Open Questions

- **Q1 (라이브러리 선택).** 완전성 파생을 `vitest-mock-extended`의 `mockDeep<PrismaClient>()`로 할지, 자체 typed proxy 헬퍼로 할지. **본 SPEC은 강제하지 않는다(REQ-PMOCK-005가 메커니즘 비강제)** — run phase가 결정. 현재 `vitest-mock-extended` 미사용이므로 채택 시 신규 devDependency(REQ-PMOCK-013).
- **Q2 (팩토리 위치).** 모노레포에서 순환 의존을 피하면서 `apps/web`과 `packages/*` 양쪽 테스트가 import할 수 있는 위치. 신설 `packages/test-utils`가 유력하나 빌드 그래프 영향은 run phase가 검토.
- **Q3 (동일 시그니처 전수 식별).** §2.3은 비전수다. run phase 착수 시 `npx vitest run --reporter=dot 2>&1 | grep "FAIL "` 스냅샷으로 현재 동일-시그니처 실패 전수를 확정하고 enumerate 목록과 대조한다(REQ-PMOCK-002/021).
- **Q4 (`$transaction` 콜백 형태).** `$transaction`이 배열 형태와 콜백 형태(`tx => ...`) 둘 다로 호출되는지에 따라 팩토리의 `$transaction` 기본 구현이 콜백에 동일 mock 클라이언트를 전달해야 할 수 있음 — `packages/document`의 `$transaction is not a function` 사례에서 run phase가 호출 형태를 확인해 반영.

---

## Exclusions (What NOT to Build)

[HARD] 본 SPEC은 다음을 **구현하지 않는다**. 본 SPEC은 테스트 인프라 전용이며 테스트 대상 동작을 바꾸지 않는다.

1. **production/소스 코드 변경** — 테스트 파일·테스트 헬퍼 파일 외 어떤 파일도 수정하지 않는다. mock 완전성만 채우고 동작은 불변(REQ-PMOCK-020).
2. **카테고리 1 근본 원인 재분석** — 원인은 SPEC-TEST-DEBT-001에서 확정(REQ-TDEBT-020). 재유도·재정당화하지 않는다(REQ-PMOCK-022).
3. **카테고리 2 (Next.js App Router 테스트 환경)** — `middleware.test.ts`/`proxy.test.ts`/`login/page.test.tsx`/`admin/layout.test.tsx`. 다른 근본 원인, 별도 후속 SPEC. 미접촉(REQ-PMOCK-023).
4. **카테고리 3 (2FA 미들웨어)** — 직전 세션에서 이미 RESOLVED. `trpc.two-factor.test.ts`를 재차 건드리지 않는다(REQ-PMOCK-023).
5. **카테고리 4 (기타 one-off)** — server-only 해석, next-auth 모듈 해석, `vi.mock` 누락, Zod 스키마 불일치, 타임아웃, 이미지/업로드 토큰 등 개별 원인. 본 SPEC 범위 밖(REQ-PMOCK-023).
6. **vitest/vite 설정의 비-mock 변경** — devDependency 추가(REQ-PMOCK-013) 외 테스트 러너 환경 설정 변경은 다루지 않는다.
7. **테스트 커버리지 확대·신규 테스트 케이스 추가** — 본 SPEC은 기존 실패를 *완전한 mock으로 통과*시키는 것이지 새 동작을 검증하는 테스트를 추가하는 것이 아니다.

---

## Implementation Notes

- run phase 착수 시 `npx vitest run --reporter=dot 2>&1 | grep "FAIL "`로 현재 카테고리 1 실패 전수를 갱신(Q3). enumerate 목록(§2.3)은 비전수 스냅샷.
- 정찰 확인 사실(2026-06-25): 영향 파일 9종 전부 존재. `vitest-mock-extended`/`mockDeep` 현재 미사용. 공유 test-utils 디렉터리 부재. 현 패턴은 inline `vi.fn()` 모델 스텁 + 주입형 `mockPrisma` 객체.
- 마이그레이션은 파일 단위(또는 패키지 단위)로 진행하고 각 단위 후 해당 스위트 재실행으로 회귀 0 확인(REQ-PMOCK-012).
- production 코드를 단 한 줄도 건드리지 않는 것이 본 SPEC의 합격 전제다(REQ-PMOCK-020) — 만약 마이그레이션 중 "테스트를 통과시키려면 소스를 고쳐야 한다"는 상황이 발견되면 그것은 카테고리 1(mock 갭)이 아니라 실제 제품 버그이므로, 본 SPEC에서 고치지 말고 별도 항목으로 분리해 보고한다.

---

Version: 0.1.0
Status: draft (구현 대기 — run phase 위임 대상)
Next Action: `/moai run SPEC-TEST-PRISMA-MOCK-001` — 팩토리 라이브러리·위치 결정(Q1/Q2) 후 영향 파일 마이그레이션, 카테고리 1 실패 0건·회귀 0건 검증.
