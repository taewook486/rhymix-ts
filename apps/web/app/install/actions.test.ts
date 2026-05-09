/**
 * Specification tests for install wizard server actions.
 * Covers REQ-INSTALL-011 (license accept) and REQ-INSTALL-013 (db config validation).
 *
 * 모든 외부 의존성(iron-session, redirect, pg validator)은 모킹되며, 본
 * 테스트는 단계별 게이트와 세션 변이가 올바르게 일어나는지를 확인합니다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionState, redirectMock, validateMock } = vi.hoisted(() => {
  const state = {
    licenseAccepted: false,
    envChecksPass: false,
    dbConfigValidated: false,
    step: 'license' as string,
    language: 'en',
    db: undefined as unknown,
    save: vi.fn(),
  };
  return {
    sessionState: state,
    redirectMock: vi.fn((url: string): never => {
      throw new Error(`__REDIRECT__:${url}`);
    }),
    validateMock: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/install/wizard-session', () => ({
  getWizardSession: async () => sessionState,
  clearWizardSession: vi.fn(),
}));

vi.mock('@rhymix-ts/db', () => ({
  validateDbConnection: validateMock,
}));

import { agreeLicense, validateDbConfig, setEnvChecksPass } from './actions';

beforeEach(() => {
  sessionState.licenseAccepted = false;
  sessionState.envChecksPass = false;
  sessionState.dbConfigValidated = false;
  sessionState.step = 'license';
  sessionState.db = undefined;
  sessionState.save.mockReset();
  redirectMock.mockClear();
  validateMock.mockReset();
});

describe('agreeLicense', () => {
  it('the system shall set licenseAccepted=true and redirect to /install/check-env on valid agreement', async () => {
    const fd = new FormData();
    fd.set('accepted', 'true');
    await expect(agreeLicense({ ok: true }, fd)).rejects.toThrow(
      /__REDIRECT__:\/install\/check-env$/,
    );
    expect(sessionState.licenseAccepted).toBe(true);
    expect(sessionState.save).toHaveBeenCalled();
  });

  it('the system shall return a fieldError when license is not accepted', async () => {
    const fd = new FormData();
    const result = await agreeLicense({ ok: true }, fd);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.fieldErrors?.accepted).toMatch(/동의/);
    }
    expect(sessionState.licenseAccepted).toBe(false);
  });
});

describe('setEnvChecksPass', () => {
  it('the system shall mark env checks as passing and persist the session', async () => {
    sessionState.licenseAccepted = true;
    await setEnvChecksPass();
    expect(sessionState.envChecksPass).toBe(true);
    expect(sessionState.save).toHaveBeenCalled();
  });
});

describe('validateDbConfig', () => {
  const fillForm = (overrides: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.set('host', '127.0.0.1');
    fd.set('port', '5444');
    fd.set('user', 'rhymix');
    fd.set('pass', 'rhymix');
    fd.set('database', 'rhymix_ts');
    fd.set('schema', 'public');
    for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
    return fd;
  };

  it('the system shall reject the action when license has not been accepted', async () => {
    const result = await validateDbConfig({ ok: true }, fillForm());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.formError).toMatch(/이전 단계/);
    }
    expect(validateMock).not.toHaveBeenCalled();
  });

  it('the system shall reject when env checks have not passed', async () => {
    sessionState.licenseAccepted = true;
    const result = await validateDbConfig({ ok: true }, fillForm());
    expect(result.ok).toBe(false);
    expect(validateMock).not.toHaveBeenCalled();
  });

  it('the system shall return a Korean field error for superuser-rejected', async () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    validateMock.mockResolvedValue({
      ok: false,
      errors: [{ code: 'superuser-rejected', message: 'superuser blocked' }],
    });
    const result = await validateDbConfig({ ok: true }, fillForm({ user: 'postgres' }));
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.fieldErrors?.user).toMatch(/슈퍼유저/);
    }
    expect(sessionState.dbConfigValidated).toBe(false);
  });

  it('the system shall return a formError for unreachable hosts', async () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    validateMock.mockResolvedValue({
      ok: false,
      errors: [{ code: 'unreachable', message: 'ECONNREFUSED' }],
    });
    const result = await validateDbConfig({ ok: true }, fillForm());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.formError).toMatch(/접속/);
    }
  });

  it('the system shall return a formError when reserved tables already exist', async () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    validateMock.mockResolvedValue({
      ok: false,
      errors: [
        {
          code: 'tables-exist',
          message: 'collision',
          details: { collidingTables: ['users'] },
        },
      ],
    });
    const result = await validateDbConfig({ ok: true }, fillForm());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.formError).toMatch(/테이블/);
    }
  });

  it('the system shall persist db config and redirect to /install/admin-config on success', async () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    validateMock.mockResolvedValue({ ok: true, errors: [] });
    await expect(validateDbConfig({ ok: true }, fillForm())).rejects.toThrow(
      /__REDIRECT__:\/install\/admin-config$/,
    );
    expect(sessionState.dbConfigValidated).toBe(true);
    expect(sessionState.step).toBe('admin');
    expect((sessionState.db as { host: string }).host).toBe('127.0.0.1');
    expect(sessionState.save).toHaveBeenCalled();
  });

  it('the system shall surface zod field errors on bad input', async () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    const fd = fillForm({ host: '' });
    const result = await validateDbConfig({ ok: true }, fd);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.fieldErrors?.host).toBeDefined();
    }
    expect(validateMock).not.toHaveBeenCalled();
  });
});
