# @rhymix-ts/comment

Rhymix-TS 댓글 도메인 독립 패키지.

댓글 CRUD, 트리 구조 조립, 투표, tRPC 라우터, 이벤트 버스를 제공한다. `@rhymix-ts/board`가 이 패키지를 re-export해서 노출한다.

## 설치

```bash
pnpm add @rhymix-ts/comment
```

## 주요 exports

| export | 설명 |
|---|---|
| `createComment` / `listComments` / `deleteComment` | 댓글 CRUD (권한·트랜잭션·commentCount 원자성 보장) |
| `voteComment` | 댓글 투표 (중복 투표·self-vote 거부) |
| `buildCommentTree` / `getCommentDepth` | 댓글 트리 구성, depth 계산 |
| `commentRouter` | tRPC 라우터 (list/create/delete 프로시저) |
| `commentEvents` / `emitCommentDeleted` | 댓글 삭제 이벤트 버스 |
| `CommentDepthExceededError` / `CommentAlreadyVotedError` / `SelfVoteNotAllowedError` 등 | 도메인 에러 클래스 |

## 의존성

- `@rhymix-ts/auth`, `@rhymix-ts/document`, `@rhymix-ts/notification`, `@rhymix-ts/point`
- `@trpc/server`, `isomorphic-dompurify`, `zod`
