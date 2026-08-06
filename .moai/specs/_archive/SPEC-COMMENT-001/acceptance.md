---
id: SPEC-COMMENT-001-acceptance
title: SPEC-COMMENT-001 인수 기준 — 댓글 도메인 독립 패키지
version: 1.0.0
created: 2026-05-27
updated: 2026-05-27
status: draft
parent: SPEC-COMMENT-001
language: ko
---

# 인수 기준 (Acceptance Criteria) — SPEC-COMMENT-001

본 문서는 SPEC-COMMENT-001의 인수 기준을 **Given-When-Then** 형식으로 상세 기술한다. 각 시나리오는 SPEC 본문의 EARS REQ와 일대일로 매핑된다. 모든 시나리오가 자동화된 테스트로 통과해야 본 SPEC이 완료된다.

분류:
- **AC-COMMENT-A*** : Slice A (패키지 분리) — 5 시나리오 (characterization 가드)
- **AC-COMMENT-B*** : Slice B (tRPC router + tree) — 4 시나리오
- **AC-COMMENT-C*** : Slice C (도메인 기능) — 12+ 시나리오

---

## Slice A — 패키지 분리 (행동 보존)

### AC-COMMENT-A1 — 트랜잭션 안에서 comment.create + Document.commentCount++

GIVEN
- `packages/comment/` 패키지가 분리 완료된 상태
- 모의 Prisma client: `findUniqueOrThrow`가 fakeDoc(`{ id: 10, boardId: 7, board: { permissions: {} } }`) 반환
- `$transaction(fn)` 형태의 트랜잭션 mock

WHEN
- `createComment({ documentId: 10, content: '<p>hi</p>', authorId: 5, nickName: null, actor: { userGroupSrl: 1, isAdmin: false } }, { prisma })` 호출

THEN
- `prisma.$transaction`이 **정확히 1회** 호출된다
- 트랜잭션 내부에서 `tx.comment.create({ data: { documentId: 10, ... } })`가 1회 호출된다
- 트랜잭션 내부에서 `tx.document.update({ where: { id: 10 }, data: { commentCount: { increment: 1 } } })`가 1회 호출된다
- 반환된 Comment.id === 1 (fake)

매핑: REQ-COMMENT-010, REQ-COMMENT-007, REQ-COMMENT-081 (= B-501 characterization)

### AC-COMMENT-A2 — 권한 거부 (write_comment grant 실패)

GIVEN
- 게시판 7의 grants에 `write_comment: [1]` (groupSrl 1만 허용)
- guest actor (`userGroupSrl: 0, isAdmin: false`)

WHEN
- `createComment({ documentId: 10, content: 'x', authorId: null, nickName: 'guest', actor: { userGroupSrl: 0, isAdmin: false } }, { prisma })` 호출

THEN
- `BoardPermissionDeniedError('write_comment')` 가 throw된다
- `prisma.$transaction` 은 **호출되지 않는다** (트랜잭션 진입 차단)

매핑: REQ-COMMENT-011, REQ-COMMENT-081 (= B-502)

### AC-COMMENT-A3 — listComments는 documentId 필터 + listOrder asc

GIVEN
- documentId = 10 에 댓글 2개 존재 (deletedAt === null)

WHEN
- `listComments({ documentId: 10 }, { prisma })` 호출

THEN
- `prisma.comment.findMany`가 `where: { documentId: 10, deletedAt: null }, orderBy: { listOrder: 'asc' }` 인자로 1회 호출된다
- 반환은 fake comments 배열

매핑: REQ-COMMENT-012, REQ-COMMENT-081 (= B-503)

### AC-COMMENT-A4 — 본인 작성 댓글 삭제 (트랜잭션 + commentCount--)

GIVEN
- 댓글 100 (authorId = 5, documentId = 10) 존재
- actor: `{ userId: 5, userGroupSrl: 1, isAdmin: false }` (본인)

WHEN
- `deleteComment({ id: 100, actor }, { prisma })` 호출

THEN
- `prisma.$transaction` 1회 호출
- `tx.comment.update({ where: { id: 100 }, data: { deletedAt: <Date> } })` 1회 호출
- `tx.document.update({ where: { id: 10 }, data: { commentCount: { decrement: 1 } } })` 1회 호출

