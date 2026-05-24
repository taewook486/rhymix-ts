/**
 * Wizard step transition log (REQ-INSTALL-004) — RED-first specification.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  WIZARD_LOG_BUFFER_SIZE,
  __resetWizardLogForTests,
  getRecentLogs,
  logStepTransition,
  redactSensitiveKeys,
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

// ---------------------------------------------------------------------------
// CH-2: password 키 redact 테스트 (REQ-INSTALL-051)
// ---------------------------------------------------------------------------

describe('redactSensitiveKeys', () => {
  it('CH-2: the system shall mask "password" key value as [REDACTED]', () => {
    const result = redactSensitiveKeys({ password: 'Secret123!', step: 'admin' });
    expect(result.password).toBe('[REDACTED]');
    expect(result.step).toBe('admin');
  });

  it('CH-2: the system shall mask "pass", "secret", "token" key values as [REDACTED]', () => {
    const result = redactSensitiveKeys({
      pass: 'db-pass',
      secret: 'my-secret',
      token: 'csrf-token',
      user: 'admin',
    });
    expect(result.pass).toBe('[REDACTED]');
    expect(result.secret).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.user).toBe('admin');
  });

  it('CH-2: the system shall recursively redact nested sensitive keys', () => {
    const result = redactSensitiveKeys({
      config: { password: 'nested-pass', host: 'localhost' },
    });
    const nested = result.config as Record<string, unknown>;
    expect(nested.password).toBe('[REDACTED]');
    expect(nested.host).toBe('localhost');
  });

  it('CH-2: the system shall not redact non-sensitive keys', () => {
    const result = redactSensitiveKeys({ ip: '127.0.0.1', step: 'license', userAgent: 'bot' });
    expect(result.ip).toBe('127.0.0.1');
    expect(result.step).toBe('license');
    expect(result.userAgent).toBe('bot');
  });

  it('CH-2: logStepTransition with meta containing password → ring buffer entry has [REDACTED]', () => {
    logStepTransition({
      step: 'admin',
      ip: '1.2.3.4',
      userAgent: 'test',
      meta: { password: 'Secret123!', email: 'admin@example.com' },
    });
    const logs = getRecentLogs(1);
    expect(logs[0]?.meta?.password).toBe('[REDACTED]');
    expect(logs[0]?.meta?.email).toBe('admin@example.com');
  });
});
