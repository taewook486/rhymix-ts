/**
 * apps/web/lib/modules/register.ts — SPEC-CONTENT-001 Slice A
 *
 * HMR-safe singleton 모듈 등록.
 * Next.js dev 모드에서 모듈이 reload 되어도 한 번만 등록된다.
 *
 * @MX:NOTE [AUTO]: HMR-safe singleton. `initialized` flag 의 module-scope semantics 가
 *   Next.js 의 process 모델에 의존. Edge runtime 에서는 호출하지 말 것.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */
import { registerModule, DuplicateModuleError } from '@rhymix-ts/core/modules';
import { boardModule } from '@rhymix-ts/board';

let initialized = false;

export function initModules(): void {
  if (initialized) return;
  try {
    registerModule(boardModule);
  } catch (err) {
    if (err instanceof DuplicateModuleError) {
      // HMR reload — already registered. Safe to ignore.
    } else {
      throw err;
    }
  }
  initialized = true;
}
