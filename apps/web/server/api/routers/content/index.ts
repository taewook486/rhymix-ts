/**
 * content 라우터 조합 — SPEC-CONTENT-001 Slice B.
 *
 * content.document.*  — 글 CRUD + 검색
 * content.comment.*   — 댓글 CRUD
 */
import { router } from '../../trpc';
import { contentDocumentRouter } from './document';
import { contentCommentRouter } from './comment';

export const contentRouter = router({
  document: contentDocumentRouter,
  comment: contentCommentRouter,
});
