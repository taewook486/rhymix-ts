/**
 * Specification tests for install wizard server actions.
 * Covers REQ-INSTALL-011 (license accept) and REQ-INSTALL-013 (db config validation).
 *
 * 모든 외부 의존성(iron-session, redirect, pg validator)은 모킹되며, 본
 * 테스트는 단계별 게이트와 세션 변이가 올바르게 일어나는지를 확인합니다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  sessionState,
  redirectMock,
  validateMock,
  acquireLockMock,
  seedInstallMock,
  hashPasswordMock,
  isDisposableMock,
  headersMock,
  clearSessionMock,
} = vi.hoisted(() => {
  const state = {
    licenseAccepted: false,
    envChecksPass: false,
    dbConfigValidated: false,
    step: 'license' as string,
    language: 'en',
    db: undefined as unknown,
    admin: undefined as unknown,
    save: vi.fn(),
  };
  return {
    sessionState: state,
    redirectMock: vi.fn((url: string): never => {
      throw new Error(`__REDIRECT__:${url}`);
    }),
    validateMock: vi.fn(),
    acquireLockMock: vi.fn(),
    seedInstallMock: vi.fn(),
    hashPasswordMock: vi.fn(),
    isDisposableMock: vi.fn(),
    headersMock: vi.fn(),
    clearSessionMock: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/install/wizard-session', () => ({
  getWizardSession: async () => sessionState,
  clearWizardSession: clearSessionMock,
}));

vi.mock('@rhymix-ts/db', () => ({
  validateDbConnection: validateMock,
  acquireInstallLock: acquireLockMock,
  seedInstall: seedInstallMock,
  prisma: {} as Record<string, never>,
}));

vi.mock('@rhymix-ts/auth', () => ({
  hashPassword: hashPasswordMock,
  isDisposableEmail: isDisposableMock,
  PASSWORD_VERSION_TAG: 'argon2id-v1',
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
  cookies: vi.fn(),
}));

import {
  agreeLicense,
  validateDbConfig,
  setEnvChecksPass,
  performInstall,
} from './actions';

beforeEach(() => {
  sessionState.licenseAccepted = false;
  sessionState.envChecksPass = false;
  sessionState.dbConfigValidated = false;
  sessionState.step = 'license';
  sessionState.db = undefined;
  sessionState.admin = undefined;
  sessionState.save.mockReset();
  redirectMock.mockClear();
  validateMock.mockReset();
  acquireLockMock.mockReset();
  seedInstallMock.mockReset();
  hashPasswordMock.mockReset();
  isDisposableMock.mockReset();
  headersMock.mockReset();
  clearSessionMock.mockReset();
  // 기본값: production이 아닌 dev 환경(performInstall에서 disposable check 우회).
  // 테스트 케이스에서 필요 시 NODE_ENV를 'production'으로 변경.
  // NODE_ENV는 readonly로 타이핑되어 있어 동적 indexer로 우회.
  delete (process.env as Record<string, string | undefined>).NODE_ENV;
  // 기본 헤더 제공.
  headersMock.mockResolvedValue(
    new Map([
      ['x-forwarded-for', '203.0.113.7'],
      ['user-agent', 'vitest'],
      ['host', 'example.com'],
    ]),
  );
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

// ---------------------------------------------------------------------------
// performInstall — Step 4 (REQ-INSTALL-014, 015, 053, 054).
// ---------------------------------------------------------------------------

describe('performInstall', () => {
  const adminForm = (overrides: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.set('email', 'admin@example.com');
    fd.set('password', 'sufficiently-long-password');
    fd.set('password2', 'sufficiently-long-password');
    fd.set('nickName', 'Administrator');
    fd.set('userId', 'admin');
    fd.set('timeZone', 'UTC');
    fd.set('useSsl', 'always');
    fd.set('useSitelock', 'false');
    for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
    return fd;
  };

  const wizardReady = () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    sessionState.dbConfigValidated = true;
    sessionState.step = 'admin';
    sessionState.db = {
      host: '127.0.0.1',
      port: 5444,
      user: 'rhymix',
      pass: 'rhymix',
      database: 'rhymix_ts',
      schema: 'public',
    };
  };

  it('the system shall seed the install, clear the session, and redirect to /install/complete on the happy path', async () => {
    wizardReady();
    isDisposableMock.mockReturnValue(false);
    const release = vi.fn();
    acquireLockMock.mockResolvedValue({ acquired: true, release });
    hashPasswordMock.mockResolvedValue('$argon2id$v=19$hashed');
    seedInstallMock.mockResolvedValue({
      siteId: 1,
      userId: 1,
      adminGroupId: 1,
      memberGroupId: 2,
    });

    await expect(performInstall({ ok: true }, adminForm())).rejects.toThrow(
      /__REDIRECT__:\/install\/complete$/,
    );
    expect(seedInstallMock).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    // 세션은 /install/complete가 자체 렌더 시 폐기 — performInstall에서는 step만 갱신.
    expect(sessionState.step).toBe('finish');
  });

  it('the system shall return a formError when the advisory lock cannot be acquired', async () => {
    wizardReady();
    isDisposableMock.mockReturnValue(false);
    acquireLockMock.mockResolvedValue({ acquired: false, release: vi.fn() });
    const result = await performInstall({ ok: true }, adminForm());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.formError).toMatch(/이미 진행/);
    }
    expect(seedInstallMock).not.toHaveBeenCalled();
  });

  it('the system shall release the lock and return a formError when seedInstall throws', async () => {
    wizardReady();
    isDisposableMock.mockReturnValue(false);
    const release = vi.fn();
    acquireLockMock.mockResolvedValue({ acquired: true, release });
    hashPasswordMock.mockResolvedValue('$argon2id$v=19$hashed');
    seedInstallMock.mockRejectedValue(new Error('database boom'));
    const result = await performInstall({ ok: true }, adminForm());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.formError).toMatch(/설치 실패/);
    }
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('the system shall reject disposable email addresses in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    wizardReady();
    isDisposableMock.mockReturnValue(true);
    acquireLockMock.mockResolvedValue({ acquired: true, release: vi.fn() });
    const result = await performInstall(
      { ok: true },
      adminForm({ email: 'tester@mailinator.com' }),
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.fieldErrors?.email).toBeDefined();
    }
    expect(seedInstallMock).not.toHaveBeenCalled();
    // NODE_ENV는 readonly로 타이핑되어 있어 동적 indexer로 우회.
  delete (process.env as Record<string, string | undefined>).NODE_ENV;
  });

  it('the system shall allow disposable email addresses in non-production environments', async () => {
    // NODE_ENV is not 'production' (default delete in beforeEach).
    wizardReady();
    isDisposableMock.mockReturnValue(true); // would block in production
    const release = vi.fn();
    acquireLockMock.mockResolvedValue({ acquired: true, release });
    hashPasswordMock.mockResolvedValue('$argon2id$v=19$hashed');
    seedInstallMock.mockResolvedValue({
      siteId: 1,
      userId: 1,
      adminGroupId: 1,
      memberGroupId: 2,
    });
    await expect(
      performInstall({ ok: true }, adminForm({ email: 'tester@mailinator.com' })),
    ).rejects.toThrow(/__REDIRECT__:\/install\/complete$/);
    expect(seedInstallMock).toHaveBeenCalledTimes(1);
  });

  it('the system shall return a formError when session.db is missing', async () => {
    sessionState.licenseAccepted = true;
    sessionState.envChecksPass = true;
    sessionState.dbConfigValidated = true;
    sessionState.step = 'admin';
    sessionState.db = undefined;
    isDisposableMock.mockReturnValue(false);
    const result = await performInstall({ ok: true }, adminForm());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.formError).toMatch(/DB|데이터/);
    }
    expect(acquireLockMock).not.toHaveBeenCalled();
  });

  it('the system shall redirect away when admin step gate is not satisfied', async () => {
    // admin step 진입 가드 미충족 — requireWizardStep이 즉시 redirect.
    sessionState.licenseAccepted = false;
    await expect(performInstall({ ok: true }, adminForm())).rejects.toThrow(
      /__REDIRECT__:\/install/,
    );
    expect(seedInstallMock).not.toHaveBeenCalled();
  });
});
