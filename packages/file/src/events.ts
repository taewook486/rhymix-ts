/**
 * events.ts — 파일 도메인 이벤트 구독
 *
 * document.deleted + comment.deleted 이벤트를 구독하여
 * 연결된 FileAttachment를 cascade 처리한다.
 *
 * @MX:NOTE [AUTO]: 이벤트 버스 구독 진입점. registerFileEventSubscribers를 앱 시작 시 호출해야 함.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-040~049
 */
import type { PrismaClient } from '@prisma/client';
import type { FileStorage } from './storage/types';

// 이벤트 타입 인라인 정의 — packages/file이 document/comment에 의존하지 않도록 구조적 타이핑 사용
type DocumentDeletedEvent = { documentId: number; boardId: number; deletedById: number; timestamp: Date };
type CommentDeletedEvent = { commentId: number; documentId: number | null; boardId: number; deletedById: number; timestamp: Date };

export interface FileEventSubscriberContext {
  prisma: PrismaClient;
  storage: FileStorage;
}

/**
 * Event bus interface — document와 comment 패키지의 EventEmitter 호환 인터페이스.
 *
 * @MX:NOTE [AUTO]: EventEmitter 기반의 on/off API.
 */
export interface EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void | Promise<void>): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, handler: (...args: any[]) => void | Promise<void>): unknown;
}

export interface FileEventEmitters {
  documentEvents: EventBus;
  commentEvents: EventBus;
}

/**
 * 파일 이벤트 구독자 등록.
 * 앱 시작 시 한 번 호출 (Next.js instrumentation.ts 또는 서버 시작점).
 *
 * @MX:ANCHOR [AUTO]: 파일 cascading delete의 유일한 등록 진입점.
 * @MX:REASON: 여러 이벤트 소스(document, comment)의 구독을 단일 함수로 통합.
 */
export function registerFileEventSubscribers(
  emitters: FileEventEmitters,
  ctx: FileEventSubscriberContext,
): { dispose: () => void } {
  // Store handlers so we can unsubscribe later
  const docDeletedHandler = (e: DocumentDeletedEvent) => {
    cascadeDeleteByDocumentId({ documentId: e.documentId }, ctx).catch((err) => {
      console.error('[file-events] cascadeDeleteByDocumentId failed:', err, { documentId: e.documentId });
    });
  };

  const comDeletedHandler = (e: CommentDeletedEvent) => {
    cascadeDeleteByCommentId({ commentId: e.commentId }, ctx).catch((err) => {
      console.error('[file-events] cascadeDeleteByCommentId failed:', err, { commentId: e.commentId });
    });
  };

  // Subscribe to events
  emitters.documentEvents.on('deleted', docDeletedHandler);
  emitters.commentEvents.on('deleted', comDeletedHandler);

  // Return dispose function that unsubscribes
  return {
    dispose: () => {
      emitters.documentEvents.off('deleted', docDeletedHandler);
      emitters.commentEvents.off('deleted', comDeletedHandler);
    },
  };
}

/**
 * 문서 삭제 시 첨부 파일 cascade soft-delete.
 *
 * @MX:NOTE [AUTO]: isvalid=false 마킹 (cleanup cron이 storage 파일 회수).
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-041
 */
export async function cascadeDeleteByDocumentId(
  input: { documentId: number },
  ctx: { prisma: PrismaClient },
): Promise<void> {
  await ctx.prisma.fileAttachment.updateMany({
    where: { documentId: input.documentId, isvalid: true },
    data: { isvalid: false },
  });
}

/**
 * 댓글 삭제 시 첨부 파일 cascade soft-delete.
 *
 * @MX:NOTE [AUTO]: isvalid=false 마킹 (cleanup cron이 storage 파일 회수).
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-042
 */
export async function cascadeDeleteByCommentId(
  input: { commentId: number },
  ctx: { prisma: PrismaClient },
): Promise<void> {
  await ctx.prisma.fileAttachment.updateMany({
    where: { commentId: input.commentId, isvalid: true },
    data: { isvalid: false },
  });
}
