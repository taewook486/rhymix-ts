---
id: SPEC-COMMENT-001-plan
title: SPEC-COMMENT-001 구현 계획 — 댓글 도메인 독립 패키지
version: 1.0.0
created: 2026-05-27
updated: 2026-05-27
status: draft
parent: SPEC-COMMENT-001
language: ko
---

# 구현 계획 — SPEC-COMMENT-001

본 계획은 SPEC-COMMENT-001의 3개 슬라이스(A/B/C) 구현 순서를 정의하며, 각 슬라이스의 작업 항목/생성·수정 파일/검증 게이트를 명시한다. 우선순위는 priority(High/Medium/Low)로 표기하고, 시간 추정은 금지(`.claude/rules/moai/core/agent-common-protocol.md` Time Estimation HARD 규칙).

---

## 0. 전제 조건 (Pre-flight)

본 계획 시작 전에 다음이 충족되어야 한다.

- [ ] SPEC-DOCUMENT-001 Slice A(`packages/document/` 패키지 분리)가 완료되어 있다. 또는 적어도 `Document.commentCount` 컬럼이 schema.prisma:660 부근에 안정적으로 존재함이 확인된다.
- [ ] `packages/auth`의 `canPerformAction(board, action, actor)` API가 변경 없이 유지되고 있음을 확인한다.
- [ ] `packages/board/src/comment.ts`(168 line) + `packages/board/src/comment.test.ts`(195 line, B-501~B-505) + `report.ts`(comment 분기) + `vote.ts`(comment 분기)가 현재 100% 그린 상태임을 `pnpm test packages/board` 로 확인한다 — 회귀 가드의 baseline.
- [ ] `packages/db/prisma/schema.prisma:671~704`의 `Comment` 모델이 본 SPEC `REQ-COMMENT-001`의 기대와 일치함을 확인한다(votedCount, blamedCount, isSecret, status, listOrder, parentId 모두 존재).
- [ ] 사용자가 Open Questions 5개(notification, vote storage, secret password, FTS, commentSrl) 중 최소 1·2·3번에 답을 제공했거나, 본 SPEC의 권고안을 채택했다(orchestrator AskUserQuestion).

---

## Slice A — 패키지 분리 (행동 보존 + characterization 가드)

### 우선순위
**High** — Slice B/C의 회귀 가드 baseline. 행동 변경 없음 보장이 모든 후속 작업의 신뢰성을 담보한다.

### 목표
현재 `packages/board/src/`에 분산된 comment 관련 코드를 신규 `packages/comment/` 패키지로 **순수 이동**한다. 어떤 동작도 바꾸지 않으며, 기존 5개 characterization 테스트(B-501~B-505)가 새 위치에서도 그대로 통과해야 한다.

### 생성 파일

- `packages/comment/package.json` — 의존성: `@rhymix-ts/auth`, `@rhymix-ts/document`(또는 임시로 board 잔여), `zod`, `isomorphic-dompurify`. devDep: `@rhymix-ts/db`, `vitest`, `@prisma/client`(typegen).
- `packages/comment/tsconfig.json` — board 패키지의 tsconfig 미러.
- `packages/comment/src/index.ts` — barrel export: `createComment`, `listComments`, `deleteComment`, `voteComment`, `reportComment`, 타입, 에러.
- `packages/comment/src/service.ts` — `packages/board/src/comment.ts` 의 내용을 그대로 복사. import 경로만 갱신:
  - `from './permissions'` → `from '@rhymix-ts/auth'` 또는 board 잔여 helper(SPEC-AUTH-001 의존)
  - `from './document'` → `from '@rhymix-ts/document'`(BoardPermissionDeniedError, DocumentOwnershipError 이전 위치 확인)
