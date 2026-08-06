---
id: SPEC-POINT-001-plan
title: 포인트 시스템 구현 계획 (Implementation Plan)
created: 2026-05-27
status: draft
parent: SPEC-POINT-001
language: ko
---

# Plan — SPEC-POINT-001 구현 계획

본 문서는 SPEC-POINT-001 spec.md의 EARS 요구사항을 2개 슬라이스로 분해하고, 각 슬라이스의 작업 항목, 산출 파일, 테스트 스캐폴드, acceptance gate를 정의한다.

---

## 0. 사전 준비 (Pre-flight)

### 0.1 의존 SPEC 확인

- SPEC-AUTH-001 완료 — `Actor` type, `User` 모델, signup 트랜잭션 진입점 (`packages/auth/src/signup.ts`) 가용
- SPEC-ADMIN-001 완료 — `ModuleConfig` 모델, admin shell 미들웨어 (`apps/web/app/admin/**` RBAC)
- SPEC-DOCUMENT-001 진행 중 또는 완료 — `documentRouter.create`의 트랜잭션 진입점이 `pointHooks.onDocumentCreated(tx, ...)`를 받을 수 있는 상태. **만약 SPEC-DOCUMENT-001이 미완료라면**: 본 SPEC Slice B는 hook helper만 ship하고 actual wire-up은 SPEC-DOCUMENT-001 implementation phase에서 진행.
- SPEC-COMMENT-001 진행 중 또는 완료 — `commentRouter.create`의 트랜잭션 진입점. 동일 fallback.

### 0.2 환경 검증

- `pnpm install` 성공
- `pnpm prisma generate` 성공
- `pnpm tsc --noEmit` 0 error (현 baseline)
- `pnpm test` 통과 baseline (회귀 가드 기준선)

### 0.3 graphify 갱신

본 SPEC 구현 시점에서 `graphify update .` 실행하여 신규 패키지 `packages/point/` 노드가 그래프에 등록되도록 한다.

---

## 1. Slice A: Point Service + Schema (Standalone Package)

### 1.1 목표

신규 패키지 `packages/point/`를 구축하고 단독으로 작동하는 `PointService`를 ship. 어떤 다른 모듈도 수정하지 않는다. 0 cross-module integration.

### 1.2 작업 항목

#### A-1: Prisma 마이그레이션 (Point 모델 + enum + User 캐시 컬럼)

- 파일 신규: `packages/db/prisma/migrations/{timestamp}_add_point_system/migration.sql`
  - `CREATE TYPE point_source_type AS ENUM ('DOCUMENT', 'COMMENT', 'VOTE', 'DOWNLOAD', 'FILE_UPLOAD', 'SIGNUP', 'MANUAL', 'SYSTEM', 'PURCHASE', 'REFERRAL');`
  - `CREATE TABLE points (id SERIAL PRIMARY KEY, member_id INTEGER NOT NULL, amount INTEGER NOT NULL, reason VARCHAR(200) NOT NULL, source_type point_source_type NOT NULL, source_id INTEGER, board_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE);`
  - 인덱스: `CREATE INDEX idx_points_member_created ON points (member_id, created_at DESC); CREATE INDEX idx_points_member ON points (member_id); CREATE UNIQUE INDEX uq_points_source ON points (source_type, source_id) WHERE source_id IS NOT NULL;` (또는 `@@unique` Prisma constraint)
  - `ALTER TABLE users ADD COLUMN point_balance INTEGER NOT NULL DEFAULT 0;`
- 파일 수정: `packages/db/prisma/schema.prisma`
  - 신규 enum `PointSourceType`
  - 신규 model `Point`
  - `User` 모델에 `pointBalance Int @default(0)` 추가 + `points Point[]` relation
- 검증: `pnpm prisma migrate dev --name add_point_system` 성공, `pnpm prisma generate` 성공

#### A-2: 패키지 골조 생성

