# SPEC-TEST-PRISMA-MOCK-001 — Implementation Plan

> 본 plan은 우선순위 기반 마일스톤으로 기술한다(시간 추정 없음). 상위 입력은 `SPEC-TEST-DEBT-001` §4.1 / REQ-TDEBT-011이며 근본 원인은 재유도하지 않는다(REQ-PMOCK-022).

## 기술 접근 (Technical Approach)

테스트별로 손으로 나열한 부분 Prisma mock을, **Prisma 클라이언트 형태에서 완전성이 파생되는 단일 공유 팩토리**로 대체한다. 팩토리는 mock 골격(모든 모델 delegate + 표준 메서드 + `$transaction` 등 클라이언트 메서드를 정의된 mock으로)만 제공하고, 각 테스트는 필요한 반환값만 per-call override 한다. 테스트 대상 동작은 불변(REQ-PMOCK-020).

핵심 설계 결정 2건(run phase에서 확정):
1. **완전성의 출처** — `vitest-mock-extended`의 `mockDeep<PrismaClient>()`(신규 devDependency) vs 자체 typed proxy. REQ-PMOCK-005는 메커니즘을 강제하지 않음.
2. **팩토리 위치** — `apps/web`과 `packages/*` 양쪽 테스트가 순환 의존 없이 import할 위치(유력: 신설 `packages/test-utils`).

## 마일스톤 (우선순위 순)

### M1 — 팩토리 설계·신설 (Priority High)
- Q1(라이브러리)·Q2(위치) 결정. 결정 근거를 progress.md에 기록.
- 공유 Prisma mock 팩토리 헬퍼 1종 작성: 모든 모델 delegate + 표준 메서드 + `$transaction`(콜백/배열 형태 모두 — Q4) 정의된 mock 제공, per-test override API 노출(REQ-PMOCK-001/003/005).
- devDependency 추가 시 devDependencies 한정(REQ-PMOCK-013).
- 산출물: 팩토리 헬퍼 파일 + 팩토리 자체의 자기-검증 테스트(모든 delegate가 defined임을 단언).

### M2 — 대표 파일 1종 파일럿 마이그레이션 (Priority High)
- `apps/web/server/api/routers/content/comment.test.ts`를 파일럿으로 마이그레이션(주입형 `mockPrisma` 패턴 + `checkSpamGuard`의 `spamDeniedWord`/`spamDeniedIp`/`spamRule` 내부 체인 — REQ-PMOCK-004 대표).
- 동일 단언 의미 보존 확인(REQ-PMOCK-010). 패키지 스위트 재실행으로 회귀 0(REQ-PMOCK-012).
- 파일럿에서 override API의 ergonomics를 검증하고 필요 시 M1 팩토리 보정.

### M3 — 잔여 영향 파일 전수 마이그레이션 (Priority High)
- `npx vitest run --reporter=dot 2>&1 | grep "FAIL "`로 현재 동일-시그니처 실패 전수 갱신(Q3, REQ-PMOCK-002).
- §2.3 enumerate 파일(packages/document, packages/board ×2, content/document·attachment·category·search, admin/category) 마이그레이션.
- 4× `[auditLogger] AdminLog.create failed` 위치를 grep으로 핀포인트해 동일 처리(REQ-PMOCK-021).
- 각 파일/패키지 단위 후 재실행, 회귀 0 유지.

### M4 — 완결 게이트 검증 (Priority Medium)
- 영향 스위트 전체에서 카테고리 1 시그니처(`undefined` Prisma accessor / `$transaction is not a function` / TRPCError 래핑) **0건** 확인(REQ-PMOCK-011).
- 전체 `npx vitest run`로 신규 회귀 0 확인(REQ-PMOCK-012). 마이그레이션 전/후 통과 수 델타가 "카테고리 1 실패만 감소"임을 확인.
- production 소스 변경 0건 확인(git diff 경로 검사 — 테스트/헬퍼 파일만, REQ-PMOCK-020).

## 위험 (Risks)

- **R1 — 숨은 제품 버그 노출.** 완전한 mock으로 바꾸면 그동안 mock 갭에 가려졌던 실제 분기가 처음 실행될 수 있음. 이 경우 테스트가 *다른* 이유로 실패할 수 있다. 대응: 그것은 카테고리 1이 아니므로 본 SPEC에서 소스를 고치지 않고 별도 항목으로 분리 보고(REQ-PMOCK-020 Implementation Notes).
- **R2 — `$transaction` 콜백 형태 불일치.** 콜백형 `$transaction(tx => ...)`에 mock 클라이언트를 전달하지 않으면 새로운 undefined가 발생. 대응: Q4 — 호출 형태 확인 후 콜백에 동일 mock 전달.
- **R3 — 팩토리 위치 순환 의존.** 공유 패키지 위치 선택이 모노레포 빌드 그래프에 순환을 유발할 수 있음. 대응: test-전용 패키지로 격리, production 빌드 그래프와 분리(devDependency).
- **R4 — 과대 마이그레이션(scope creep).** 통과 중인 테스트까지 "정리" 욕구. 대응: 카테고리 1 시그니처를 가진 파일만 대상(REQ-PMOCK-002), 그 외 미접촉(Scope Discipline).

## 의존성

- 입력: `SPEC-TEST-DEBT-001` §4.1 / REQ-TDEBT-011 (확정, 재유도 금지).
- 외부: (선택) `vitest-mock-extended` devDependency.

## 전문가 권장 (Expert Consultation)

- **expert-backend** — 팩토리 설계 및 서비스/라우터가 실제 호출하는 Prisma 모델 인벤토리(완전성 검증). 상위 triage §6과 일치.
- **expert-testing** — 마이그레이션 패턴·override API ergonomics·회귀 게이트.
