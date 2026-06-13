/**
 * errors.ts — SPEC-COMMENT-001 Slice B/C
 *
 * Comment 도메인 에러 클래스 정의.
 *
 * REQ-COMMENT-061: CommentDepthExceededError.
 * 추가: CommentAlreadyVotedError, CommentAlreadyReportedError.
 */
import { MAX_COMMENT_DEPTH } from './constants';

/**
 * 댓글 depth 제한 초과 에러.
 */
export class CommentDepthExceededError extends Error {
  constructor(depth: number) {
    super(`댓글 depth ${depth}는 최대 허용값(${MAX_COMMENT_DEPTH})을 초과합니다`);
    this.name = 'CommentDepthExceededError';
  }
}

/**
 * 댓글을 찾을 수 없음.
 */
export class CommentNotFoundError extends Error {
  constructor(id: number) {
    super(`댓글 ${id}를 찾을 수 없습니다`);
    this.name = 'CommentNotFoundError';
  }
}

/**
 * 이미 투표한 댓글 (REQ-COMMENT-031).
 */
export class CommentAlreadyVotedError extends Error {
  constructor(commentId: number, memberId?: number) {
    super(
      memberId != null
        ? `이미 댓글 ${commentId}에 투표했습니다 (memberId: ${memberId})`
        : `이미 댓글 ${commentId}에 투표했습니다`,
    );
    this.name = 'CommentAlreadyVotedError';
  }
}

/**
 * 자신의 댓글에 투표 불가 (REQ-COMMENT-031).
 */
export class SelfVoteNotAllowedError extends Error {
  constructor(commentId: number) {
    super(`자신의 댓글 ${commentId}에는 투표할 수 없습니다`);
    this.name = 'SelfVoteNotAllowedError';
  }
}

/**
 * 이미 신고한 댓글 (REQ-COMMENT-041).
 */
export class CommentAlreadyReportedError extends Error {
  constructor(commentId: number, reporterId?: number) {
    super(
      reporterId != null
        ? `이미 댓글 ${commentId}를 신고했습니다 (reporterId: ${reporterId})`
        : `이미 댓글 ${commentId}를 신고했습니다`,
    );
    this.name = 'CommentAlreadyReportedError';
  }
}