- 파일 신규:
  - `packages/point/package.json` — name `@rhymix-ts/point`, deps: `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/auth`, `zod`
  - `packages/point/tsconfig.json` — `extends: "../../tsconfig.base.json"`
  - `packages/point/vitest.config.ts` — packages/document 패턴 복사
  - `packages/point/src/index.ts` — barrel (초기 비어있음)
- 검증: `pnpm install` 통과, `pnpm tsc --noEmit -p packages/point` 통과

#### A-3: 에러 클래스 + Zod 스키마

- 파일 신규: `packages/point/src/errors.ts`
  ```typescript
  // @MX:NOTE 포인트 도메인 전용 에러 클래스 — 호출자가 try/catch로 분기 처리
  export class PointInsufficientError extends Error { /* code: 'POINT_INSUFFICIENT' */ }
  export class PointAmountInvalidError extends Error { /* code: 'POINT_AMOUNT_INVALID' */ }
  export class PointMemberNotFoundError extends Error { /* code: 'POINT_MEMBER_NOT_FOUND' */ }
  export class PointDuplicateSourceError extends Error { /* code: 'POINT_DUPLICATE_SOURCE' */ }
  ```
- 파일 신규: `packages/point/src/schemas.ts`
  - `PointSiteConfigSchema = z.object({ signupBonus: z.number().int(), clampToZero: z.boolean(), allowNegativeBalance: z.boolean(), defaultLevel: z.number().int().positive() })`
  - `PointAddInputSchema = z.object({ memberId: z.number().int().positive(), amount: z.number().int(), reason: z.string().max(200), sourceType: z.nativeEnum(PointSourceType), sourceId: z.number().int().optional(), boardId: z.number().int().optional() })`
  - `PointHistoryQuerySchema = z.object({ memberId: z.number().int().positive(), cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(20), sourceType: z.nativeEnum(PointSourceType).optional() })`

#### A-4: PointService 클래스 구현

- 파일 신규: `packages/point/src/service.ts`
  - `class PointService` constructor 받는 `prisma: PrismaClient | Prisma.TransactionClient`
  - `async add(input, options?: { strict?: boolean, tx?: TransactionClient }): Promise<{ balance: number, point: Point | null }>` — REQ-POINT-020, 022, 023, 024, 080, 081
  - `async subtract(input, options?: { tx?: TransactionClient }): Promise<{ balance: number, point: Point }>` — REQ-POINT-021, 050~053
  - `async getBalance(memberId, tx?): Promise<number>` — REQ-POINT-025
  - `async getHistory(query, tx?): Promise<{ items: Point[], nextCursor: string | null }>` — REQ-POINT-026
  - `async recompute(memberId, tx?): Promise<{ before: number, after: number }>` — REQ-POINT-027
  - `getLevel(memberId): { level: 1, name: 'default', iconUrl: null, threshold: 0 }` — stub, REQ-POINT-028
  - `private emit(event: PointChangedEvent)` — REQ-POINT-030 (event bus stub via EventEmitter; SPEC-DOCUMENT-001 REQ-DOC-132와 같은 stub 인스턴스를 사용 가능; 단순화를 위해 EventEmitter `events.ts` 신규 1회)
- 파일 신규: `packages/point/src/events.ts`
  - `pointEventBus: TypedEventEmitter<PointEventMap>`
  - `interface PointEventMap { 'point.changed': PointChangedEvent }`
- 파일 신규: `packages/point/src/cursor.ts`
  - `encodePointCursor({ createdAt: Date, id: number }): string` / `decodePointCursor(cursor: string)`
- 파일 신규: `packages/point/src/factory.ts`
  - `createPointService(prisma): PointService` — DI 헬퍼

#### A-5: sitePointConfig 백엔드 (ModuleConfig 재사용)

- 파일 신규: `packages/point/src/config.ts`
  - `async getSitePointConfig(prisma): Promise<PointSiteConfig>` — `ModuleConfig.findFirst({ moduleCode: 'point', moduleInstanceId: null })` + Zod parse + defaults fallback
  - `async setSitePointConfig(prisma, config: PointSiteConfig): Promise<void>` — upsert
  - 캐시 전략: 호출당 fresh fetch (사이트 config는 변동성 낮음, write 시 명시적 invalidate 불필요 — 초기 단순화)

