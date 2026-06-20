/**
 * cache-invalidation.ts — SPEC-FEED-001 Slice B (T-009)
 *
 * 문서 이벤트(created/updated/deleted) 구독 → 해당 게시판의 피드 캐시 태그
 * (`feed:{moduleInstanceId}`) 를 무효화한다(REQ-FEED-042, AC-FEED-B1).
 *
 * `packages/board` 는 Next.js 비의존 패키지이므로 `next/cache` 의 revalidateTag 를
 * 직접 import 하지 않는다 — registerFileEventSubscribers(packages/file/src/events.ts)
 * 와 동일한 의존성 주입 패턴으로 revalidateTag/resolveModuleInstanceId 를 받는다.
 * 실제 연결은 apps/web/lib/feed-init.ts 가 수행한다.
 *
 * @MX:ANCHOR [AUTO]: registerFeedCacheInvalidation — 피드 캐시 무효화의 유일한 등록 진입점.
 * @MX:REASON: 문서 이벤트(created/updated/deleted) 3종이 모두 이 함수를 거쳐야
 *             feed:{moduleInstanceId} 태그 무효화가 일관되게 보장된다.
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-042
 */

/** 문서 이벤트 버스 구조적 타입 — document 패키지의 EventEmitter 호환 인터페이스. */
interface DocumentEventLike {
  type: 'created' | 'updated' | 'deleted' | 'published';
  boardId: number;
}

export interface FeedCacheEventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void | Promise<void>): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, handler: (...args: any[]) => void | Promise<void>): unknown;
}

export interface FeedCacheInvalidationEmitters {
  documentEvents: FeedCacheEventBus;
}

export interface FeedCacheInvalidationContext {
  /** Board.id → ModuleInstance.id 변환. board 가 없거나 feed 대상이 아니면 null. */
  resolveModuleInstanceId: (boardId: number) => Promise<number | null>;
  /** next/cache 의 revalidateTag — apps/web 레이어에서 실제 구현을 주입한다. */
  revalidateTag: (tag: string) => void;
}

/**
 * 문서 이벤트 구독자를 등록하고, 해당 게시판의 피드 캐시 태그를 무효화한다.
 *
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-042, AC-FEED-B1
 */
export function registerFeedCacheInvalidation(
  emitters: FeedCacheInvalidationEmitters,
  ctx: FeedCacheInvalidationContext,
): { dispose: () => void } {
  const handler = (event: DocumentEventLike) => {
    void ctx
      .resolveModuleInstanceId(event.boardId)
      .then((moduleInstanceId) => {
        if (moduleInstanceId == null) return;
        ctx.revalidateTag(`feed:${moduleInstanceId}`);
      })
      .catch((err) => {
        console.error('[feed-cache-invalidation] resolveModuleInstanceId failed:', err, {
          boardId: event.boardId,
        });
      });
  };

  emitters.documentEvents.on('created', handler);
  emitters.documentEvents.on('updated', handler);
  emitters.documentEvents.on('deleted', handler);

  return {
    dispose: () => {
      emitters.documentEvents.off('created', handler);
      emitters.documentEvents.off('updated', handler);
      emitters.documentEvents.off('deleted', handler);
    },
  };
}