- `packages/comment/src/vote.ts` — `packages/board/src/vote.ts` 의 comment 관련 분기만 이전. document 분기는 SPEC-DOCUMENT-001에 잔존.
- `packages/comment/src/report.ts` — `packages/board/src/report.ts` 의 comment 관련 분기만 이전. `DuplicateReportError`는 양쪽에서 공유 — 본 SPEC은 `packages/comment/src/errors.ts`에 자체 클래스 정의(`new DuplicateReportError('comment', commentId)`).
- `packages/comment/src/errors.ts` — `DuplicateReportError`(comment scope), 향후 `SelfVoteNotAllowedError`/`CommentDepthExceededError`도 여기에 둔다(Slice C에서 추가).
- `packages/comment/src/__tests__/service.test.ts` — `packages/board/src/comment.test.ts` 의 195 line 전체 이동. import path 갱신만.
- `packages/comment/src/__tests__/vote.test.ts`(있다면) — board의 vote.test.ts 중 comment 분기 분리.
- `packages/comment/src/__tests__/report.test.ts`(있다면) — board의 report.test.ts 중 comment 분기 분리.

### 수정 파일

- `pnpm-workspace.yaml` — `packages/comment` 워크스페이스 등록(이미 `packages/*` glob일 가능성 — 확인 후 변경 불요).
- `packages/board/package.json` — `@rhymix-ts/comment` 의존성 추가(잔여 board 코드가 comment를 import한다면). 또는 board의 잔여 코드에서 comment import를 제거.
- `packages/board/src/comment.ts` — 삭제 또는 re-export shim(`export * from '@rhymix-ts/comment'`)로 후방 호환. **권고**: 삭제하고 board 잔여 코드는 `@rhymix-ts/comment`로 직접 import 갱신.
- `packages/board/src/comment.test.ts` — 삭제(신규 위치로 이동했음).
- `packages/board/src/vote.ts` — comment 분기 제거. document 분기만 유지.
- `packages/board/src/report.ts` — comment 분기 제거. document 분기만 유지.
- `packages/board/src/index.ts` — comment 관련 re-export 제거.
- `apps/web/`의 import path — comment 관련은 `@rhymix-ts/comment`에서 import. grep 기반 일괄 갱신.

### Acceptance Gate

- [ ] `pnpm tsc --noEmit` 전체 0 error
- [ ] `pnpm test packages/comment` — characterization 5개(B-501~B-505) 모두 그린
- [ ] `pnpm test packages/board` — 잔여 board 테스트 회귀 0건
- [ ] `pnpm test packages/document`(SPEC-DOCUMENT-001 완료 시) — 회귀 0건
- [ ] `pnpm build` 모든 패키지 빌드 성공
- [ ] grep `from '.*packages/board.*comment'` 결과 0건 (잔존 import 없음)

### Estimated Tests
5 (characterization, 변경 없이 이동)

---

## Slice B — tRPC Router + UI Integration Hooks

### 우선순위
**High** — SPEC-BOARD-CRUD-001(Phase 2 다음 SPEC)의 UI가 본 router를 호출한다. 데이터 플러밍이 안정되어야 UI 개발이 시작될 수 있다.

### 목표
`packages/comment/`에 tRPC `commentRouter`(`create`, `list`, `delete`, `vote`, `report`, `getOne` 6개 procedure)를 신설하고 apps/web tRPC 부트스트랩에 등록한다. 또한 `buildCommentTree` 헬퍼를 추가하여 UI가 트리 렌더링을 O(n)으로 수행할 수 있게 한다.

### 생성 파일

- `packages/comment/src/router.ts` — `commentRouter`(tRPC). 6개 procedure:
  - `create`(mutation): protectedProcedure, input = CreateCommentSchema (REQ-COMMENT-010~011)
  - `list`(query): publicProcedure, input = `{ documentId: number }` (REQ-COMMENT-012)
  - `delete`(mutation): protectedProcedure, input = DeleteCommentSchema (REQ-COMMENT-013~014)
  - `vote`(mutation): protectedProcedure, input = VoteCommentSchema — Slice C에서 활성화. Slice B는 stub.
  - `report`(mutation): protectedProcedure, input = ReportCommentSchema — Slice C에서 활성화. Slice B는 stub.
  - `getOne`(query): publicProcedure, input = `{ id: number }`, returns Comment(secret visibility는 Slice C에서).