#### A-6: 모듈 레지스트리 등록

- 파일 신규: `packages/point/src/register.ts`
  - `registerPointModule()` — `@rhymix-ts/core` registry에 `{ moduleCode: 'point', label: '포인트', adminPath: null }` 등록
  - idempotent (REQ-POINT-014)
- 파일 수정: `apps/web/lib/registry-init.ts` (또는 module registry 부트스트랩 위치) — `registerPointModule()` 추가 호출

#### A-7: barrel export

- 파일 수정: `packages/point/src/index.ts`
  - `export { PointService, createPointService } from './service'`
  - `export * from './errors'`
  - `export * from './schemas'`
  - `export { getSitePointConfig, setSitePointConfig } from './config'`
  - `export { pointEventBus } from './events'`
  - `export type { PointChangedEvent, PointEventMap } from './events'`
  - `export { PointSourceType } from '@prisma/client'` (re-export)

#### A-8: 단위 테스트

- 파일 신규: `packages/point/src/service.test.ts` — REQ-POINT-090, AC-POINT-A1, A2 검증
  - test 1: `add` → Point 행 생성 + balance 증가 + event emit
  - test 2: `add({ amount: 0 })` → no-op, no row
  - test 3: `add({ amount: 1.5 })` → throws `PointAmountInvalidError`
  - test 4: `add` with non-existent memberId → throws `PointMemberNotFoundError`
  - test 5: `subtract` 일반 case → balance 감소
  - test 6: `subtract` over balance + clampToZero → amount adjusted to actual delta, balance ends at 0
  - test 7: `subtract` over balance + allowNegative → balance goes negative
  - test 8: `subtract` on zero balance + clampToZero → REQ-POINT-053 검증 (row 생성 with amount=0)
  - test 9: idempotency — `add({ sourceType: 'DOCUMENT', sourceId: 42 })` 두 번 호출 → 두 번째는 silent skip
  - test 10: `add({ sourceType: 'DOCUMENT', sourceId: 42 }, { strict: true })` 두 번 호출 → 두 번째는 throw `PointDuplicateSourceError`
- 파일 신규: `packages/point/src/recompute.test.ts`
  - test 1: 캐시 잔액과 SUM이 일치할 때 recompute → no change
  - test 2: 캐시 잔액 손상 시뮬레이션(수동 update) → recompute가 SUM으로 복원
- 파일 신규: `packages/point/src/config.test.ts`
  - test 1: getSitePointConfig — config 없을 때 default 반환
  - test 2: setSitePointConfig + getSitePointConfig — round-trip
  - test 3: Zod validation — invalid signupBonus(string) throw
- 파일 신규: `packages/point/src/cursor.test.ts`
  - test 1: encodeCursor → decodeCursor round-trip
- 파일 신규: `packages/point/src/getHistory.test.ts`
  - test 1: history descending by createdAt
  - test 2: cursor pagination — first page + nextCursor + second page
  - test 3: sourceType filter

**Slice A 테스트 수 합계: ~13 tests (목표 ~12 충족)**

### 1.3 Slice A 산출물 요약

```
packages/db/prisma/migrations/{timestamp}_add_point_system/
  ├── migration.sql                          (신규)
packages/db/prisma/schema.prisma             (수정 — Point/PointSourceType/User.pointBalance 추가)
packages/point/
  ├── package.json                           (신규)
  ├── tsconfig.json                          (신규)
  ├── vitest.config.ts                       (신규)
  ├── src/
  │   ├── index.ts                           (신규, barrel)
  │   ├── service.ts                         (신규, PointService 클래스)
  │   ├── service.test.ts                    (신규, ~10 tests)
  │   ├── recompute.test.ts                  (신규, ~2 tests)
  │   ├── config.ts                          (신규, sitePointConfig CRUD)
  │   ├── config.test.ts                     (신규, ~3 tests)
  │   ├── cursor.ts                          (신규)
  │   ├── cursor.test.ts                     (신규, ~1 test)
  │   ├── getHistory.test.ts                 (신규, ~3 tests)
  │   ├── events.ts                          (신규, EventEmitter)
  │   ├── errors.ts                          (신규)
  │   ├── schemas.ts                         (신규, Zod)
  │   ├── factory.ts                         (신규, createPointService)
  │   └── register.ts                        (신규, module registry 등록)
apps/web/lib/registry-init.ts                (수정 — registerPointModule 호출)
```

