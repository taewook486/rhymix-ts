/**
 * apps/web/lib/modules/registry.ts — SPEC-CONTENT-001 Slice B (T-001)
 *
 * 정적 모듈 레지스트리.
 * [mid]/page.tsx 같은 라우트 핸들러가 moduleCode 로 ModuleDefinition 을 즉시 조회하는 단일 진입점.
 *
 * core/modules/registry.ts 와 다른 점:
 *   - core 의 registerModule/getModule 은 runtime mutable singleton + HMR-safe pattern 용.
 *   - 본 모듈은 build-time static map — 새 모듈 추가 시 import + Map.set 만 하면 된다.
 *
 * @MX:ANCHOR [AUTO]: 모든 모듈 라우팅의 진입점. 새 모듈 추가 시 반드시 등록.
 * @MX:REASON: [mid]/page.tsx, RSC delegation, 그리고 향후 admin.module.list UI 의 모듈 선택자가
 *             본 Map 을 참조한다. fan_in 즉시 3+.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */
import { boardModule } from '@rhymix-ts/board';
import type { ModuleDefinition } from '@rhymix-ts/core/modules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY = new Map<string, ModuleDefinition<any>>();

REGISTRY.set(boardModule.code, boardModule);

/**
 * moduleCode 로 ModuleDefinition 을 조회한다.
 * 등록되지 않은 코드면 undefined 반환 (호출자가 notFound() 등 처리).
 */
export function getModuleDefinition(
  code: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ModuleDefinition<any> | undefined {
  return REGISTRY.get(code);
}

/** 등록된 모든 ModuleDefinition 을 배열로 반환한다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function listRegisteredModules(): ReadonlyArray<ModuleDefinition<any>> {
  return [...REGISTRY.values()];
}
