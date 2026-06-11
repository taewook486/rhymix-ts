/**
 * packages/document/src/events.ts
 *
 * 문서 이벤트 버스 — SPEC-DOCUMENT-001 Slice C (REQ-DOC-132).
 *
 * EventEmitter 기반의 타입 안전한 이벤트 버스.
 * 문서 생성/수정/삭제/발행 시 이벤트를 발행하여 외부 시스템과 연동.
 *
 * @MX:NOTE [AUTO]: 최소 구현의 이벤트 버스 - 향후 Redis Pub/Sub 등으로 확장 가능.
 * @MX:REASON: 도메인 이벤트의 발행/구독 패턴을 표준화하여 확장성 확보.
 */
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// 이벤트 타입 정의
// ---------------------------------------------------------------------------

/**
 * 문서 이벤트 타입.
 */
export type DocumentEventType = 'created' | 'updated' | 'deleted' | 'published';

/**
 * 문서 생성 이벤트 페이로드.
 */
export interface DocumentCreatedEvent {
  type: 'created';
  documentId: number;
  boardId: number;
  authorId: number | null;
  status: string;
  timestamp: Date;
}

/**
 * 문서 수정 이벤트 페이로드.
 */
export interface DocumentUpdatedEvent {
  type: 'updated';
  documentId: number;
  boardId: number;
  editorId: number;
  changes: { title?: boolean; content?: boolean; status?: boolean };
  timestamp: Date;
}

/**
 * 문서 삭제 이벤트 페이로드.
 */
export interface DocumentDeletedEvent {
  type: 'deleted';
  documentId: number;
  boardId: number;
  deletedById: number;
  timestamp: Date;
}

/**
 * 문서 발행 이벤트 페이로드 (임시글 → 공개).
 */
export interface DocumentPublishedEvent {
  type: 'published';
  documentId: number;
  boardId: number;
  publishedBy: number;
  timestamp: Date;
}

/**
 * 모든 문서 이벤트 타입.
 */
export type DocumentEvent =
  | DocumentCreatedEvent
  | DocumentUpdatedEvent
  | DocumentDeletedEvent
  | DocumentPublishedEvent;

// ---------------------------------------------------------------------------
// 이벤트 핸들러 타입
// ---------------------------------------------------------------------------

/**
 * 이벤트 핸들러 함수 타입.
 */
export type DocumentEventHandler<T extends DocumentEvent> = (event: T) => void | Promise<void>;

// ---------------------------------------------------------------------------
// 이벤트 버스 구현
// ---------------------------------------------------------------------------

/**
 * 문서 이벤트 버스.
 *
 * EventEmitter를 래핑하여 타입 안전한 emit/on/off를 제공.
 */
class DocumentEventBus extends EventEmitter {
  /**
   * 이벤트를 발행한다.
   *
   * @param event - 이벤트 객체
   */
  override emit<T extends DocumentEvent>(event: T): boolean;
  override emit(eventName: string | symbol, ...args: unknown[]): boolean;
  override emit(eventOrName: DocumentEvent | string | symbol, ...args: unknown[]): boolean {
    if (typeof eventOrName === 'object' && eventOrName !== null && 'type' in eventOrName) {
      return super.emit((eventOrName as DocumentEvent).type, eventOrName);
    }
    return super.emit(eventOrName as string, ...args);
  }

  /**
   * 이벤트 핸들러를 등록한다.
   *
   * @param type - 이벤트 타입
   * @param handler - 핸들러 함수
   */
  override on<T extends DocumentEvent>(
    type: T['type'],
    handler: DocumentEventHandler<T>,
  ): this {
    return super.on(type, handler);
  }

  /**
   * 일회용 이벤트 핸들러를 등록한다.
   *
   * @param type - 이벤트 타입
   * @param handler - 핸들러 함수
   */
  override once<T extends DocumentEvent>(
    type: T['type'],
    handler: DocumentEventHandler<T>,
  ): this {
    return super.once(type, handler);
  }

  /**
   * 이벤트 핸들러를 제거한다.
   *
   * @param type - 이벤트 타입
   * @param handler - 핸들러 함수
   */
  override off<T extends DocumentEvent>(
    type: T['type'],
    handler: DocumentEventHandler<T>,
  ): this {
    return super.off(type, handler);
  }

  /**
   * 등록된 모든 핸들러를 제거한다.
   *
   * @param type - 이벤트 타입 (생략 시 전체 제거)
   */
  override removeAllListeners(type?: DocumentEventType): this {
    if (type === undefined) {
      // 인자 없이 호출 시 모든 이벤트의 리스너를 제거
      return super.removeAllListeners();
    }
    return super.removeAllListeners(type);
  }

  /**
   * 등록된 핸들러 수를 반환한다.
   *
   * @param type - 이벤트 타입
   */
  override listenerCount(type: DocumentEventType): number {
    return super.listenerCount(type);
  }
}

// ---------------------------------------------------------------------------
// 싱글톤 인스턴스
// ---------------------------------------------------------------------------

/**
 * 글로벌 문서 이벤트 버스 인스턴스.
 */
export const documentEvents = new DocumentEventBus();

// ---------------------------------------------------------------------------
// 유틸리티 함수
// ---------------------------------------------------------------------------

/**
 * 문서 생성 이벤트를 발행한다.
 */
export function emitDocumentCreated(params: {
  documentId: number;
  boardId: number;
  authorId: number | null;
  status: string;
}): void {
  const event: DocumentCreatedEvent = {
    type: 'created',
    documentId: params.documentId,
    boardId: params.boardId,
    authorId: params.authorId,
    status: params.status,
    timestamp: new Date(),
  };
  documentEvents.emit(event);
}

/**
 * 문서 수정 이벤트를 발행한다.
 */
export function emitDocumentUpdated(params: {
  documentId: number;
  boardId: number;
  editorId: number;
  changes: { title?: boolean; content?: boolean; status?: boolean };
}): void {
  const event: DocumentUpdatedEvent = {
    type: 'updated',
    documentId: params.documentId,
    boardId: params.boardId,
    editorId: params.editorId,
    changes: params.changes,
    timestamp: new Date(),
  };
  documentEvents.emit(event);
}

/**
 * 문서 삭제 이벤트를 발행한다.
 */
export function emitDocumentDeleted(params: {
  documentId: number;
  boardId: number;
  deletedById: number;
}): void {
  const event: DocumentDeletedEvent = {
    type: 'deleted',
    documentId: params.documentId,
    boardId: params.boardId,
    deletedById: params.deletedById,
    timestamp: new Date(),
  };
  documentEvents.emit(event);
}

/**
 * 문서 발행 이벤트를 발행한다.
 */
export function emitDocumentPublished(params: {
  documentId: number;
  boardId: number;
  publishedBy: number;
}): void {
  const event: DocumentPublishedEvent = {
    type: 'published',
    documentId: params.documentId,
    boardId: params.boardId,
    publishedBy: params.publishedBy,
    timestamp: new Date(),
  };
  documentEvents.emit(event);
}