- `packages/comment/src/tree.ts` — `buildCommentTree(rows: Comment[]): CommentNode[]` + `CommentNode` 타입(content + depth + children + __orphan?). 단일 패스 O(n).
- `packages/comment/src/__tests__/router.test.ts` — 6 procedure mocking 테스트.
- `packages/comment/src/__tests__/tree.test.ts` — 트리 빌더 단위 테스트: 빈 리스트, 평탄 리스트, 정상 트리, depth 계산, orphan 검출.
- `packages/comment/src/trpc-error-map.ts` — 서비스 오류 → TRPCError 매핑(REQ-COMMENT-073). 예:
  - `BoardPermissionDeniedError` → `FORBIDDEN`
  - `DocumentOwnershipError` → `FORBIDDEN`
  - `DuplicateReportError` → `CONFLICT`
  - 추후 Slice C 추가: `SelfVoteNotAllowedError` → `BAD_REQUEST`, `CommentDepthExceededError` → `BAD_REQUEST`

### 수정 파일

- `apps/web/server/trpc/router.ts`(또는 root router 파일) — `comment: commentRouter` 등록.
- `packages/comment/src/index.ts` — `commentRouter`, `buildCommentTree`, `CommentNode` 추가 export.

### Acceptance Gate

- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm test packages/comment` 누적 11 tests (Slice A 5 + Slice B 6) 그린
- [ ] apps/web에서 `trpc.comment.list.useQuery({ documentId: 1 })` 타입 정상 추론(컴파일 시점 검증)
- [ ] `buildCommentTree` 정확성: parent → child 관계가 보존되며 depth 계산이 root=0부터 시작
- [ ] orphan(parentId가 deleted된 부모 가리킬 때) 처리 검증

### Estimated Tests
6 (router 4 + tree 2)

---

## Slice C — 도메인 기능 (Voting / Report / Secret / Depth Limit)

### 우선순위
**High** — Phase 2 사용자 경험의 핵심. 트리 + 추천 + 신고 + 비밀 댓글 + depth 5단계 가드.

### 목표
SPEC `REQ-COMMENT-030~063` 전체를 구현한다: 추천/비추천 로그 + 카운터, 신고 중복 차단, 비밀 댓글 가시성 룰, 최대 depth 5 강제. 새 Prisma 모델 2개(`CommentVoteLog`, `CommentReport`)와 새 에러 클래스 2개(`SelfVoteNotAllowedError`, `CommentDepthExceededError`)를 추가한다.

### 생성 파일

- `packages/db/prisma/migrations/{timestamp}_comment-vote-log/migration.sql` — `CommentVoteLog`: `(id, commentId FK Comment, memberId Int, voteType Int, regdate Timestamptz default now())`, `@@unique([commentId, memberId])`, `@@index([memberId])`
- `packages/db/prisma/migrations/{timestamp}_comment-report/migration.sql` — `CommentReport`: `(id, commentId FK Comment, reporterId String, reporterIp String?, reason String, regdate Timestamptz default now())`, `@@unique([commentId, reporterId])`, `@@index([reporterId])`
- `packages/comment/src/vote.ts` — `voteComment` 완전 구현 (Slice A에서 이동된 기존 vote.ts 보강):
  - self-vote 가드 (REQ-COMMENT-031)
  - 동일 voteType no-op (REQ-COMMENT-032)
  - vote 전환 atomic decrement+increment+log update (REQ-COMMENT-033)
  - guest 차단 (REQ-COMMENT-034)
- `packages/comment/src/report.ts` — `reportComment` 완전 구현:
  - `CommentReport.@@unique([commentId, reporterId])` + application-level findFirst pre-check
  - `Comment.blamedCount++` atomic
- `packages/comment/src/visibility.ts` — `applySecretVisibility(comments: Comment[], actor, documentAuthor): Comment[]`:
  - REQ-COMMENT-052의 4가지 visibility 룰 적용
  - 비-가시 comment의 `content`를 placeholder로 치환 (`"비밀 댓글입니다."` 또는 i18n key)
- `packages/comment/src/depth.ts` — `computeParentDepth(parentId, prisma): Promise<number>` + `MAX_COMMENT_DEPTH = 5` (REQ-COMMENT-060~063):
  - parentId 체인을 최대 5단계 walk
  - O(depth) reads (최악 5 reads)
- `packages/comment/src/constants.ts` — `MAX_COMMENT_DEPTH = 5` 단독 export(외부 소비자 편의).
- `packages/comment/src/errors.ts` — `SelfVoteNotAllowedError`, `CommentDepthExceededError` 추가.
- `packages/comment/src/types.ts` — `CommentStatus` const union (`PUBLIC=1`, `SECRET=2`) (REQ-COMMENT-002).
- `packages/comment/src/__tests__/vote.test.ts` — 4+ tests:
  - C-301: 첫 upvote → log 생성 + votedCount++ atomic
  - C-302: 자기 댓글 vote → SelfVoteNotAllowedError, 트랜잭션 미실행
  - C-303: 동일 voteType 재호출 → no-op return
  - C-304: vote 전환(up→down) → atomic decrement+increment+log update
- `packages/comment/src/__tests__/report.test.ts` — 2+ tests:
  - C-401: 첫 report → CommentReport 1행 + blamedCount++ atomic
  - C-402: 중복 report → DuplicateReportError, blamedCount 미변경
- `packages/comment/src/__tests__/visibility.test.ts` — 4+ tests:
  - C-501: 비밀 댓글 + 무관 user → content placeholder
  - C-502: 비밀 댓글 + 작성자 본인 → content 가시
  - C-503: 비밀 댓글 + document 작성자 → content 가시
  - C-504: 비밀 댓글 + admin → content 가시
- `packages/comment/src/__tests__/depth.test.ts` — 2+ tests:
  - C-601: parent depth=3에 reply (child depth=4) → 허용
  - C-602: parent depth=4에 reply (child depth=5) → CommentDepthExceededError
- `packages/comment/src/__tests__/service.test.ts` 보강 — `createComment`에 isSecret + parentId 동시 시나리오 테스트 1개 추가.

### 수정 파일

- `packages/db/prisma/schema.prisma` — `CommentVoteLog`, `CommentReport` 모델 추가. 기존 `Comment` 모델은 변경 없음(REQ-COMMENT-003 준수).
- `packages/comment/src/service.ts` — `createComment`에 depth-limit 가드 + isSecret/status 매핑 추가:
  - parentId 존재 시 `computeParentDepth` 호출, depth >= 4 시 throw
  - input의 `isSecret` 플래그 → `status = SECRET` 매핑
- `packages/comment/src/router.ts` — Slice B의 stub `vote`/`report`를 실제 구현으로 교체. `getOne`/`list`에 `applySecretVisibility` 적용.
- `packages/comment/src/trpc-error-map.ts` — 신규 에러 매핑 추가:
  - `SelfVoteNotAllowedError` → `BAD_REQUEST`
  - `CommentDepthExceededError` → `BAD_REQUEST`
- `packages/comment/src/index.ts` — 신규 surface 추가 export: `MAX_COMMENT_DEPTH`, `CommentStatus`, `SelfVoteNotAllowedError`, `CommentDepthExceededError`.

### Acceptance Gate

- [ ] `pnpm prisma migrate dev` — `comment-vote-log` + `comment-report` 마이그레이션 성공, 기존 데이터에 영향 없음(additive only)
- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm test packages/comment` 누적 ~22 tests (Slice A 5 + B 6 + C 11+) 그린
- [ ] `pnpm test` 전체 회귀 0건 (board, document, auth, apps/web)
- [ ] 트랜잭션 무결성 통합 테스트(REQ-COMMENT-082) — vote/report/create 모두 `$transaction` 1회 호출
- [ ] secret comment visibility 4가지 시나리오 모두 통과
- [ ] depth 4 허용 / depth 5 거부 verifiable

