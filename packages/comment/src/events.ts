/**
 * packages/comment/src/events.ts
 *
 * 댓글 이벤트 버스 — SPEC-FILE-001 Slice A.
 *
 * EventEmitter 기반의 타입 안전한 이벤트 버스.
 * 댓글 삭제 시 이벤트를 발행하여 외부 시스템과 연동.
 *
 * @MX:NOTE [AUTO]: 최소 구현의 이벤트 버스 - 향후 Redis Pub/Sub 등으로 확장 가능.
 * @MX:REASON: 도메인 이벤트의 발행/구독 패턴을 표준화하여 확장성 확보.
 */
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// 이벤트 타입 정의
// ---------------------------------------------------------------------------

/**
 * 댓글 이벤트 타입.
 */
export type CommentEventType = 'deleted';

/**
 * 댓글 삭제 이벤트 페이로드.
 */
export interface CommentDeletedEvent {
  type: 'deleted';
  commentId: number;
  documentId: number | null;
  boardId: number;
  deletedById: number;
  timestamp: Date;
}

/**
 * 모든 댓글 이벤트 타입.
 */
export type CommentEvent = CommentDeletedEvent;

// ---------------------------------------------------------------------------
// 이벤트 핸들러 타입
// ---------------------------------------------------------------------------

/**
 * 이벤트 핸들러 함수 타입.
 */
export type CommentEventHandler<T extends CommentEvent> = (event: T) => void | Promise<void>;

// ---------------------------------------------------------------------------
// 이벤트 버스 구현
// ---------------------------------------------------------------------------

/**
 * 댓글 이벤트 버스.
 *
 * EventEmitter를 래핑하여 타입 안전한 emit/on/off를 제공.
 */
class CommentEventBus extends EventEmitter {
  /**
   * 이벤트를 발행한다.
   *
   * @param event - 이벤트 객체
   */
  override emit<T extends CommentEvent>(event: T): boolean;
  override emit(eventName: string | symbol, ...args: unknown[]): boolean;
  override emit(eventOrName: CommentEvent | string | symbol, ...args: unknown[]): boolean {
    if (typeof eventOrName === 'object' && eventOrName !== null && 'type' in eventOrName) {
      return super.emit((eventOrName as CommentEvent).type, eventOrName);
    }
    return super.emit(eventOrName as string, ...args);
  }

  /**
   * 이벤트 핸들러를 등록한다.
   *
   * @param type - 이벤트 타입
   * @param handler - 핸들러 함수
   */
  override on<T extends CommentEvent>(
    type: T['type'],
    handler: CommentEventHandler<T>,
  ): this {
    return super.on(type, handler);
  }

  /**
   * 일회용 이벤트 핸들러를 등록한다.
   *
   * @param type - 이벤트 타입
   * @param handler - 핸들러 함수
   */
  override once<T extends CommentEvent>(
    type: T['type'],
    handler: CommentEventHandler<T>,
  ): this {
    return super.once(type, handler);
  }

  /**
   * 이벤트 핸들러를 제거한다.
   *
   * @param type - 이벤트 타입
   * @param handler - 핸들러 함수
   */
  override off<T extends CommentEvent>(
    type: T['type'],
    handler: CommentEventHandler<T>,
  ): this {
    return super.off(type, handler);
  }

  /**
   * 등록된 모든 핸들러를 제거한다.
   *
   * @param type - 이벤트 타입 (생략 시 전체 제거)
   */
  override removeAllListeners(type?: CommentEventType): this {
    if (type === undefined) {
      return super.removeAllListeners();
    }
    return super.removeAllListeners(type);
  }

  /**
   * 등록된 핸들러 수를 반환한다.
   *
   * @param type - 이벤트 타입
   */
  override listenerCount(type: CommentEventType): number {
    return super.listenerCount(type);
  }
}

// ---------------------------------------------------------------------------
// 싱글톤 인스턴스
// ---------------------------------------------------------------------------

/**
 * 글로벌 댓글 이벤트 버스 인스턴스.
 */
export const commentEvents = new CommentEventBus();

// ---------------------------------------------------------------------------
// 유틸리티 함수
// ---------------------------------------------------------------------------

/**
 * 댓글 삭제 이벤트를 발행한다.
 */
export function emitCommentDeleted(params: {
  commentId: number;
  documentId: number | null;
  boardId: number;
  deletedById: number;
}): void {
  const event: CommentDeletedEvent = {
    type: 'deleted',
    commentId: params.commentId,
    documentId: params.documentId,
    boardId: params.boardId,
    deletedById: params.deletedById,
    timestamp: new Date(),
  };
  commentEvents.emit(event);
}
