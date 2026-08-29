/**
 * apps/web/lib/feed-init.ts — SPEC-FEED-001 T-009
 *
 * Feed 캐시 무효화 이벤트 구독 등록.
 * Next.js instrumentation.ts에서 호출하여 문서 생성/수정/삭제 시 피드 캐시를 재검증한다.
 *
 * @MX:NOTE [AUTO]: HMR-safe singleton. `initialized` flag 의 module-scope semantics 가
 *   Next.js 의 process 모델에 의존. Edge runtime 에서는 호출하지 말 것.
 * @MX:SPEC: SPEC-FEED-001 REQ-FEED-042 AC-FEED-B1
 */
import { documentEvents } from '@rhymix-ts/document';
import { registerFeedCacheInvalidation } from '@rhymix-ts/board/feed';
import { revalidateTag as nextRevalidateTag } from 'next/cache';
import { prisma } from './db/prisma';

let initialized = false;
let disposeFn: (() => void) | null = null;

/**
 * Feed 캐시 무효화 이벤트 구독자를 등록한다.
 *
 * 문서 생성/수정/삭제 시 연결된 피드 캐시를 재검증하기 위해
 * 피드 패키지의 캐시 무효화 구독자를 등록한다.
 *
 * HMR-safe: 이미 등록된 경우 재등록하지 않는다.
 */
export function registerFeedEvents(): void {
  if (initialized) {
    return;
  }

  try {
    const result = registerFeedCacheInvalidation(
      {
        documentEvents,
      },
      {
        resolveModuleInstanceId: async (boardId: number) => {
          const board = await prisma.board.findUnique({
            where: { id: boardId },
          });
          return board?.moduleInstanceId ?? null;
        },
        revalidateTag: (tag: string) => {
          // Next.js 16 revalidateTag takes 2 arguments (tag, profile?)
          // The second parameter appears to be optional in practice
          // Next 타입 정의에 없는 2번째 인자를 런타임이 요구한다.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nextRevalidateTag(tag, undefined as any);
        },
      },
    );

    disposeFn = result.dispose;
    initialized = true;

    console.log('[feed-init] Feed cache invalidation registered successfully');
  } catch (err) {
    console.error('[feed-init] Failed to register feed cache invalidation:', err);
    throw err;
  }
}

/**
 * Feed 캐시 무효화 이벤트 구독자를 해제한다.
 *
 * 테스트 또는 HMR reload 시 사용한다.
 */
export function unregisterFeedEvents(): void {
  if (disposeFn) {
    disposeFn();
    disposeFn = null;
  }
  initialized = false;
  console.log('[feed-init] Feed cache invalidation unregistered');
}

/**
 * 초기화 상태를 리셋한다.
 *
 * 테스트 전용으로 사용한다.
 */
export function _resetFeedInit(): void {
  unregisterFeedEvents();
}
