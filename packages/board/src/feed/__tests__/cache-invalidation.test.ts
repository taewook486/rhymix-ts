/**
 * cache-invalidation.test.ts — SPEC-FEED-001 Slice B (T-009)
 *
 * 문서 이벤트(created/updated/deleted) 구독 → revalidateTag('feed:' + moduleInstanceId)
 * 호출을 검증한다 — AC-FEED-B1, REQ-FEED-042.
 *
 * 이 모듈은 `next/cache` 에 의존하지 않는다(packages/board 는 Next.js 비의존 패키지) —
 * revalidateTag/resolveModuleInstanceId 를 의존성 주입으로 받아 apps/web 레이어에서
 * 실제 next/cache revalidateTag 를 연결한다 (registerFileEventSubscribers 패턴과 동일).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { registerFeedCacheInvalidation } from '../cache-invalidation.js';

function makeEmitter() {
  const ee = new EventEmitter();
  return {
    on: (type: string, handler: (...args: unknown[]) => void) => ee.on(type, handler),
    off: (type: string, handler: (...args: unknown[]) => void) => ee.off(type, handler),
    // documentEvents 실제 구현(packages/document/src/events.ts)은 event.type 으로 디스패치한다.
    emit: (event: { type: string } & Record<string, unknown>) => ee.emit(event.type, event),
  };
}

describe('registerFeedCacheInvalidation (SPEC-FEED-001 T-009)', () => {
  let documentEvents: ReturnType<typeof makeEmitter>;
  let mockRevalidateTag: ReturnType<typeof vi.fn>;
  let mockResolveModuleInstanceId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    documentEvents = makeEmitter();
    mockRevalidateTag = vi.fn();
    mockResolveModuleInstanceId = vi.fn().mockResolvedValue(42);
  });

  it('CACHE-INV-1 (REQ-FEED-042/AC-FEED-B1): created 이벤트 → revalidateTag("feed:{moduleInstanceId}") 호출', async () => {
    registerFeedCacheInvalidation(
      { documentEvents },
      { revalidateTag: mockRevalidateTag, resolveModuleInstanceId: mockResolveModuleInstanceId },
    );

    documentEvents.emit({
      type: 'created',
      documentId: 1,
      boardId: 7,
      authorId: null,
      status: 'PUBLIC',
      timestamp: new Date(),
    });

    // EventEmitter 핸들러는 동기 호출이지만 내부에서 async resolve 를 거치므로 microtask flush
    await Promise.resolve();
    await Promise.resolve();

    expect(mockResolveModuleInstanceId).toHaveBeenCalledWith(7);
    expect(mockRevalidateTag).toHaveBeenCalledWith('feed:42');
  });

  it('CACHE-INV-2 (REQ-FEED-042): updated 이벤트 → revalidateTag 호출', async () => {
    registerFeedCacheInvalidation(
      { documentEvents },
      { revalidateTag: mockRevalidateTag, resolveModuleInstanceId: mockResolveModuleInstanceId },
    );

    documentEvents.emit({
      type: 'updated',
      documentId: 2,
      boardId: 7,
      editorId: 1,
      changes: {},
      timestamp: new Date(),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRevalidateTag).toHaveBeenCalledWith('feed:42');
  });

  it('CACHE-INV-3 (REQ-FEED-042): deleted 이벤트 → revalidateTag 호출', async () => {
    registerFeedCacheInvalidation(
      { documentEvents },
      { revalidateTag: mockRevalidateTag, resolveModuleInstanceId: mockResolveModuleInstanceId },
    );

    documentEvents.emit({
      type: 'deleted',
      documentId: 3,
      boardId: 7,
      deletedById: 1,
      timestamp: new Date(),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRevalidateTag).toHaveBeenCalledWith('feed:42');
  });

  it('CACHE-INV-4: boardId 가 board 가 아닌 경우(resolveModuleInstanceId null) revalidateTag 를 호출하지 않는다', async () => {
    mockResolveModuleInstanceId.mockResolvedValue(null);
    registerFeedCacheInvalidation(
      { documentEvents },
      { revalidateTag: mockRevalidateTag, resolveModuleInstanceId: mockResolveModuleInstanceId },
    );

    documentEvents.emit({
      type: 'created',
      documentId: 1,
      boardId: 999,
      authorId: null,
      status: 'PUBLIC',
      timestamp: new Date(),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('CACHE-INV-5: dispose() 호출 후에는 이벤트가 더 이상 구독되지 않는다', async () => {
    const { dispose } = registerFeedCacheInvalidation(
      { documentEvents },
      { revalidateTag: mockRevalidateTag, resolveModuleInstanceId: mockResolveModuleInstanceId },
    );
    dispose();

    documentEvents.emit({
      type: 'created',
      documentId: 1,
      boardId: 7,
      authorId: null,
      status: 'PUBLIC',
      timestamp: new Date(),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