### Estimated Tests
11+ (vote 4 + report 2 + visibility 4 + depth 2)

---

## 누계 메트릭

| 메트릭 | Slice A | Slice B | Slice C | 합계 |
|---|---|---|---|---|
| 신규 파일 | ~9 | ~5 | ~12 | ~26 |
| 수정 파일 | ~8 | ~2 | ~5 | ~15 |
| 신규 테스트 | 5 | 6 | 11+ | **~22** |
| Prisma migration | 0 | 0 | 2 (additive) | 2 |
| 새 Prisma 모델 | 0 | 0 | 2 (`CommentVoteLog`, `CommentReport`) | 2 |
| 새 에러 클래스 | 1 (`DuplicateReportError` re-locate) | 0 | 2 (`SelfVoteNotAllowedError`, `CommentDepthExceededError`) | 3 |

---

## 의존성 & 병행성

- Slice A는 **SPEC-DOCUMENT-001 Slice A 완료 후** 시작 권장. 단, document 패키지가 아직 분리되지 않았다면 임시로 board의 errors를 import하고 SPEC-DOCUMENT-001 완료 시 import path만 갱신.
- Slice B는 Slice A에 strict-depend. Router 등록 시 service 함수가 신규 위치에 있어야 함.
- Slice C는 Slice B에 strict-depend. Router에서 vote/report stub을 실제 구현으로 swap하는 형태.
- **병행 불가**(슬라이스 간) — 동일 파일을 순차적으로 보강하므로 직렬 진행이 안전.
- **병행 가능**(같은 슬라이스 내) — Slice C의 vote/report/visibility/depth는 모두 독립 모듈이므로 4개 sub-task로 분해하여 expert-backend 1 agent 안에서 순차 진행 OR 별도 agent 병행 가능(파일 충돌 없음).

