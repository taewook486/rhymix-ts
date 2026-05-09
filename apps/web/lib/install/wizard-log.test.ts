/**
 * Wizard step transition log (REQ-INSTALL-004) — RED-first specification.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  WIZARD_LOG_BUFFER_SIZE,
  __resetWizardLogForTests,
  getRecentLogs,
  logStepTransition,
} from './wizard-log';

afterEach(() => {
  __resetWizardLogForTests();
});

describe('wizard-log', () => {
  it('the system shall append a log entry on every recorded step transition', () => {
    logStepTransition({ step: 'license', ip: '127.0.0.1', userAgent: 'test/1.0' });
    const logs = getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.step).toBe('license');
    expect(logs[0]?.ip).toBe('127.0.0.1');
    expect(logs[0]?.userAgent).toBe('test/1.0');
    expect(logs[0]?.timestamp).toBeInstanceOf(Date);
  });

  it('the system shall return entries in insertion order (oldest first)', () => {
    logStepTransition({ step: 'license', ip: '1.1.1.1', userAgent: 'a' });
    logStepTransition({ step: 'env-check', ip: '1.1.1.1', userAgent: 'a' });
    logStepTransition({ step: 'db', ip: '1.1.1.1', userAgent: 'a' });
    const logs = getRecentLogs();
    expect(logs.map((l) => l.step)).toEqual(['license', 'env-check', 'db']);
  });

  it('the system shall evict oldest entries when buffer exceeds capacity (FIFO)', () => {
    for (let i = 0; i < WIZARD_LOG_BUFFER_SIZE + 5; i++) {
      logStepTransition({ step: 'license', ip: `10.0.0.${i}`, userAgent: 'a' });
    }
    const logs = getRecentLogs();
    expect(logs).toHaveLength(WIZARD_LOG_BUFFER_SIZE);
    // First five should have been evicted; oldest remaining is index 5.
    expect(logs[0]?.ip).toBe('10.0.0.5');
  });

  it('the system shall honour the optional limit argument', () => {
    for (let i = 0; i < 10; i++) {
      logStepTransition({ step: 'license', ip: `10.0.0.${i}`, userAgent: 'a' });
    }
    const logs = getRecentLogs(3);
    expect(logs).toHaveLength(3);
    // Most recent three (insertion order preserved within slice).
    expect(logs.map((l) => l.ip)).toEqual(['10.0.0.7', '10.0.0.8', '10.0.0.9']);
  });

  it('the system shall persist the buffer across module re-evaluation (HMR survival)', () => {
    logStepTransition({ step: 'license', ip: '203.0.113.1', userAgent: 'hmr' });
    // HMR survival is implemented via globalThis[Symbol.for(...)]. Verify the
    // store is reachable through the exact symbol any future module copy
    // would discover, irrespective of module-local closure state.
    const STORE_KEY = Symbol.for('rhymix-ts.wizard-log');
    type Store = { entries: Array<{ ip: string }> };
    const store = (globalThis as unknown as { [k: symbol]: Store | undefined })[STORE_KEY];
    expect(store).toBeDefined();
    expect(store?.entries.some((e) => e.ip === '203.0.113.1')).toBe(true);
  });
});