매핑: REQ-COMMENT-013, REQ-COMMENT-081 (= B-504)

### AC-COMMENT-A5 — 타인 작성 + non-admin 삭제 거부

GIVEN
- 댓글 100 (authorId = 5)
- actor: `{ userId: 99, isAdmin: false }` (타인, non-admin)

WHEN
- `deleteComment({ id: 100, actor })` 호출

THEN
- `DocumentOwnershipError(100)` throw
- `prisma.$transaction` 호출되지 않음

매핑: REQ-COMMENT-014, REQ-COMMENT-081 (= B-505)

---

## Slice B — tRPC Router + Tree

### AC-COMMENT-B1 — tRPC `comment.list` 호출 성공

GIVEN
- `commentRouter`가 apps/web tRPC root router에 등록됨
- DB에 documentId=10 의 댓글 3개 존재 (deletedAt === null)

WHEN
- 클라이언트(또는 server-side caller)가 `trpc.comment.list.useQuery({ documentId: 10 })` 호출

THEN
- 3개 댓글이 listOrder asc 순서로 반환된다
- HTTP/RPC 응답 코드 정상 (TRPCError 없음)
- 입력 검증 통과 (Zod schema `{ documentId: z.number().int().positive() }`)

매핑: REQ-COMMENT-070, REQ-COMMENT-071, REQ-COMMENT-012

### AC-COMMENT-B2 — tRPC `comment.create` 권한 실패 → FORBIDDEN

GIVEN
- 인증된 protectedProcedure session(`actor.userGroupSrl = 0`)
- 게시판 7의 `write_comment: [1]`

WHEN
- 클라이언트가 `trpc.comment.create.useMutation` 호출

THEN
- 서비스 레이어 `BoardPermissionDeniedError` 가 발생
- tRPC 에러 매핑이 `TRPCError({ code: 'FORBIDDEN', ... })`로 변환하여 응답
- 클라이언트는 `error.data?.code === 'FORBIDDEN'` 으로 식별 가능

매핑: REQ-COMMENT-072, REQ-COMMENT-073

### AC-COMMENT-B3 — `buildCommentTree`는 평탄 리스트를 O(n) 트리로 빌드

GIVEN
- 6개 댓글 평탄 리스트:
  - id=1, parentId=null
  - id=2, parentId=1
  - id=3, parentId=2
  - id=4, parentId=1
  - id=5, parentId=null
  - id=6, parentId=999 (orphan, 존재하지 않는 parent)

WHEN
- `buildCommentTree(rows)` 호출

THEN
- 반환 구조:
  - root[0] = `{ id: 1, depth: 0, children: [{ id: 2, depth: 1, children: [{ id: 3, depth: 2, children: [] }] }, { id: 4, depth: 1, children: [] }] }`
  - root[1] = `{ id: 5, depth: 0, children: [] }`
  - root[2] = `{ id: 6, depth: 0, children: [], __orphan: true }`
- depth는 root=0부터 증가, 자식의 depth = parent.depth + 1
- orphan은 root 레벨에 `__orphan: true` 마커와 함께 표시
- 알고리즘은 단일 Map<id, node> 패스 (O(n))

매핑: REQ-COMMENT-021, REQ-COMMENT-022, REQ-COMMENT-023

### AC-COMMENT-B4 — tRPC `comment.delete`의 mutation 시그니처 정확성

GIVEN
- protectedProcedure session(`actor.userId = 5, isAdmin: false`)
- 댓글 100 (authorId = 5)

WHEN
- 클라이언트가 `trpc.comment.delete.useMutation` 호출, input = `{ id: 100 }`

THEN
- service `deleteComment({ id: 100, actor: { userId: 5, isAdmin: false, userGroupSrl: <session.groupSrl> } })` 호출
- actor 객체는 **session에서 도출**되며 클라이언트 입력에 포함되지 않는다 (REQ-COMMENT-072)
- 성공 시 mutation result는 `{ deletedAt: <Date>, ... }`

매핑: REQ-COMMENT-070, REQ-COMMENT-072

---

## Slice C — 도메인 기능

### AC-COMMENT-C1 — `voteComment` 첫 upvote → 로그 생성 + votedCount++

