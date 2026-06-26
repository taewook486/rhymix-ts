# SPEC-TEST-PRISMA-MOCK-001 — Acceptance Criteria

> Given-When-Then 시나리오. 측정 가능한 증거(vitest 출력, git diff 경로) 기준. 대상은 "enumerated 목록"이 아니라 **카테고리 1 시그니처를 가진 모든 테스트**(REQ-PMOCK-002).

## 핵심 시나리오

### AC-PMOCK-1 — 공유 팩토리가 완전한 mock 클라이언트를 제공한다 (REQ-PMOCK-001/004/005)
- **Given** 신설된 공유 Prisma mock 팩토리
- **When** 팩토리로 mock Prisma 클라이언트를 생성하고 임의의 모델 delegate의 표준 메서드(`findFirst`/`findMany`/`findUnique`/`findUniqueOrThrow`/`create`/`update`/`delete`/`count`) 및 클라이언트 메서드 `$transaction`에 접근
- **Then** 어떤 접근도 `undefined`가 아니라 호출 가능한 mock을 반환한다(팩토리 자기-검증 테스트 PASS).

### AC-PMOCK-2 — 파일럿 파일이 동일 단언 의미로 통과한다 (REQ-PMOCK-010/004)
- **Given** 카테고리 1 시그니처로 실패하던 `apps/web/server/api/routers/content/comment.test.ts`
- **When** 팩토리 기반으로 마이그레이션하고 `checkSpamGuard`(`spamDeniedWord`/`spamDeniedIp`/`spamRule` 내부 체인)를 통과하는 경로를 실행
- **Then** B-801/B-803/B-804/B-805가 PASS하며, 각 단언의 *의미*는 마이그레이션 전과 동일하다(override API로 기계적으로만 재표현).

### AC-PMOCK-3 — `$transaction` 사례가 해소된다 (REQ-PMOCK-001, Q4)
- **Given** `packages/document/src/document.test.ts`의 `$transaction is not a function` 류 실패(A-9, B-401, B-402, DD-F1, DD-F5, AC-DOC-B1)
- **When** 팩토리 기반으로 마이그레이션(콜백형 `$transaction`이면 콜백에 동일 mock 클라이언트 전달)
- **Then** 해당 케이스가 PASS하고 `$transaction is not a function`이 더 이상 발생하지 않는다.

### AC-PMOCK-4 — 카테고리 1 실패가 0건이 된다 (REQ-PMOCK-011)
- **Given** §2.3 enumerate 파일 + run phase에서 추가 식별된 동일-시그니처 테스트 전부 마이그레이션 완료
- **When** `npx vitest run --reporter=dot 2>&1 | grep -E "undefined \(reading '(findFirst|findMany|findUnique|findUniqueOrThrow|create|\$transaction)'\)"`
- **Then** 영향 스위트에서 해당 시그니처 매치가 0건이다.

### AC-PMOCK-5 — 회귀 0 / 동작 불변 (REQ-PMOCK-012/020)
- **Given** 마이그레이션 전 통과하던 모든 테스트
- **When** 전체 `npx vitest run`를 마이그레이션 후 실행하고, 마이그레이션 커밋의 `git diff --name-only`를 검사
- **Then** (a) 마이그레이션 전 통과 테스트 중 새로 실패한 것이 0건이고(순변화는 "카테고리 1 실패 제거"만), (b) 변경 파일 경로가 **테스트 파일·테스트 헬퍼 파일에 한정**되어 production 소스 변경이 0건이다.

## 엣지 케이스

- **EC-1 — 4× `[auditLogger] AdminLog.create failed` 위치 미상.** run phase grep으로 핀포인트(REQ-PMOCK-021). 동일 mock-완전성 처리로 해소되며, 위치 발견이 범위를 카테고리 1 밖으로 확장하지 않는다.
- **EC-2 — 숨은 제품 버그.** 완전 mock 적용 후 테스트가 *다른*(비-시그니처) 이유로 실패하면, 그것은 mock 갭이 아닌 실제 버그다. 본 SPEC에서 소스를 고치지 않고 별도 항목으로 분리 보고한다(REQ-PMOCK-020). 이때 해당 테스트는 본 SPEC의 완결 게이트(AC-PMOCK-4) 집계에서 제외하고 사유를 명시.
- **EC-3 — 신규 동일-시그니처 파일 발견.** enumerate 목록 밖에서 동일 시그니처 실패가 추가 발견되면 본 SPEC 범위에 포함해 마이그레이션한다(REQ-PMOCK-002).
- **EC-4 — devDependency 누수.** 라이브러리 채택 시 production dependency 그래프에 나타나면 실패. devDependencies 한정 확인(REQ-PMOCK-013).

## 범위 외 확인 (Negative — 건드리면 실패)

- **NEG-1** `apps/web/middleware.test.ts`, `proxy.test.ts`, `app/(auth)/login/page.test.tsx`, `app/admin/layout.test.tsx`(카테고리 2)가 본 SPEC 커밋에서 변경되지 않았다.
- **NEG-2** `apps/web/server/api/trpc.two-factor.test.ts`(카테고리 3, RESOLVED)가 변경되지 않았다.
- **NEG-3** 카테고리 4 one-off 파일들(install-validate, db-validator, actions, admin-helpers, diagnostics, login-info/content 위젯, render, feed/page 등)이 본 SPEC 커밋에서 변경되지 않았다.

## Definition of Done

- [ ] 공유 Prisma mock 팩토리 신설 + 자기-검증 테스트 PASS (AC-PMOCK-1)
- [ ] 파일럿(comment.test.ts) 마이그레이션 + 동일 단언 의미 보존 (AC-PMOCK-2)
- [ ] §2.3 enumerate 파일 + 추가 식별 동일-시그니처 파일 전수 마이그레이션 (AC-PMOCK-3, EC-3)
- [ ] 영향 스위트에서 카테고리 1 시그니처 0건 (AC-PMOCK-4)
- [ ] 전체 vitest 회귀 0건 + production 소스 변경 0건(git diff 경로 검사) (AC-PMOCK-5)
- [ ] (라이브러리 채택 시) devDependencies 한정 (EC-4)
- [ ] 카테고리 2/3/4 미접촉 (NEG-1/2/3)
- [ ] 마이그레이션 중 발견한 숨은 제품 버그(있다면)는 본 SPEC에서 고치지 않고 별도 항목으로 분리 보고 (EC-2)
