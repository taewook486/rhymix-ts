/**
 * packages/comment/src/events.test.ts — SPEC-FILE-001 Slice A
 *
 * commentEvents 이벤트 버스 및 emitCommentDeleted 헬퍼 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commentEvents, emitCommentDeleted } from './events';
import type { CommentDeletedEvent } from './events';

describe('commentEvents EventBus', () => {
  beforeEach(() => {
    commentEvents.removeAllListeners();
  });

  it('EV-1: emitCommentDeleted → deleted 이벤트 핸들러 호출', () => {
    const handler = vi.fn();
    commentEvents.on<CommentDeletedEvent>('deleted', handler);

    emitCommentDeleted({ commentId: 1, documentId: 10, boardId: 7, deletedById: 5 });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0]![0] as CommentDeletedEvent;
    expect(event.type).toBe('deleted');
    expect(event.commentId).toBe(1);
    expect(event.documentId).toBe(10);
    expect(event.boardId).toBe(7);
    expect(event.deletedById).toBe(5);
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('EV-2: documentId=null 허용', () => {
    const handler = vi.fn();
    commentEvents.on<CommentDeletedEvent>('deleted', handler);

    emitCommentDeleted({ commentId: 2, documentId: null, boardId: 3, deletedById: 9 });

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0]![0] as CommentDeletedEvent;
    expect(event.documentId).toBeNull();
  });

  it('EV-3: once 핸들러는 1회만 호출됨', () => {
    const handler = vi.fn();
    commentEvents.once<CommentDeletedEvent>('deleted', handler);

    emitCommentDeleted({ commentId: 3, documentId: 1, boardId: 1, deletedById: 1 });
    emitCommentDeleted({ commentId: 4, documentId: 1, boardId: 1, deletedById: 1 });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('EV-4: off → 핸들러 제거 후 호출되지 않음', () => {
    const handler = vi.fn();
    commentEvents.on<CommentDeletedEvent>('deleted', handler);
    commentEvents.off<CommentDeletedEvent>('deleted', handler);

    emitCommentDeleted({ commentId: 5, documentId: 1, boardId: 1, deletedById: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('EV-5: listenerCount — 핸들러 등록/제거에 따라 변경됨', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();

    expect(commentEvents.listenerCount('deleted')).toBe(0);

    commentEvents.on<CommentDeletedEvent>('deleted', h1);
    commentEvents.on<CommentDeletedEvent>('deleted', h2);
    expect(commentEvents.listenerCount('deleted')).toBe(2);

    commentEvents.removeAllListeners('deleted');
    expect(commentEvents.listenerCount('deleted')).toBe(0);
  });
});
