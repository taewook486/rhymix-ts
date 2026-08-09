export * from './service';
export * from './types';
export * from './constants';
export * from './errors';
export * from './tree';
export * from './router';
export { commentEvents, emitCommentDeleted } from './events';
export type { CommentDeletedEvent } from './events';
export * from './admin';
// SPEC-CONTENT-PARITY-001 M2: 댓글 휴지통(가상 뷰) — CommentNotFoundError는 ./errors에서
// 이미 export되므로 중복 export 충돌을 피하기 위해 트리 함수만 재노출한다.
export { listDeletedComments, restoreComment, purgeComment } from './trash';
export type {
  DeletedCommentWithDocument,
  ListDeletedCommentsResult,
  PurgeCommentResult,
} from './trash';
