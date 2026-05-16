/**
 * registry.ts — SPEC-ADMIN-001 Slice A
 *
 * 모듈 레지스트리: process-scoped Map 으로 모듈 정의를 저장.
 * 새 모듈을 추가하려면 registerModule(definition) 을 정적 import 시 호출.
 *
 * @MX:WARN: process-scoped singleton Map
 * @MX:REASON: module-level singleton; relies on Node.js single-process runtime;
 *             not safe under per-request worker isolation (serverless) or
 *             Next.js dev mode HMR (모듈이 재실행되어 중복 등록 에러 발생 가능).
 *             Slice B 에서 Next.js 부트스트랩 패턴 (서버 시작 시 1회 등록, HMR 시 재실행 차단) 으로 해결 예정.
 *             Slice A 는 strict throw 유지.
 */

import type { ModuleDefinition } from './types';
import { ModuleNotRegisteredError, DuplicateModuleError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY = new Map<string, ModuleDefinition<any>>();

/**
 * 모듈을 레지스트리에 등록한다.
 * 동일 code 가 이미 등록된 경우 DuplicateModuleError 를 던진다.
 */
export function registerModule<TConfig>(def: ModuleDefinition<TConfig>): void {
  if (REGISTRY.has(def.code)) {
    throw new DuplicateModuleError(def.code);
  }
  REGISTRY.set(def.code, def);
}

/**
 * 등록된 모듈 정의를 반환한다.
 * 등록되지 않은 코드 → ModuleNotRegisteredError.
 */
export function getModule(code: string): ModuleDefinition {
  const def = REGISTRY.get(code);
  if (!def) {
    throw new ModuleNotRegisteredError(code);
  }
  return def;
}

/** 등록된 모든 모듈 정의를 배열로 반환한다. */
export function listModules(): ModuleDefinition[] {
  return [...REGISTRY.values()];
}

/**
 * 레지스트리를 초기화한다.
 * 테스트 격리 목적으로만 사용할 것.
 */
export function resetRegistry(): void {
  REGISTRY.clear();
}