### 1.4 Slice A Acceptance Gate

다음이 모두 충족되어야 Slice B로 진입:

1. `pnpm prisma migrate dev --name add_point_system` 성공
2. `pnpm prisma generate` 성공, `PointSourceType` enum + `Point` 타입이 `@prisma/client`에서 export
3. `pnpm test -- packages/point` → 모든 신규 테스트 통과 (~13)
4. `pnpm test` → 기존 전체 테스트 회귀 없음
5. `pnpm tsc --noEmit` → 0 error
6. `madge --circular packages/point` → no circular
7. 코드 리뷰: `PointService.add/subtract`의 잔액 업데이트가 `UPDATE users SET point_balance = point_balance + $delta` atomic pattern 사용 (SELECT-THEN-UPDATE 금지 검증)
8. AC-POINT-A1, AC-POINT-A2 둘 다 단위 테스트로 검증됨

---

## 2. Slice B: Cross-Module Integration + Admin UI

### 2.1 목표

Board에 6개 포인트 정책 컬럼 추가. document/comment/vote/signup의 트랜잭션 안에서 `pointHooks` 헬퍼 호출. admin UI 2개 페이지 ship. 회원가입 보너스 idempotent 부여.

### 2.2 작업 항목

#### B-1: Board 컬럼 추가 마이그레이션

- 파일 신규: `packages/db/prisma/migrations/{timestamp}_add_board_point_columns/migration.sql`
  ```sql
  ALTER TABLE boards
    ADD COLUMN point_per_document INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN point_per_comment INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN point_per_vote_up INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN point_per_vote_down INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN point_per_download INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN point_per_file_upload INTEGER NOT NULL DEFAULT 0;
  ```
- 파일 수정: `packages/db/prisma/schema.prisma` — `Board` 모델에 6개 INT 컬럼 추가 (default 0)
- 검증: 마이그레이션 성공 + 기존 board 테스트 회귀 없음 (additive default 0)

#### B-2: pointHooks 헬퍼

- 파일 신규: `packages/point/src/hooks.ts`
  ```typescript
  // @MX:NOTE cross-module 통합 진입점. document/comment/vote/signup이 트랜잭션 안에서 호출.
  // Phase 4 SPEC-ADDON-001 도착 시 동일 시그니처로 addon subscriber로 마이그레이션.
  
  export interface DocumentCreatedContext {
    boardId: number
    documentId: number
    authorId: number
    pointPerDocument: number  // Board.pointPerDocument
  }
  
  export async function onDocumentCreated(
    tx: Prisma.TransactionClient,
    ctx: DocumentCreatedContext
  ): Promise<void> {
    if (ctx.pointPerDocument === 0) return  // REQ-POINT-022 no-op
    const service = new PointService(tx)
    await service.add({
      memberId: ctx.authorId,
      amount: ctx.pointPerDocument,
      reason: 'document.create',
      sourceType: PointSourceType.DOCUMENT,
      sourceId: ctx.documentId,
      boardId: ctx.boardId,
    })
  }
  
  // 유사 패턴: onCommentCreated, onVoteCast, onMemberSignedUp
  ```
- 4개 헬퍼 함수:
  - `onDocumentCreated` — REQ-POINT-040
  - `onCommentCreated` — REQ-POINT-041
  - `onVoteCast` — REQ-POINT-042 (vote up/down에 따라 add 또는 subtract; content author에게)
  - `onMemberSignedUp` — REQ-POINT-043, REQ-POINT-070 (`sitePointConfig.signupBonus > 0`일 때만)
