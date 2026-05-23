/**
 * content 라우터 조합 — SPEC-CONTENT-001 Slice B + Slice C.
 *
 * content.document.*  — 글 CRUD + 검색
 * content.comment.*   — 댓글 CRUD
 * content.category.*  — 카테고리 트리 조회 (Slice C)
 * content.search.*    — FTS + 태그 자동완성 (Slice C)
 */
import { router } from '../../trpc';
import { contentDocumentRouter } from './document';
import { contentCommentRouter } from './comment';
import { contentCategoryRouter } from './category';
import { contentSearchRouter } from './search';

export const contentRouter = router({
  document: contentDocumentRouter,
  comment: contentCommentRouter,
  category: contentCategoryRouter,
  search: contentSearchRouter,
});
