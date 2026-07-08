/**
 * apps/web/lib/modules/registry.test.ts — SPEC-CONTENT-001 Slice B (T-001)
 *
 * apps/web 레이어의 정적 모듈 레지스트리.
 * [mid]/page.tsx 가 moduleCode 로 ModuleDefinition 을 즉시 조회하기 위한 단일 진입점.
 *
 * B-101 ~ B-103: getModuleDefinition + listRegisteredModules 동작 검증.
 */
import { describe, it, expect } from 'vitest';

describe('module registry (apps/web)', () => {
  // NOTE: the first `import('./registry')` transitively cold-transforms board's full
  // dependency graph; on slow filesystems (WSL2/drvfs) this can exceed the default
  // 15s testTimeout. Under full-suite parallel worker contention this took >90s
  // (26s in isolation), so the budget is generous here (see packages/board/src/index.test.ts A-1).
  it('B-101: getModuleDefinition("board") → boardModule 반환 (code === "board")', async () => {
    const { getModuleDefinition } = await import('./registry');
    const def = getModuleDefinition('board');
    expect(def).toBeDefined();
    expect(def?.code).toBe('board');
  }, 180000);

  it('B-102: getModuleDefinition("unknown-module") → undefined', async () => {
    const { getModuleDefinition } = await import('./registry');
    const def = getModuleDefinition('unknown-module');
    expect(def).toBeUndefined();
  });

  it('B-103: listRegisteredModules() 결과에 "board" 가 포함됨', async () => {
    const { listRegisteredModules } = await import('./registry');
    const codes = listRegisteredModules().map((m) => m.code);
    expect(codes).toContain('board');
  });

  // SPEC-PAGE-001 REQ-PAGE-010
  it('B-104: getModuleDefinition("page") → pageModuleDefinition 반환', async () => {
    const { getModuleDefinition } = await import('./registry');
    const def = getModuleDefinition('page');
    expect(def).toBeDefined();
    expect(def?.code).toBe('page');
  });

  it('B-105: listRegisteredModules() 결과에 "page" 가 포함됨', async () => {
    const { listRegisteredModules } = await import('./registry');
    const codes = listRegisteredModules().map((m) => m.code);
    expect(codes).toContain('page');
  });
});
