# SPEC-CONTENT-001 Progress

## Slice A — Foundation 스키마 + board ModuleDefinition (2026-05-17 완료)

- Commit: 59a9bfc | PR #13
- Tests: 508 → 521 (+13, A-1~A-12 전부 PASS)
- 구현:
  - Prisma 10개 모델 (Board, Document, Comment, FileAttachment, DocumentCategory, DocumentExtraKey, DocumentUpdateLog, DocumentVote, DocumentReport, Trash) + 4개 enum
  - FTS: search_vector GENERATED ALWAYS AS STORED + GIN index (migration SQL)
  - packages/board 신설: boardModule (ModuleDefinition<BoardConfig>) + onInstall + document-service (createDocument/listDocuments/getDocumentById)
  - packages/core: ModuleRouteMap.index 타입 구체화 (ModuleRouteIndex 함수 시그니처)
  - apps/web: instrumentation.ts + lib/modules/register.ts (HMR-safe singleton 등록)
- Slice B 이월: [mid]/page.tsx → def.routes.index 위임, board tRPC 라우터, Comment 도메인, FTS tsquery, XSS sanitize, 권한 매트릭스

## Slice B 예고

- [mid]/page.tsx placeholder → boardModule.routes.index 위임 (기존 @MX:TODO 제거)
- tRPC: admin.board.list/get, content.document.list/get/create/update/delete
- Comment 도메인 + tRPC
- 게시판 목록 페이지 + 글쓰기 폼 UI
