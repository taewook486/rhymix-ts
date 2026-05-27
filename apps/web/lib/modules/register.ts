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
import { registerBuiltinWidgets } from '@rhymix-ts/core/widgets/builtin';
import { boardModule } from '@rhymix-ts/board';
import { pageModuleDefinition } from '@rhymix-ts/page';

let initialized = false;

export function initModules(): void {
  if (initialized) return;

  // 빌트인 위젯 등록 (멱등성 보장 — 내부적으로 _initialized 플래그로 한 번만 실행)
  registerBuiltinWidgets();

  const modules = [boardModule, pageModuleDefinition];

  for (const mod of modules) {
    try {
      registerModule(mod);
    } catch (err) {
      if (err instanceof DuplicateModuleError) {
        // HMR reload — 이미 등록된 모듈. 무시해도 안전.
      } else {
        throw err;
      }
    }
  }

  initialized = true;
}
