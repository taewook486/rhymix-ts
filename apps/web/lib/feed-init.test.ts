/**
 * Feed cache invalidation wiring tests — SPEC-FEED-001 T-009
 *
 * 문서 생성/수정/삭제 시 feed 캐시 재검증이 올바르게 호출되는지 검증한다.
 *
 * 외부 의존성은 모두 모킹:
 *   - `next/cache` (Next.js 16 revalidateTag)
 *   - `@rhymix-ts/document` (documentEvents EventEmitter)
 *   - `@rhymix-ts/board/feed` (registerFeedCacheInvalidation)
 *   - `@rhymix-ts/db` (prisma client)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 이벤트 핸들러 타입
type DocumentEvent = { type: 'created' | 'updated' | 'deleted'; boardId: number };

// 이벤트 핸들러 저장소
const eventHandlers = new Map<string, Array<(event: DocumentEvent) => void>>();

const {
  revalidateTagMock,
  documentEventsMock,
  prismaMock,
  registerFeedCacheInvalidationMock,
  disposeMock,
} = vi.hoisted(() => {
  const handlers = new Map<string, Array<(event: DocumentEvent) => void>>();

  return {
    revalidateTagMock: vi.fn(),
    documentEventsMock: {
      on: vi.fn((eventType: string, handler: (event: DocumentEvent) => void) => {
        // 이벤트 핸들러를 저장
        if (!handlers.has(eventType)) {
          handlers.set(eventType, []);
        }
        handlers.get(eventType)!.push(handler);
      }),
      off: vi.fn((eventType: string, handler: (event: DocumentEvent) => void) => {
        // 이벤트 핸들러를 제거
        const handlersForType = handlers.get(eventType);
        if (handlersForType) {
          const index = handlersForType.indexOf(handler);
          if (index > -1) {
            handlersForType.splice(index, 1);
          }
        }
      }),
      _getHandlers: (eventType: string) => handlers.get(eventType) || [],
      _clear: () => handlers.clear(),
    },
    prismaMock: {
      board: {
        findUnique: vi.fn(),
      },
    },
    registerFeedCacheInvalidationMock: vi.fn(),
    disposeMock: vi.fn(),
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: revalidateTagMock,
}));

vi.mock('@rhymix-ts/document', () => ({
  documentEvents: documentEventsMock,
}));

vi.mock('@rhymix-ts/board/feed', () => ({
  registerFeedCacheInvalidation: registerFeedCacheInvalidationMock,
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: prismaMock,
}));

vi.mock('./db/prisma', () => ({
  prisma: prismaMock,
}));

import { registerFeedEvents, _resetFeedInit } from './feed-init';

beforeEach(() => {
  _resetFeedInit();
  revalidateTagMock.mockClear();
  documentEventsMock.on.mockClear();
  documentEventsMock.off.mockClear();
  documentEventsMock._clear();
  prismaMock.board.findUnique.mockReset();
  registerFeedCacheInvalidationMock.mockReset();
  disposeMock.mockReset();
});

describe('feed-init', () => {
  describe('registerFeedEvents', () => {
    it('문서 생성 시 feed 캐시를 재검증한다', async () => {
      // Given: boardId에 해당하는 moduleInstanceId가 존재
      const testBoardId = 123;
      const testModuleInstanceId = 456;
      prismaMock.board.findUnique.mockResolvedValue({
        id: testBoardId,
        moduleInstanceId: testModuleInstanceId,
      });

      // registerFeedCacheInvalidation mock 설정
      // 이 함수가 실제로 documentEvents에 리스너를 등록하고, 그 리스너가 revalidateTag를 호출하도록 구현
      registerFeedCacheInvalidationMock.mockImplementation(({ documentEvents }, ctx) => {
        // 각 이벤트 타입에 대해 핸들러 등록
        const eventTypes = ['created', 'updated', 'deleted'] as const;
        eventTypes.forEach((type) => {
          documentEvents.on(type, async (event: { type: string; boardId: string }) => {
            // boardId에서 moduleInstanceId를 찾음
            const moduleInstanceId = await ctx.resolveModuleInstanceId(event.boardId);
            if (moduleInstanceId) {
              ctx.revalidateTag(`feed:${moduleInstanceId}`);
            }
          });
        });

        return { dispose: disposeMock };
      });

      // When: feed 이벤트 등록
      registerFeedEvents();

      // Then: registerFeedCacheInvalidation가 호출되었는지 확인
      expect(registerFeedCacheInvalidationMock).toHaveBeenCalledTimes(1);
      expect(registerFeedCacheInvalidationMock).toHaveBeenCalledWith(
        { documentEvents: documentEventsMock },
        expect.objectContaining({
          resolveModuleInstanceId: expect.any(Function),
          revalidateTag: expect.any(Function),
        }),
      );

      // Given: 문서 생성 이벤트 발생
      const testEvent = { type: 'created' as const, boardId: testBoardId };

      // When: 등록된 이벤트 핸들러 호출
      const handlers = documentEventsMock._getHandlers('created');
      expect(handlers.length).toBe(1);
      await handlers[0]!(testEvent);

      // Then: revalidateTag가 'feed:{moduleInstanceId}' 태그로 호출되었는지 확인
      expect(revalidateTagMock).toHaveBeenCalledWith(`feed:${testModuleInstanceId}`, undefined);
    });

    it('문서 수정 시 feed 캐시를 재검증한다', async () => {
      // Given: boardId에 해당하는 moduleInstanceId가 존재
      const testBoardId = 789;
      const testModuleInstanceId = 999;
      prismaMock.board.findUnique.mockResolvedValue({
        id: testBoardId,
        moduleInstanceId: testModuleInstanceId,
      });

      registerFeedCacheInvalidationMock.mockImplementation(({ documentEvents }, ctx) => {
        ['created', 'updated', 'deleted'].forEach((type) => {
          documentEvents.on(type, async (event: { type: string; boardId: string }) => {
            const moduleInstanceId = await ctx.resolveModuleInstanceId(event.boardId);
            if (moduleInstanceId) {
              ctx.revalidateTag(`feed:${moduleInstanceId}`);
            }
          });
        });
        return { dispose: disposeMock };
      });

      // When: feed 이벤트 등록
      registerFeedEvents();

      // Given: 문서 수정 이벤트 발생
      const testEvent = { type: 'updated' as const, boardId: testBoardId };

      // When: 등록된 이벤트 핸들러 호출
      const handlers = documentEventsMock._getHandlers('updated');
      expect(handlers.length).toBe(1);
      await handlers[0]!(testEvent);

      // Then: revalidateTag가 호출되었는지 확인
      expect(revalidateTagMock).toHaveBeenCalledWith(`feed:${testModuleInstanceId}`, undefined);
    });

    it('문서 삭제 시 feed 캐시를 재검증한다', async () => {
      // Given: boardId에 해당하는 moduleInstanceId가 존재
      const testBoardId = 101;
      const testModuleInstanceId = 202;
      prismaMock.board.findUnique.mockResolvedValue({
        id: testBoardId,
        moduleInstanceId: testModuleInstanceId,
      });

      registerFeedCacheInvalidationMock.mockImplementation(({ documentEvents }, ctx) => {
        ['created', 'updated', 'deleted'].forEach((type) => {
          documentEvents.on(type, async (event: { type: string; boardId: string }) => {
            const moduleInstanceId = await ctx.resolveModuleInstanceId(event.boardId);
            if (moduleInstanceId) {
              ctx.revalidateTag(`feed:${moduleInstanceId}`);
            }
          });
        });
        return { dispose: disposeMock };
      });

      // When: feed 이벤트 등록
      registerFeedEvents();

      // Given: 문서 삭제 이벤트 발생
      const testEvent = { type: 'deleted' as const, boardId: testBoardId };

      // When: 등록된 이벤트 핸들러 호출
      const handlers = documentEventsMock._getHandlers('deleted');
      expect(handlers.length).toBe(1);
      await handlers[0]!(testEvent);

      // Then: revalidateTag가 호출되었는지 확인
      expect(revalidateTagMock).toHaveBeenCalledWith(`feed:${testModuleInstanceId}`, undefined);
    });

    it('board를 찾지 못하면 캐시 재검증을 하지 않는다', async () => {
      // Given: boardId에 해당하는 board가 존재하지 않음
      const testBoardId = 999;
      prismaMock.board.findUnique.mockResolvedValue(null);

      registerFeedCacheInvalidationMock.mockImplementation(({ documentEvents }, ctx) => {
        ['created', 'updated', 'deleted'].forEach((type) => {
          documentEvents.on(type, async (event: { type: string; boardId: string }) => {
            const moduleInstanceId = await ctx.resolveModuleInstanceId(event.boardId);
            if (moduleInstanceId) {
              ctx.revalidateTag(`feed:${moduleInstanceId}`);
            }
          });
        });
        return { dispose: disposeMock };
      });

      // When: feed 이벤트 등록
      registerFeedEvents();

      // Given: 문서 생성 이벤트 발생
      const testEvent = { type: 'created' as const, boardId: testBoardId };

      // When: 등록된 이벤트 핸들러 호출
      const handlers = documentEventsMock._getHandlers('created');
      await handlers[0]!(testEvent);

      // Then: revalidateTag가 호출되지 않아야 함
      expect(revalidateTagMock).not.toHaveBeenCalled();
    });

    it('이미 등록된 경우 재등록하지 않는다 (HMR-safe)', () => {
      registerFeedCacheInvalidationMock.mockReturnValue({ dispose: disposeMock });

      // When: 첫 번째 등록
      registerFeedEvents();

      // When: 두 번째 등록 시도
      registerFeedEvents();

      // Then: registerFeedCacheInvalidation가 한 번만 호출되어야 함
      expect(registerFeedCacheInvalidationMock).toHaveBeenCalledTimes(1);
    });

    it('_resetFeedInit으로 초기화 상태를 리셋할 수 있다', () => {
      registerFeedCacheInvalidationMock.mockReturnValue({ dispose: disposeMock });

      // When: 첫 번째 등록
      registerFeedEvents();

      // When: 리셋 후 재등록
      _resetFeedInit();
      registerFeedEvents();

      // Then: registerFeedCacheInvalidation가 두 번 호출되어야 함 (리셋 후 재등록 가능)
      expect(registerFeedCacheInvalidationMock).toHaveBeenCalledTimes(2);
    });
  });
});
