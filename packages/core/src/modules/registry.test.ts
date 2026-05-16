/**
 * registry.test.ts — SPEC-ADMIN-001 Slice A
 *
 * RED 단계: registry 가 아직 구현되지 않은 상태에서 작성.
 * A-12: 등록 + 조회 + 목록
 * A-13: 미등록 코드 → ModuleNotRegisteredError
 * A-14: 중복 등록 → DuplicateModuleError
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  registerModule,
  getModule,
  listModules,
  resetRegistry,
} from './registry';
import type { ModuleDefinition } from './types';
import { ModuleNotRegisteredError, DuplicateModuleError } from './errors';

const fakeBoardDef: ModuleDefinition<{ skinName: string }> = {
  code: 'board',
  displayName: 'Board',
  configSchema: z.object({ skinName: z.string() }),
  defaultConfig: { skinName: 'default' },
  routes: {},
};

describe('module registry', () => {
  beforeEach(() => {
    resetRegistry();
  });

  // A-12: 등록 + getModule + listModules
  it('A-12: registerModule 후 getModule("board") 가 등록된 정의를 반환한다', () => {
    registerModule(fakeBoardDef);
    const def = getModule('board');
    expect(def).toBe(fakeBoardDef);
  });

  it('A-12b: listModules() 가 등록된 모듈 배열을 반환한다', () => {
    registerModule(fakeBoardDef);
    const list = listModules();
    expect(list).toHaveLength(1);
    expect(list[0]).toBe(fakeBoardDef);
  });

  // A-13: 미등록 코드 → ModuleNotRegisteredError
  it('A-13: 미등록 코드 "wiki" → ModuleNotRegisteredError', () => {
    expect(() => getModule('wiki')).toThrow(ModuleNotRegisteredError);
  });

  // A-14: 중복 등록 → DuplicateModuleError
  it('A-14: 동일 코드 두 번째 등록 → DuplicateModuleError', () => {
    registerModule(fakeBoardDef);
    expect(() => registerModule(fakeBoardDef)).toThrow(DuplicateModuleError);
  });

  it('A-14b: resetRegistry() 후 재등록 가능', () => {
    registerModule(fakeBoardDef);
    resetRegistry();
    expect(() => registerModule(fakeBoardDef)).not.toThrow();
    expect(getModule('board')).toBe(fakeBoardDef);
  });
});
