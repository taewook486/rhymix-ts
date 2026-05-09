/**
 * 인스톨 위저드 단계 전이 로그 — REQ-INSTALL-004.
 *
 * 메모리 링 버퍼에 직접 기록되며, DB 쓰기는 발생하지 않습니다 (REQ-INSTALL-050).
 * HMR 사이클에서도 globalThis 심볼을 통해 동일한 버퍼 인스턴스를 공유합니다.
 *
 * @MX:NOTE: 위저드 1~3단계 동안 DB 미사용 정책을 강제하는 핵심 컴포넌트.
 */
import type { InstallStep } from '@rhymix-ts/core';

/** Maximum entries kept in the ring buffer (FIFO eviction beyond this). */
export const WIZARD_LOG_BUFFER_SIZE = 100;

export interface WizardLogEntry {
  step: InstallStep;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

interface WizardLogStore {
  entries: WizardLogEntry[];
}

const STORE_KEY = Symbol.for('rhymix-ts.wizard-log');

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: WizardLogStore };

function getStore(): WizardLogStore {
  const g = globalThis as GlobalWithStore;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { entries: [] };
  }
  return g[STORE_KEY];
}

/** Append a step-transition entry; evicts oldest when capacity exceeded. */
export function logStepTransition(entry: {
  step: InstallStep;
  ip: string;
  userAgent: string;
}): void {
  const store = getStore();
  store.entries.push({ ...entry, timestamp: new Date() });
  if (store.entries.length > WIZARD_LOG_BUFFER_SIZE) {
    store.entries.splice(0, store.entries.length - WIZARD_LOG_BUFFER_SIZE);
  }
}

/** Read recent entries; oldest first. With `limit`, return the trailing slice. */
export function getRecentLogs(limit?: number): WizardLogEntry[] {
  const all = getStore().entries.slice();
  if (limit === undefined || limit >= all.length) return all;
  return all.slice(all.length - limit);
}

/** Test helper — never call from production code. */
export function __resetWizardLogForTests(): void {
  const g = globalThis as GlobalWithStore;
  delete g[STORE_KEY];
}
