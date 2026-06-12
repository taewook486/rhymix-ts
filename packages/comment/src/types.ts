/**
 * types.ts — SPEC-COMMENT-001 Slice B
 *
 * Comment 도메인 타입 정의.
 *
 * REQ-COMMENT-002: CommentStatus 열거형 (PUBLIC=1, SECRET=2).
 */

// CommentStatus 열거형 — 댓글 공개 상태 매핑
export const CommentStatus = {
  PUBLIC: 1,
  SECRET: 2,
} as const;

export type CommentStatus = (typeof CommentStatus)[keyof typeof CommentStatus];