GIVEN
- 댓글 100 (authorId = 5, votedCount = 0, blamedCount = 0)
- voter (`memberId = 9`) 가 이전에 vote한 적 없음
- `CommentVoteLog` 테이블 row 0개 for (commentId=100, memberId=9)

WHEN
- `voteComment({ commentId: 100, voterId: 9, voteType: 1 }, { prisma })` 호출

THEN
- 단일 트랜잭션 안에서:
  - `CommentVoteLog` 신규 row 생성 (commentId=100, memberId=9, voteType=1)
  - `Comment.votedCount` 1 증가 (0 → 1)
- blamedCount 변경 없음
- `prisma.$transaction` 1회 호출

매핑: REQ-COMMENT-030

### AC-COMMENT-C2 — 자기 댓글 vote 거부

GIVEN
- 댓글 100 (authorId = 5)
- voter `memberId = 5` (작성자 본인)

WHEN
- `voteComment({ commentId: 100, voterId: 5, voteType: 1 })`

THEN
- `SelfVoteNotAllowedError(100)` throw
- `prisma.$transaction` 호출 안됨
- `CommentVoteLog` 변경 없음

매핑: REQ-COMMENT-031

### AC-COMMENT-C3 — 동일 voteType 재호출 → no-op

GIVEN
- 댓글 100 (votedCount = 1)
- `CommentVoteLog` row 존재: (commentId=100, memberId=9, voteType=1)

WHEN
- `voteComment({ commentId: 100, voterId: 9, voteType: 1 })` 재호출

THEN
- `prisma.$transaction` 호출 안됨 (no-op)
- 기존 log row 반환
- votedCount 변경 없음 (여전히 1)

매핑: REQ-COMMENT-032

### AC-COMMENT-C4 — vote 전환 (up → down)

GIVEN
- 댓글 100 (votedCount = 1, blamedCount = 0)
- 기존 log: (commentId=100, memberId=9, voteType=1)

WHEN
- `voteComment({ commentId: 100, voterId: 9, voteType: -1 })` 호출

THEN
- 단일 트랜잭션 안에서:
  - `Comment.votedCount` 1 감소 (1 → 0)
  - `Comment.blamedCount` 1 증가 (0 → 1)
  - `CommentVoteLog.voteType` -1 로 업데이트 (commentId=100, memberId=9)
- `prisma.$transaction` 1회

매핑: REQ-COMMENT-033

### AC-COMMENT-C5 — guest voting 차단

GIVEN
- voter unauthenticated (`voterId = null` 또는 procedure가 protectedProcedure가 아닌 publicProcedure에서 invoke)

WHEN
- `voteComment({ commentId: 100, voterId: null as any, voteType: 1 })`

THEN
- 인증 에러 (`AuthenticationRequiredError` 또는 TRPCError UNAUTHORIZED) throw
- DB 변경 없음

매핑: REQ-COMMENT-034

### AC-COMMENT-C6 — `reportComment` 첫 신고 → CommentReport 1행 + blamedCount++

GIVEN
- 댓글 100 (blamedCount = 0)
- reporter `userId = '42'` 가 이전 신고 없음

WHEN
- `reportComment({ commentId: 100, reporterId: '42', reporterIp: '1.2.3.4', reason: 'spam' }, { prisma })`

THEN
- 단일 트랜잭션 안에서:
  - `CommentReport` 신규 row 생성 (commentId=100, reporterId='42', reason='spam', reporterIp='1.2.3.4')
  - `Comment.blamedCount` 1 증가 (0 → 1)
- `prisma.$transaction` 1회

매핑: REQ-COMMENT-040

### AC-COMMENT-C7 — 중복 신고 차단

GIVEN
- 댓글 100 + `CommentReport` row 존재 (commentId=100, reporterId='42')

WHEN
- 동일 reporter('42') 가 `reportComment({ commentId: 100, reporterId: '42', ... })` 재호출

THEN
- `DuplicateReportError('comment', 100)` throw
- `prisma.$transaction` 호출 안됨
- blamedCount 변경 없음

매핑: REQ-COMMENT-041

### AC-COMMENT-C8 — 비밀 댓글 visibility: 무관 user → placeholder

GIVEN
- 댓글 100 (`isSecret = true`, `status = SECRET (2)`, content = '비밀 내용', authorId = 5)
- document(id=10).authorId = 7
- actor: `{ userId: 99, isAdmin: false }` (작성자 아님, document 작성자 아님, ancestor 작성자 아님)

