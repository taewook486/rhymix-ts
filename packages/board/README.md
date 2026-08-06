# @rhymix-ts/board

Rhymix-TS 게시판 모듈 패키지.

`ModuleDefinition<BoardConfig>`로 등록되는 게시판 모듈 본체 — 목록/상세/작성 페이지, 권한, 태그 컴포넌트를 제공한다. 문서(`@rhymix-ts/document`)와 댓글(`@rhymix-ts/comment`) 기능은 하위 호환을 위해 이 패키지에서도 re-export된다.

## 설치

```bash
pnpm add @rhymix-ts/board
```

## 주요 exports

| export | 설명 |
|---|---|
| `boardModule` | 게시판 `ModuleDefinition` (index/view/edit 라우트, 설정 스키마, 캐시 태그) |
| `BoardConfigSchema` / `defaultBoardConfig` | 게시판 설정 Zod 스키마 |
| `BoardEditPage` | 글쓰기/수정 페이지 컴포넌트 |
| `canPerformAction` | 게시판 전용 7단계 권한 판정 (document의 4단계를 확장) |
| `TagInput` / `TagDisplay` / `TagListPage` | 태그 시스템 컴포넌트 |
| `export * from '@rhymix-ts/document'` | 문서 CRUD, 검색, 카테고리, rate-limit (re-export) |
| `export * from '@rhymix-ts/comment'` | 댓글 CRUD, 트리, 투표 (re-export) |

## 의존성

- `@rhymix-ts/comment`, `@rhymix-ts/core`, `@rhymix-ts/db`, `@rhymix-ts/document`, `@rhymix-ts/file`
- `@tiptap/*` (에디터), `@aws-sdk/client-s3` (첨부파일), `react` (peer)