- 파일 신규: `packages/point/src/hooks.test.ts` — 4개 헬퍼 unit test (~3-4 tests)

#### B-3: document.create 통합

- 파일 수정: `packages/document/src/document.ts` (SPEC-DOCUMENT-001가 ship한 경로)
  - `createDocument(input, ctx)` 함수 내부에서 `prisma.$transaction(async (tx) => { ... })` 안에:
    1. 기존 Document 생성 + Board.documentCount++ 로직
    2. `await pointHooks.onDocumentCreated(tx, { boardId: board.id, documentId: doc.id, authorId: actor.userId, pointPerDocument: board.pointPerDocument })`
  - import: `import { onDocumentCreated } from '@rhymix-ts/point'`
- 회귀 가드: 기존 document.test.ts에서 `Board.pointPerDocument = 0` (default) → 기존 테스트 모두 통과해야 함

#### B-4: comment.create 통합

- 파일 수정: `packages/comment/src/comment.ts` (SPEC-COMMENT-001가 ship한 경로)
  - `createComment` 트랜잭션에 `onCommentCreated(tx, ...)` 추가
- 회귀 가드: 동일

#### B-5: vote 통합

- 파일 수정: 현재 vote 로직 위치 확인 — `packages/board/src/vote.ts` (SPEC-DOCUMENT-001 정리 후 `packages/document/src/vote.ts`로 이동되었을 가능성)
  - vote up/down 트랜잭션에 `onVoteCast(tx, { authorId: content.authorId, voteType, pointPerVoteUp: board.pointPerVoteUp, pointPerVoteDown: board.pointPerVoteDown })`
  - 자기 글 추천 시 no-op (caller-side guard, REQ-POINT-042 note)

#### B-6: signup 통합

- 파일 수정: `packages/auth/src/signup.ts` (정확한 파일명은 SPEC-AUTH-001 기준 확인 — `actions.ts` 또는 service)
  - signup 완료 트랜잭션의 마지막에 `await onMemberSignedUp(tx, { memberId: newUser.id, prisma: tx })` 호출
  - hook 내부에서 `sitePointConfig.signupBonus > 0` 체크 후 `PointService.add` (REQ-POINT-070, REQ-POINT-071)
- 회귀 가드: 기존 signup 테스트 → `sitePointConfig.signupBonus = 0` (default) → 모든 기존 테스트 통과

#### B-7: admin UI — 회원 포인트 페이지

- 파일 신규: `apps/web/app/admin/members/[id]/points/page.tsx` (RSC)
  - data fetch: `getBalance(memberId)` + `getHistory({ memberId, limit: 50 })`
  - 렌더링: 현재 잔액 + 이력 테이블 (createdAt, amount, reason, sourceType) + cursor "더 보기" 버튼
- 파일 신규: `apps/web/app/admin/members/[id]/points/adjust-form.tsx` (`'use client'`)
  - amount (signed integer input), reason (textarea), submit button
  - Server Action: `adjustPoints({ memberId, amount, reason })` — admin 권한 체크 + `service.add` or `subtract` with `sourceType: 'MANUAL'`
- 파일 신규: `apps/web/app/admin/members/[id]/points/actions.ts`
  - Server Action 정의 — REQ-POINT-061, REQ-POINT-064 (non-admin 403)
- 파일 신규: `apps/web/lib/point/reason-labels.ts`
  - `getReasonLabel(reason: string): string` — `document.create` → `"글 작성"` 등 매핑 (REQ-POINT-094)

#### B-8: admin UI — 사이트 포인트 정책 페이지

- 파일 신규: `apps/web/app/admin/site/points/page.tsx` (RSC)
  - data fetch: `getSitePointConfig(prisma)`
  - 렌더링: 폼 (signupBonus, clampToZero, allowNegativeBalance, defaultLevel)