WHEN
- `listComments({ documentId: 10 }, { prisma, actor })` 호출

THEN
- 반환 배열의 해당 comment의 `content` 가 placeholder 문자열 (e.g., `"비밀 댓글입니다."`) 로 치환됨
- 원본 content (`'비밀 내용'`) 가 응답에 노출되지 않음
- Comment row 자체는 응답에 포함됨 (visibility 차단, 존재 차단 아님)

매핑: REQ-COMMENT-051, REQ-COMMENT-052

### AC-COMMENT-C9 — 비밀 댓글 visibility: 작성자 본인 → 가시

GIVEN
- AC-COMMENT-C8과 동일 댓글 (authorId = 5)
- actor: `{ userId: 5 }` (작성자 본인)

WHEN
- `listComments({ documentId: 10 }, { prisma, actor })` 호출

THEN
- `content` 가 원본 그대로 노출 (`'비밀 내용'`)

매핑: REQ-COMMENT-052(a)

### AC-COMMENT-C10 — 비밀 댓글 visibility: document 작성자 → 가시

GIVEN
- 댓글 100 (authorId = 5, isSecret = true) → document 10 (authorId = 7) 소속
- actor: `{ userId: 7 }` (document 작성자)

WHEN
- `listComments({ documentId: 10 }, { prisma, actor })`

THEN
- 비밀 댓글의 `content` 원본 노출

매핑: REQ-COMMENT-052(b)

### AC-COMMENT-C11 — 비밀 댓글 visibility: admin → 가시

GIVEN
- AC-COMMENT-C8과 동일 댓글
- actor: `{ userId: 99, isAdmin: true }`

WHEN
- `listComments({ documentId: 10 }, { prisma, actor })`

THEN
- 비밀 댓글의 `content` 원본 노출

매핑: REQ-COMMENT-052(d)

### AC-COMMENT-C12 — depth limit 허용 경계 (parent depth=3 → child depth=4)

GIVEN
- document 10에 댓글 트리 존재: id=1(depth=0) → id=2(depth=1) → id=3(depth=2) → id=4(depth=3, parentId=3)

WHEN
- `createComment({ documentId: 10, parentId: 4, content: 'level 4 reply', ... })` 호출 (child가 depth=4가 됨)

THEN
- `computeParentDepth(4, prisma)` 가 3을 반환
- `MAX_COMMENT_DEPTH = 5` (depth 0~4까지 허용) → child depth 4는 < 5 이므로 허용
- 정상적으로 Comment 행이 생성되며 트랜잭션 통과

매핑: REQ-COMMENT-060, REQ-COMMENT-062

### AC-COMMENT-C13 — depth limit 초과 (parent depth=4 → child depth=5) 거부

GIVEN
- AC-COMMENT-C12 + 추가 댓글 id=5 (depth=4, parentId=4)

WHEN
- `createComment({ documentId: 10, parentId: 5, content: 'level 5 reply', ... })` 호출 (child가 depth=5가 되려고 함)

THEN
- `computeParentDepth(5, prisma)` 가 4를 반환
- depth 4 + 1 = 5 >= MAX_COMMENT_DEPTH (5) → 초과
- `CommentDepthExceededError(5, maxDepth=5)` throw
- `prisma.$transaction` 호출 안됨
- 새 댓글 행이 생성되지 않음

매핑: REQ-COMMENT-061, REQ-COMMENT-063

### AC-COMMENT-C14 — 비밀 댓글 + 답글 동시 생성

GIVEN
- 정상 부모 댓글 id=10 존재 (depth=1, isSecret=false)
- 회원 5 (작성자)

WHEN
- `createComment({ documentId: 10, parentId: 10, content: 'reply', isSecret: true, actor: { userId: 5, ... } })`

THEN
- 단일 트랜잭션 안에서 Comment 행 생성, `isSecret = true`, `status = 2 (SECRET)`, `parentId = 10`
- `Document.commentCount` 1 증가
- depth 가드 통과(parent depth=1 → child depth=2 ≤ 4)

매핑: REQ-COMMENT-050, REQ-COMMENT-010, REQ-COMMENT-060

### AC-COMMENT-C15 — 트랜잭션 무결성 통합: vote + report + create 모두 단일 트랜잭션