---

## 위험 관리

| Risk | Detection | Mitigation |
|---|---|---|
| Slice A에서 import path 누락으로 회귀 | `pnpm tsc --noEmit` + `pnpm test` 전체 | 모든 grep 결과 0건 확인까지 Slice A 완료 미선언 |
| Slice C의 `CommentVoteLog` unique constraint가 기존 데이터와 충돌 | 마이그레이션은 신규 테이블 생성이므로 충돌 없음 | `pnpm prisma migrate dev` dry-run 권장 |
| depth 계산이 N+1 쿼리 문제 발생 | depth limit이 5라 최악 5 reads | 트래픽 증가 시 single recursive CTE로 교체 (백로그) |
| secret visibility 룰이 thread context를 잘못 계산 | C-501~C-504 4-시나리오 단위 테스트 | actor + documentAuthor + ancestor chain을 fetch 단계에서 일괄 로드 |

---

## 완료 정의 (Definition of Done)

본 SPEC은 다음이 모두 충족되면 완료된다:

- [ ] 3개 슬라이스 모두 Acceptance Gate 통과
- [ ] 22+ 테스트 그린, 회귀 0건
- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm build` 모든 패키지 성공
- [ ] `packages/comment/` 가 독립 패키지로 publish-ready (board는 본 패키지에 의존)
- [ ] apps/web tRPC root router에 `comment` 키 등록 완료
- [ ] @MX tag 점검:
  - `service.ts` createComment/deleteComment의 `@MX:WARN [AUTO]` (트랜잭션 필수) 유지
  - `report.ts` 중복 차단 패턴은 `@@unique` DB 제약 추가로 `@MX:NOTE`(application-level only) 제거 가능
  - 새 함수(voteComment, reportComment, computeParentDepth, applySecretVisibility) fan_in 검사 후 ANCHOR 후보 식별
- [ ] SPEC-BOARD-CRUD-001 인터페이스(commentRouter procedure 시그니처) 문서화 완료

---

Version: 1.0.0
Status: draft
