/**
 * content 라우터 조합 — SPEC-CONTENT-001 Slice B + Slice C + Slice D + Slice E + Slice F.
 *
 * content.document.*    — 글 CRUD + 검색
 * content.comment.*     — 댓글 CRUD
 * content.category.*    — 카테고리 트리 조회 (Slice C)
 * content.search.*      — FTS + 태그 자동완성 (Slice C)
 * content.vote.*        — 투표 토글 + 카운트 (Slice D)
 * content.report.*      — 신고 생성 (Slice D)
 * content.history.*     — 수정 이력 조회 (Slice D)
 * content.attachment.*  — 파일 첨부 presign + 관리 (Slice E)
 * content.extraKeys.*   — 게시판 extra key 목록 조회 (Slice F)
 * content.message.*     — 쪽지 시스템 (SPEC-MESSAGE-001)
 * content.poll.*        — 설문 투표 및 게시물 첨부 (SPEC-POLL-001)
 */
import { router } from '../../trpc';
import { contentDocumentRouter } from './document';
import { contentCommentRouter } from './comment';
import { contentCategoryRouter } from './category';
import { contentSearchRouter } from './search';
import { contentVoteRouter } from './vote';
import { contentReportRouter } from './report';
import { contentHistoryRouter } from './history';
import { contentAttachmentRouter } from './attachment';
import { contentExtraKeysRouter } from './extra-keys';
import { contentMessageRouter } from './message';
import { contentPollRouter } from './poll';

export const contentRouter = router({
  document:  contentDocumentRouter,
  comment:   contentCommentRouter,
  category:  contentCategoryRouter,
  search:    contentSearchRouter,
  vote:      contentVoteRouter,
  report:    contentReportRouter,
  history:   contentHistoryRouter,
  attachment: contentAttachmentRouter,
  extraKeys: contentExtraKeysRouter,
  message:   contentMessageRouter,
  poll:      contentPollRouter,
});
