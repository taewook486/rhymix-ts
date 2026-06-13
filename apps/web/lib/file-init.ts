/**
 * apps/web/lib/file-init.ts — SPEC-FILE-001 Slice A
 *
 * File 패키지 이벤트 구독 등록.
 * Next.js instrumentation.ts에서 호출하여 파일 cascade delete를 활성화한다.
 *
 * @MX:NOTE [AUTO]: HMR-safe singleton. `initialized` flag 의 module-scope semantics 가
 *   Next.js 의 process 모델에 의존. Edge runtime 에서는 호출하지 말 것.
 * @MX:SPEC: SPEC-FILE-001 REQ-FILE-001
 */
import { documentEvents } from '@rhymix-ts/document';
import { commentEvents } from '@rhymix-ts/comment';
import { registerFileEventSubscribers } from '@rhymix-ts/file';
import { prisma } from './db/prisma';
import { getStorage } from '@rhymix-ts/file';

let initialized = false;
let disposeFn: (() => void) | null = null;

/**
 * File 이벤트 구독자를 등록한다.
 *
 * 문서/댓글 삭제 시 연결된 첨부 파일을 cascade soft-delete 하기 위해
 * 파일 패키지의 이벤트 구독자를 등록한다.
 *
 * HMR-safe: 이미 등록된 경우 재등록하지 않는다.
 */
export function registerFileEvents(): void {
  if (initialized) {
    return;
  }

  try {
    const storage = getStorage();
    const result = registerFileEventSubscribers(
      {
        documentEvents,
        commentEvents,
      },
      {
        prisma,
        storage,
      },
    );

    disposeFn = result.dispose;
    initialized = true;

    console.log('[file-init] File event subscribers registered successfully');
  } catch (err) {
    console.error('[file-init] Failed to register file event subscribers:', err);
    throw err;
  }
}

/**
 * File 이벤트 구독자를 해제한다.
 *
 * 테스트 또는 HMR reload 시 사용한다.
 */
export function unregisterFileEvents(): void {
  if (disposeFn) {
    disposeFn();
    disposeFn = null;
  }
  initialized = false;
  console.log('[file-init] File event subscribers unregistered');
}

/**
 * 초기화 상태를 리셋한다.
 *
 * 테스트 전용으로 사용한다.
 */
export function _resetFileInit(): void {
  unregisterFileEvents();
}
