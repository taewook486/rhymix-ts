/**
 * Specification tests for autologin — SPEC-AUTH-001 Slice E.
 *
 * RED-first: tests are authored before `autologin.ts` exists.
 *
 * Coverage:
 *   - REQ-AUTH-018 issueAutoLogin (HMAC-SHA256 hash, lazy secret validation)
 *   - REQ-AUTH-019 rotateAutoLogin (atomic rotation, previousTokenHash propagation)
 *   - REQ-AUTH-053 detectTokenReuse (previousTokenHash 매치 시 전체 세션 무효화)
 *   - 쿠키 포맷 `<id>.<token>` 파싱 / 유효성 검증
 *   - HMAC secret missing / too short 에 대한 lazy throw
 */

import type { PrismaClient } from '@rhymix-ts/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AutoLoginConfigError,
  detectTokenReuse,
  issueAutoLogin,
  NoopSecurityAlertDispatcher,
  rotateAutoLogin,
  verifyAutoLogin,
  type SecurityAlertDispatcher,
} from './autologin';

// ---------------------------------------------------------------------------
// In-memory Prisma fake
// ---------------------------------------------------------------------------

interface FakeAutoLogin {
  id: number;
  userId: number;
  tokenHash: string;
  previousTokenHash: string | null;
  ip: string;
  userAgent: string;
  deviceId: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

interface FakeUser {
  id: number;
  sessionsRevokedAt: Date | null;
}

interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
  metadata: Record<string, unknown>;
}

interface FakeSessionRevocation {
  id: number;
  userId: number;
  revokedAt: Date;
  reason: string;
}

function buildFakePrisma(opts: { users?: FakeUser[]; autoLogins?: FakeAutoLogin[] } = {}) {
  const users: FakeUser[] = [...(opts.users ?? [])];
  const autoLogins: FakeAutoLogin[] = [...(opts.autoLogins ?? [])];
  const auditLogs: FakeAuditLog[] = [];
  const sessionRevocations: FakeSessionRevocation[] = [];
  let nextAutoLoginId = autoLogins.length > 0 ? Math.max(...autoLogins.map((a) => a.id)) + 1 : 1;
  let nextRevocationId = 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    autoLogin: {
      create: async (args: { data: Omit<FakeAutoLogin, 'id' | 'createdAt' | 'lastUsedAt'> }) => {
        const now = new Date();
        const row: FakeAutoLogin = {
          id: nextAutoLoginId++,
          createdAt: now,
          lastUsedAt: now,
          ...args.data,
          deviceId: args.data.deviceId ?? null,
          previousTokenHash: args.data.previousTokenHash ?? null,
        };
        autoLogins.push(row);
        return row;
      },
      findUnique: async (args: { where: { id: number } }) =>
        autoLogins.find((a) => a.id === args.where.id) ?? null,
      findUniqueOrThrow: async (args: { where: { id: number } }) => {
        const row = autoLogins.find((a) => a.id === args.where.id);
        if (!row) throw new Error('AutoLogin not found');
        return row;
      },
      update: async (args: {
        where: { id: number };
        data: Partial<FakeAutoLogin>;
      }) => {
        const row = autoLogins.find((a) => a.id === args.where.id);
        if (!row) throw new Error('AutoLogin not found');
        Object.assign(row, args.data);
        return row;
      },
      deleteMany: async (args: { where: { userId: number } }) => {
        const before = autoLogins.length;
        for (let i = autoLogins.length - 1; i >= 0; i--) {
          if (autoLogins[i]!.userId === args.where.userId) autoLogins.splice(i, 1);
        }
        return { count: before - autoLogins.length };
      },
    },
    auditLog: {
      create: async (args: { data: FakeAuditLog }) => {
        auditLogs.push(args.data);
        return args.data;
      },
    },
    sessionRevocation: {
      create: async (args: { data: Omit<FakeSessionRevocation, 'id'> }) => {
        const row = { id: nextRevocationId++, ...args.data };
        sessionRevocations.push(row);
        return row;
      },
    },
    user: {
      findUnique: async (args: { where: { id: number } }) =>
        users.find((u) => u.id === args.where.id) ?? null,
      update: async (args: { where: { id: number }; data: Partial<FakeUser> }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, args.data);
        return u;
      },
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> => fn(fake),
  };

  return { prisma: fake as unknown as PrismaClient, state: { users, autoLogins, auditLogs, sessionRevocations } };
}

// ---------------------------------------------------------------------------
// HMAC secret management
// ---------------------------------------------------------------------------