- 파일 신규: `apps/web/app/admin/site/points/config-form.tsx` (`'use client'`)
- 파일 신규: `apps/web/app/admin/site/points/actions.ts`
  - Server Action `updateSitePointConfig(input)` — Zod validate + `setSitePointConfig(prisma, parsed)`

#### B-9: 통합 테스트

- 파일 신규: `apps/web/__tests__/integration/point-hooks.test.ts` (또는 적절한 통합 테스트 디렉토리)
  - test 1: document.create with `Board.pointPerDocument=10` → author balance += 10 + Point row 1개 (sourceType=DOCUMENT, sourceId=doc.id)
  - test 2: document.create with `Board.pointPerDocument=0` → balance no change + no Point row
  - test 3: comment.create with `Board.pointPerComment=5` → author balance += 5
  - test 4: signup with `sitePointConfig.signupBonus=100` → new user balance = 100 + Point row (SIGNUP, sourceId=userId)
  - test 5: signup retry (동일 userId 재처리) → Point row 여전히 1개 (idempotency, REQ-POINT-071)
  - test 6: vote up on document → content author balance += pointPerVoteUp
  - test 7: document transaction rollback (e.g., extraVars validation 실패) → no orphan Point row (AC-POINT-B2)
  - test 8: admin manual adjustment → 잔액 변동 + history에 row 노출
  - test 9: non-admin이 manual adjust action 호출 시 403

**Slice B 테스트 수 합계: ~12 tests (hook unit 3 + 통합 9)**

### 2.3 Slice B 산출물 요약

```
packages/db/prisma/migrations/{timestamp}_add_board_point_columns/
  ├── migration.sql                          (신규)
packages/db/prisma/schema.prisma             (수정 — Board 6 컬럼 추가)
packages/point/src/hooks.ts                  (신규)
packages/point/src/hooks.test.ts             (신규, ~3 tests)
packages/document/src/document.ts            (수정 — pointHooks.onDocumentCreated 통합)
packages/comment/src/comment.ts              (수정 — pointHooks.onCommentCreated 통합)
packages/board/src/vote.ts                   (수정 — pointHooks.onVoteCast 통합)
  또는 packages/document/src/vote.ts
packages/auth/src/signup.ts (또는 actions.ts) (수정 — pointHooks.onMemberSignedUp 통합)
apps/web/app/admin/members/[id]/points/
  ├── page.tsx                               (신규)
  ├── adjust-form.tsx                        (신규)
  └── actions.ts                             (신규)
apps/web/app/admin/site/points/
  ├── page.tsx                               (신규)
  ├── config-form.tsx                        (신규)
  └── actions.ts                             (신규)
apps/web/lib/point/reason-labels.ts          (신규)
apps/web/__tests__/integration/point-hooks.test.ts  (신규, ~9 tests)
```

### 2.4 Slice B Acceptance Gate

다음이 모두 충족되어야 SPEC-POINT-001 완료:

1. `pnpm prisma migrate dev --name add_board_point_columns` 성공
2. `pnpm test` — 모든 새/기존 테스트 통과 (기존 회귀 없음, 신규 ~12 통과)
3. `pnpm tsc --noEmit` 0 error
4. `madge --circular` — packages/point ↔ document/comment/board/auth 양방향 의존 없음 (point는 import 받기만, import 하지 않음)
5. AC-POINT-B1, AC-POINT-B2, AC-POINT-B3, AC-POINT-B4 모두 통합 테스트로 검증
6. admin UI 수동 smoke test:
   - `/admin/members/{id}/points` → 잔액 + 이력 표시, manual 조정 폼 동작
   - `/admin/site/points` → config 저장 + 다음 signup에 반영
   - non-admin 사용자가 위 URL 접근 시 admin 미들웨어가 차단 (SPEC-ADMIN-001 동작 가정)

---

## 3. Acceptance Gates per Slice (Cross-Reference Matrix)

