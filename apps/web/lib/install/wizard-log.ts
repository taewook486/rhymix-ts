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
  /** 추가 컨텍스트 — 민감 키는 자동으로 [REDACTED] 처리됨 (REQ-INSTALL-051). */
  meta?: Record<string, unknown>;
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

/**
 * 민감 키를 [REDACTED]로 마스킹하는 redactor — REQ-INSTALL-051.
 *
 * password, pass, secret, token, key 등 민감한 키를 포함하는 객체를
 * 로그에 기록하기 전에 값을 마스킹합니다.
 *
 * @MX:NOTE: [AUTO] 위저드 로그에서 민감 정보 노출 방지 — REQ-INSTALL-051.
 */
const SENSITIVE_KEYS = /^(password|pass|secret|token|key|credential|auth)$/i;

export function redactSensitiveKeys(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(k)) {
      result[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = redactSensitiveKeys(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/** Append a step-transition entry; evicts oldest when capacity exceeded. */
export function logStepTransition(entry: {
  step: InstallStep;
  ip: string;
  userAgent: string;
  meta?: Record<string, unknown>;
}): void {
  const store = getStore();
  const safeEntry: WizardLogEntry = {
    step: entry.step,
    ip: entry.ip,
    userAgent: entry.userAgent,
    timestamp: new Date(),
    meta: entry.meta ? redactSensitiveKeys(entry.meta) : undefined,
  };
  store.entries.push(safeEntry);
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