const VALID_SECRET = 'a'.repeat(32) + 'test-suite-padding-for-32-chars-min';
const ORIGINAL_SECRET = process.env.AUTOLOGIN_HMAC_SECRET;

beforeEach(() => {
  process.env.AUTOLOGIN_HMAC_SECRET = VALID_SECRET;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.AUTOLOGIN_HMAC_SECRET;
  } else {
    process.env.AUTOLOGIN_HMAC_SECRET = ORIGINAL_SECRET;
  }
});

// ---------------------------------------------------------------------------
// Tests — issueAutoLogin
// ---------------------------------------------------------------------------

describe('issueAutoLogin (REQ-AUTH-018)', () => {
  it('1) happy path — returns cookie value `<id>.<token>` and stores tokenHash', async () => {
    const user: FakeUser = { id: 7, sessionsRevokedAt: null };
    const { prisma, state } = buildFakePrisma({ users: [user] });

    const before = Date.now();
    const result = await issueAutoLogin(7, {
      prisma,
      ip: '127.0.0.1',
      userAgent: 'vitest',
    });
    const after = Date.now();

    expect(result.cookieValue).toMatch(/^\d+\.[A-Za-z0-9_-]{43}$/);
    expect(state.autoLogins).toHaveLength(1);
    expect(state.autoLogins[0]!.tokenHash).toBeTruthy();
    expect(state.autoLogins[0]!.previousTokenHash).toBeNull();
    // expiresAt ≈ now + 365d
    const expectedMs = 365 * 24 * 60 * 60 * 1000;
    const actualDeltaMs = state.autoLogins[0]!.expiresAt.getTime() - before;
    expect(actualDeltaMs).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(actualDeltaMs).toBeLessThanOrEqual(expectedMs + (after - before) + 1000);
    // cookieValue id portion matches DB id
    const dot = result.cookieValue.indexOf('.');
    expect(parseInt(result.cookieValue.slice(0, dot), 10)).toBe(state.autoLogins[0]!.id);
  });

  it('2) throws AutoLoginConfigError when HMAC secret missing', async () => {
    delete process.env.AUTOLOGIN_HMAC_SECRET;
    const { prisma } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await expect(
      issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' }),
    ).rejects.toBeInstanceOf(AutoLoginConfigError);
  });

  it('3) throws AutoLoginConfigError when HMAC secret too short', async () => {
    process.env.AUTOLOGIN_HMAC_SECRET = 'short';
    const { prisma } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await expect(
      issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' }),
    ).rejects.toBeInstanceOf(AutoLoginConfigError);
  });

  it('4) accepts external transaction client (does not call $transaction)', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    // simulate Prisma.TransactionClient (no $transaction)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = { ...(prisma as any) };
    delete tx.$transaction;
    const txSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tx as any).$transaction = txSpy; // shouldn't be invoked but available as truthy for safety

    const result = await issueAutoLogin(1, {
      prisma: tx,
      ip: '127.0.0.1',
      userAgent: 'v',
    });

    expect(result.cookieValue).toBeTruthy();
    expect(state.autoLogins).toHaveLength(1);
    expect(txSpy).not.toHaveBeenCalled();
  });

  it('5) creates AuditLog AUTOLOGIN_ISSUED', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });
    expect(state.auditLogs.some((a) => a.action === 'AUTOLOGIN_ISSUED')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — verifyAutoLogin
// ---------------------------------------------------------------------------

describe('verifyAutoLogin (REQ-AUTH-019, REQ-AUTH-053)', () => {
  it('6) happy path — issued cookie verifies to ok', async () => {
    const { prisma } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    const issued = await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });

    const result = await verifyAutoLogin(issued.cookieValue, { prisma });

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.userId).toBe(1);
      expect(result.autoLoginId).toBeGreaterThan(0);
    }
  });

  it('7) expired row → expired', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    const issued = await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });
    // force expiry into the past
    state.autoLogins[0]!.expiresAt = new Date(Date.now() - 1000);

    const result = await verifyAutoLogin(issued.cookieValue, { prisma });
    expect(result.kind).toBe('expired');
  });

  it('8) invalid format (no dot) → invalid without DB query', async () => {
    const { prisma } = buildFakePrisma();
    const result = await verifyAutoLogin('no-dot-token', { prisma });
    expect(result.kind).toBe('invalid');
  });

  it('9) id exists but hash mismatch (tampered token) → invalid', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });

    const id = state.autoLogins[0]!.id;
    const tamperedCookie = `${id}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;

    const result = await verifyAutoLogin(tamperedCookie, { prisma });
    expect(result.kind).toBe('invalid');
  });

  it('10) previousTokenHash match → reuse-detected', async () => {
    const { prisma } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    const issued = await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });

    // rotate — issued's token now lives in previousTokenHash
    const verified = await verifyAutoLogin(issued.cookieValue, { prisma });
    expect(verified.kind).toBe('ok');
    if (verified.kind !== 'ok') return;
    await rotateAutoLogin(verified.autoLoginId, { prisma });

    // now reuse the OLD cookie
    const result = await verifyAutoLogin(issued.cookieValue, { prisma });
    expect(result.kind).toBe('reuse-detected');
    if (result.kind === 'reuse-detected') {
      expect(result.userId).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — rotateAutoLogin
// ---------------------------------------------------------------------------

describe('rotateAutoLogin (REQ-AUTH-019)', () => {
  it('11) happy path — tokenHash becomes new, previousTokenHash becomes old', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    const issued = await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });
    const verified = await verifyAutoLogin(issued.cookieValue, { prisma });
    if (verified.kind !== 'ok') throw new Error('expected ok');

    const oldTokenHash = state.autoLogins[0]!.tokenHash;
    const rotated = await rotateAutoLogin(verified.autoLoginId, { prisma });

    expect(rotated.cookieValue).toMatch(/^\d+\.[A-Za-z0-9_-]{43}$/);
    expect(state.autoLogins[0]!.previousTokenHash).toBe(oldTokenHash);
    expect(state.autoLogins[0]!.tokenHash).not.toBe(oldTokenHash);
    expect(state.autoLogins[0]!.lastUsedAt).toBeInstanceOf(Date);
  });

  it('12) double rotation — previousTokenHash chains to the first-rotation hash, not the original', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    const issued = await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });
    const v1 = await verifyAutoLogin(issued.cookieValue, { prisma });
    if (v1.kind !== 'ok') throw new Error('v1');

    const rotated1 = await rotateAutoLogin(v1.autoLoginId, { prisma });
    const afterFirstRotation = state.autoLogins[0]!.tokenHash;

    const v2 = await verifyAutoLogin(rotated1.cookieValue, { prisma });
    if (v2.kind !== 'ok') throw new Error('v2');

    await rotateAutoLogin(v2.autoLoginId, { prisma });

    expect(state.autoLogins[0]!.previousTokenHash).toBe(afterFirstRotation);
  });
});

// ---------------------------------------------------------------------------
// Tests — detectTokenReuse
// ---------------------------------------------------------------------------

describe('detectTokenReuse (REQ-AUTH-053)', () => {
  it('13) revokes all sessions with TOKEN_REUSE_DETECTED reason', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });

    await detectTokenReuse(1, { prisma });

    expect(state.sessionRevocations.some((r) => r.reason === 'TOKEN_REUSE_DETECTED')).toBe(true);
    expect(state.users[0]!.sessionsRevokedAt).not.toBeNull();
  });

  it('14) deletes all autologin rows for the user', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await issueAutoLogin(1, { prisma, ip: '127.0.0.1', userAgent: 'v' });
    await issueAutoLogin(1, { prisma, ip: '127.0.0.2', userAgent: 'v2' });
    expect(state.autoLogins).toHaveLength(2);

    await detectTokenReuse(1, { prisma });

    expect(state.autoLogins.filter((a) => a.userId === 1)).toHaveLength(0);
  });

  it('15) creates AuditLog TOKEN_REUSE_DETECTED', async () => {
    const { prisma, state } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    await detectTokenReuse(1, { prisma });
    expect(state.auditLogs.some((a) => a.action === 'TOKEN_REUSE_DETECTED')).toBe(true);
  });

  it('16) invokes injected mailDispatcher; defaults to Noop when not provided', async () => {
    const { prisma } = buildFakePrisma({ users: [{ id: 1, sessionsRevokedAt: null }] });
    const sendSpy = vi.fn(async () => {});
    const dispatcher: SecurityAlertDispatcher = { sendSecurityAlert: sendSpy };

    await detectTokenReuse(1, { prisma, mailDispatcher: dispatcher });

    expect(sendSpy).toHaveBeenCalledWith(1, 'TOKEN_REUSE_DETECTED');

    // default Noop path — must not throw
    const { prisma: prisma2 } = buildFakePrisma({ users: [{ id: 2, sessionsRevokedAt: null }] });
    await expect(detectTokenReuse(2, { prisma: prisma2 })).resolves.toBeUndefined();
    // NoopSecurityAlertDispatcher constructible directly
    const noop = new NoopSecurityAlertDispatcher();
    await expect(noop.sendSecurityAlert(2, 'X')).resolves.toBeUndefined();
  });
});