| Acceptance Criterion | Slice | EARS REQ | Test Type |
|---|---|---|---|
| AC-POINT-A1 (add/balance basic) | A | REQ-POINT-020, 025 | unit (service.test.ts) |
| AC-POINT-A2 (clamping) | A | REQ-POINT-050, 052 | unit (service.test.ts) |
| AC-POINT-B1 (document.create award) | B | REQ-POINT-040 | integration |
| AC-POINT-B2 (rollback atomicity) | B | REQ-POINT-047 | integration |
| AC-POINT-B3 (signup idempotency) | B | REQ-POINT-070, 071, 080 | integration |
| AC-POINT-B4 (admin manual + RBAC) | B | REQ-POINT-060, 061, 064 | integration |

---

## 4. Risks Pre-empted During Implementation

### 4.1 트랜잭션 락 경합

여러 동시 요청이 동일 user의 `point_balance` 갱신 시 row-level lock 경합 발생. PostgreSQL의 `UPDATE users SET point_balance = point_balance + $delta`는 자동 row lock. 짧은 트랜잭션이라 부담 적음. 부하 테스트는 본 SPEC 범위 외 — 백로그.

### 4.2 마이그레이션 순서

- Slice A 마이그레이션 (Point 모델) → Slice B 마이그레이션 (Board 컬럼) 순서 강제
- Slice A 머지 → Slice B 시작이라는 phase 순서로 보장 (병행 작업 금지)

### 4.3 SPEC-DOCUMENT-001 / SPEC-COMMENT-001 진행도와의 동기화

본 SPEC Slice B는 document/comment의 createDocument/createComment 진입점을 가정. 둘 중 하나라도 미완료 시:
- 옵션 (a) hook helper만 ship + 통합 시점을 의존 SPEC implementation phase로 이관
- 옵션 (b) 본 SPEC Slice B 보류, document/comment 완료 대기

권고: (a). 의존 SPEC implementation이 hook helper를 import하여 자기 트랜잭션에 통합. 본 SPEC Slice B는 helper + admin UI + signup 통합만 ship.

### 4.4 회귀 테스트 baseline

Slice B에서 board 6개 컬럼 추가는 default 0 → 기존 board/document/comment test는 영향 없어야 함. 그러나 fixture 패턴이 모든 컬럼을 명시했다면 회귀 가능 — Slice B 시작 시 `pnpm test --filter board document comment` 실행하여 baseline 확인.

---

## 5. Migration Backfill Strategy (운영 데이터 — 본 SPEC 범위 외 명시)

본 SPEC은 dev DB만 가정. 운영 Rhymix(PHP) `point.point` → TS `Point` 마이그레이션은 별도 SPEC. 권고 전략(미래 참조):
- 각 회원당 1개 `Point(sourceType='SYSTEM', amount=legacy.point, reason='migration.v1.initial', sourceId=null)` 행 생성
- `recompute(memberId)` 호출로 `User.pointBalance` 동기화
- 멱등성: `(sourceType='SYSTEM', sourceId=null)`은 unique 제약 없음(REQ-POINT-082) → 재실행 시 duplicate 발생 가능 → 마이그레이션 스크립트가 자체적으로 lookup-before-insert 처리

---

## 6. Post-Implementation Tasks (SYNC Phase 준비)

본 SPEC 완료 후 `/moai sync SPEC-POINT-001` 시 수행:
- API 문서: `PointService` public method JSDoc 추출
- README: `packages/point/README.md` 신규 — public API 사용 예시
- CHANGELOG: `feat(point): SPEC-POINT-001 포인트 시스템 + 크로스 모듈 통합`
- graphify update: 신규 패키지 노드 등록
- SPEC-AUTH-001/DOCUMENT-001/COMMENT-001 HISTORY 업데이트 (cross-reference)

---

Version: 1.0.0
Slice count: 2 (A: standalone service+schema, B: cross-module integration+admin UI)
Total estimated test count: ~25 (Slice A ~13, Slice B ~12 — 합산 후 dedup ≈ 15 unique new flows per MP-002 target)