GIVEN
- mock prisma의 `$transaction` spy 설정

WHEN
- `createComment(...)` 한 번 + `voteComment(...)` 한 번 + `reportComment(...)` 한 번 (서로 다른 댓글에 대해 각각)

THEN
- 세 함수 각각이 `$transaction` 을 정확히 1회씩 호출 (총 3회)
- 각 트랜잭션 내부에서 카운터 mutation + 로그 mutation 이 함께 호출됨
- 에러 시 트랜잭션 자동 rollback (Prisma 표준 동작)

매핑: REQ-COMMENT-082

---

## 품질 게이트 (Definition of Done)

본 SPEC이 완료(merge-ready)되려면 다음 모든 항목이 충족되어야 한다:

- [ ] Slice A 5 + Slice B 4 + Slice C 15 = **24+ 시나리오** 모두 자동화 테스트로 통과
- [ ] `pnpm tsc --noEmit` 0 error
- [ ] `pnpm test` 전체 그린 (board/document/auth/apps/web 회귀 0건)
- [ ] `pnpm build` 모든 패키지 빌드 성공
- [ ] `pnpm prisma migrate dev` — `comment-vote-log` + `comment-report` 마이그레이션 클린 실행
- [ ] 새 코드 커버리지 ≥ 80% (REQ-COMMENT-080)
- [ ] `pnpm lint` 0 error / 0 new warnings
- [ ] @MX tag 점검 완료:
  - createComment / deleteComment / voteComment / reportComment 의 `@MX:WARN [AUTO]: 트랜잭션 필수` 유지 또는 신규 추가
  - report 도메인의 application-level only `@MX:NOTE` 제거 (DB `@@unique` 적용으로 해소)
  - 새 헬퍼(`computeParentDepth`, `applySecretVisibility`, `buildCommentTree`) 의 fan_in 검사 후 ANCHOR 후보 식별
- [ ] SPEC-BOARD-CRUD-001 인터페이스(`commentRouter` procedure 시그니처)가 README 또는 패키지 docs로 노출됨
- [ ] Open Questions 5개 중 결정이 필요한 항목(특히 1, 2, 3)이 orchestrator 사용자 확인 라운드로 합의됨

---

## EARS 매핑 요약

| AC | REQ |
|---|---|
| AC-COMMENT-A1 | REQ-COMMENT-010, 007, 081 |
| AC-COMMENT-A2 | REQ-COMMENT-011, 081 |
| AC-COMMENT-A3 | REQ-COMMENT-012, 081 |
| AC-COMMENT-A4 | REQ-COMMENT-013, 081 |
| AC-COMMENT-A5 | REQ-COMMENT-014, 081 |
| AC-COMMENT-B1 | REQ-COMMENT-070, 071, 012 |
| AC-COMMENT-B2 | REQ-COMMENT-072, 073 |
| AC-COMMENT-B3 | REQ-COMMENT-021, 022, 023 |
| AC-COMMENT-B4 | REQ-COMMENT-070, 072 |
| AC-COMMENT-C1 | REQ-COMMENT-030 |
| AC-COMMENT-C2 | REQ-COMMENT-031 |
| AC-COMMENT-C3 | REQ-COMMENT-032 |
| AC-COMMENT-C4 | REQ-COMMENT-033 |
| AC-COMMENT-C5 | REQ-COMMENT-034 |
| AC-COMMENT-C6 | REQ-COMMENT-040 |
| AC-COMMENT-C7 | REQ-COMMENT-041 |
| AC-COMMENT-C8 | REQ-COMMENT-051, 052 |
| AC-COMMENT-C9 | REQ-COMMENT-052(a) |
| AC-COMMENT-C10 | REQ-COMMENT-052(b) |
| AC-COMMENT-C11 | REQ-COMMENT-052(d) |
| AC-COMMENT-C12 | REQ-COMMENT-060, 062 |
| AC-COMMENT-C13 | REQ-COMMENT-061, 063 |
| AC-COMMENT-C14 | REQ-COMMENT-050, 010, 060 |
| AC-COMMENT-C15 | REQ-COMMENT-082 |

---

Version: 1.0.0
Status: draft
Total AC Count: 24 (Slice A: 5, Slice B: 4, Slice C: 15)
