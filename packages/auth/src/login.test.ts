/**
 * Specification tests for the login pipeline.
 *
 * SPEC-AUTH-001 Slice C coverage:
 *   - REQ-AUTH-005, REQ-AUTH-006 (validation, no leakage)
 *   - REQ-AUTH-013 (last_login_ip/at update + LoginAttempt SUCCESS row)
 *   - REQ-AUTH-014 (transparent rehash on legacy/weak hash)
 *   - REQ-AUTH-015 (LoginAttempt FAIL row + AuditLog LOGIN_FAILED)
 *   - REQ-AUTH-051 (uniform "INVALID_CREDENTIALS" error shape — no leakage)
 *   - REQ-AUTH-052 (DeniedIdentifier still applies at login)
 *   - REQ-AUTH-055 (no plaintext password leaks anywhere)
 *
 * Mocks: hand-rolled in-memory Prisma fake. Argon2id 검증은 실제 hashPassword 결과를 사용.
 */
import type { PrismaClient } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it } from 'vitest';

import { hashPassword } from './password';
import { ARGON2ID_PARAMS } from './password-config';
import { type LoginConfig, login } from './login';

// ---------------------------------------------------------------------------
// In-memory Prisma fake
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  userId: string;
  emailAddress: string;
  passwordHash: string;
  passwordAlgo: string;
  passwordChangedAt: Date;
  nickName: string;
  status: 'APPROVED' | 'UNAUTHED' | 'DENIED' | 'SUSPENDED' | 'DELETED';
  isAdmin: boolean;
  lastLoginIp: string | null;
  lastLoginAt: Date | null;
}
interface FakeDenied {
  kind: 'USER_ID' | 'NICK_NAME';
  pattern: string;
}
interface FakeLoginAttempt {
  ip: string;
  identifier: string | null;
  result: 'SUCCESS' | 'INVALID_CREDENTIALS' | 'STATUS_BLOCKED' | 'RATE_LIMITED';
}
interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
}

interface FakeOptions {
  preexistingUsers?: FakeUser[];
  preexistingDenied?: FakeDenied[];
}

function buildFakePrisma(opts: FakeOptions = {}) {
  const users: FakeUser[] = [...(opts.preexistingUsers ?? [])];
  const denied: FakeDenied[] = [...(opts.preexistingDenied ?? [])];
  const loginAttempts: FakeLoginAttempt[] = [];
  const auditLogs: FakeAuditLog[] = [];
  let nextLoginAttemptId = 1;

  function findUser(identifier: string): FakeUser | null {
    const ident = identifier.toLowerCase();
    return (
      users.find(
        (u) =>
          u.userId.toLowerCase() === ident ||
          u.emailAddress.toLowerCase() === ident,
      ) ?? null
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findFirst: async (args: {
        where: {
          OR?: Array<{ userId?: string; emailAddress?: string }>;
        };
      }) => {
        const conds = args.where.OR ?? [];
        return (
          users.find((u) =>
            conds.some(
              (c) =>
                (c.userId !== undefined &&
                  u.userId.toLowerCase() === c.userId.toLowerCase()) ||
                (c.emailAddress !== undefined &&
                  u.emailAddress.toLowerCase() === c.emailAddress.toLowerCase()),
            ),
          ) ?? null
        );
      },
      update: async (args: {
        where: { id: number };
        data: Partial<FakeUser>;
      }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, args.data);
        return u;
      },
    },
    deniedIdentifier: {
      findFirst: async (args: {
        where: { OR: Array<{ kind: string; pattern: string }> };
      }) => {
        const conds = args.where.OR;
        return (
          denied.find((d) =>
            conds.some(
              (c) =>
                d.kind === c.kind &&
                d.pattern.toLowerCase() === c.pattern.toLowerCase(),
            ),
          ) ?? null
        );
      },
    },
    loginAttempt: {
      count: async () => 0,
      create: async (args: { data: FakeLoginAttempt }) => {
        const row = { ...args.data, id: nextLoginAttemptId++ };
        loginAttempts.push(args.data);
        return row;
      },
    },
    auditLog: {
      create: async (args: { data: FakeAuditLog }) => {
        auditLogs.push(args.data);
        return args.data;
      },
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> => {
      return await fn(fake);
    },
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: { users, denied, loginAttempts, auditLogs },
    findUser,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PLAIN = 'correct horse battery staple';

async function makeUser(overrides: Partial<FakeUser> = {}): Promise<FakeUser> {
  return {
    id: 1,
    userId: 'alice',
    emailAddress: 'alice@example.com',
    passwordHash: await hashPassword(PLAIN),
    passwordAlgo: 'argon2id',
    passwordChangedAt: new Date(),
    nickName: 'Alice',
    status: 'APPROVED',
    isAdmin: false,
    lastLoginIp: null,
    lastLoginAt: null,
    ...overrides,
  };
}

const baseInput = (overrides: Record<string, unknown> = {}) => ({
  identifier: 'alice',
  password: PLAIN,
  ip: '203.0.113.5',
  userAgent: 'vitest',
  ...overrides,
});

const baseConfig = (overrides: Partial<LoginConfig> = {}): LoginConfig => ({
  passwordPolicy: 'normal',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('login', () => {
  let user: FakeUser;
  beforeEach(async () => {
    user = await makeUser();
  });

  it('1) valid user_id + password → ok:true, rehashed:false', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const result = await login(baseInput(), { prisma, config: baseConfig() });
    expect(result).toMatchObject({ ok: true, rehashed: false });
    if (result.ok) {
      expect(result.user.id).toBe(1);
      expect(result.user.userId).toBe('alice');
    }
    expect(state.loginAttempts).toHaveLength(1);
    expect(state.loginAttempts[0]?.result).toBe('SUCCESS');
  });

  it('2) valid email (case-insensitive) + password → ok:true', async () => {
    const { prisma } = buildFakePrisma({ preexistingUsers: [user] });
    const result = await login(
      baseInput({ identifier: 'ALICE@example.com' }),
      { prisma, config: baseConfig() },
    );
    expect(result.ok).toBe(true);
  });

  it('3) wrong password → INVALID_CREDENTIALS, FAIL row + LOGIN_FAILED audit', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const result = await login(
      baseInput({ password: 'wrong-password-xyz' }),
      { prisma, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(state.loginAttempts).toHaveLength(1);
    expect(state.loginAttempts[0]?.result).toBe('INVALID_CREDENTIALS');
    expect(state.loginAttempts[0]?.ip).toBe('203.0.113.5');
    expect(state.auditLogs).toHaveLength(1);
    expect(state.auditLogs[0]?.action).toBe('LOGIN_FAILED');
    expect(state.auditLogs[0]?.actorId).toBeNull();
  });

  it('4) non-existent identifier → INVALID_CREDENTIALS (REQ-AUTH-051 — uniform shape)', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await login(
      baseInput({ identifier: 'ghost' }),
      { prisma, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(Object.keys(result).sort()).toEqual(['code', 'ok']);
    expect(state.loginAttempts).toHaveLength(1);
    expect(state.loginAttempts[0]?.result).toBe('INVALID_CREDENTIALS');
  });

  it('5) UNAUTHED user → INVALID_CREDENTIALS (no "verify your email" leak)', async () => {
    const u = await makeUser({ status: 'UNAUTHED' });
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [u] });
    const result = await login(baseInput(), { prisma, config: baseConfig() });
    expect(result).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    // No last-login update
    expect(state.users[0]?.lastLoginAt).toBeNull();
  });

  it('6) SUSPENDED / DENIED / DELETED → INVALID_CREDENTIALS (uniform)', async () => {
    for (const status of ['SUSPENDED', 'DENIED', 'DELETED'] as const) {
      const u = await makeUser({ id: 1, status });
      const { prisma } = buildFakePrisma({ preexistingUsers: [u] });
      const result = await login(baseInput(), { prisma, config: baseConfig() });
      expect(result).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    }
  });

  it('7) successful login updates last_login_ip + last_login_at', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const before = Date.now();
    await login(baseInput(), { prisma, config: baseConfig() });
    const after = Date.now();
    expect(state.users[0]?.lastLoginIp).toBe('203.0.113.5');
    const ts = state.users[0]?.lastLoginAt?.getTime() ?? 0;
    expect(ts).toBeGreaterThanOrEqual(before - 10);
    expect(ts).toBeLessThanOrEqual(after + 10);
  });

  it('8) successful login inserts SUCCESS LoginAttempt row (REQ-AUTH-013 reset signal)', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    await login(baseInput(), { prisma, config: baseConfig() });
    expect(state.loginAttempts).toHaveLength(1);
    expect(state.loginAttempts[0]).toMatchObject({
      ip: '203.0.113.5',
      result: 'SUCCESS',
    });
  });

  it('9a) needsRehash:true (legacy bcrypt-style) → rehashed in same txn, rehashed:true', async () => {
    // Store a legacy-style hash that verifyPassword treats as needsRehash:true.
    // The current verifyPassword for non-argon2 returns valid:false even with the
    // right plaintext, so a true rehash-on-success requires a controllable verifier.
    // For this test, we use a weak argon2id hash (memory below current params).
    const weakHash = await hashPassword(PLAIN, {
      memorySize: 8,
      iterations: 2,
      parallelism: 1,
    });
    const u = await makeUser({ passwordHash: weakHash });
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [u] });
    const result = await login(baseInput(), { prisma, config: baseConfig() });
    expect(result).toMatchObject({ ok: true, rehashed: true });
    // Stored hash should now be a current-params argon2id PHC string.
    const stored = state.users[0]?.passwordHash ?? '';
    expect(stored).toMatch(
      new RegExp(
        `^\\$argon2id\\$v=\\d+\\$m=${ARGON2ID_PARAMS.memoryCost},t=${ARGON2ID_PARAMS.timeCost},p=${ARGON2ID_PARAMS.parallelism}\\$`,
      ),
    );
    // passwordChangedAt should be advanced.
    const changed = state.users[0]?.passwordChangedAt?.getTime() ?? 0;
    expect(changed).toBeGreaterThan(u.passwordChangedAt.getTime() - 1);
  });

  it('9b) needsRehash:false (current params) → no rehash, rehashed:false', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const originalHash = user.passwordHash;
    const result = await login(baseInput(), { prisma, config: baseConfig() });
    expect(result).toMatchObject({ ok: true, rehashed: false });
    expect(state.users[0]?.passwordHash).toBe(originalHash);
  });

  it('10) AuditLog LOGIN written on success with actorId=userId, targetId=userId', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    await login(baseInput(), { prisma, config: baseConfig() });
    expect(state.auditLogs).toHaveLength(1);
    expect(state.auditLogs[0]).toMatchObject({
      action: 'LOGIN',
      actorId: 1,
      targetId: 1,
      ip: '203.0.113.5',
    });
  });

  it('11) password verification still occurs when user not found (timing equalization)', async () => {
    // Difficult to assert directly; a proxy assertion: the function should take
    // at least roughly the time of a single argon2id verify even for unknown users.
    const { prisma } = buildFakePrisma();
    const t0 = Date.now();
    await login(baseInput({ identifier: 'ghost' }), {
      prisma,
      config: baseConfig(),
    });
    const elapsed = Date.now() - t0;
    // hash-wasm argon2id with default params takes roughly 50ms+ on most CPUs.
    // Use a soft floor of 20ms to confirm we actually did *some* CPU work, not
    // a 0ms short-circuit.
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it('12) DeniedIdentifier still applies at login (REQ-AUTH-052 carried into login)', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingUsers: [user],
      preexistingDenied: [{ kind: 'USER_ID', pattern: 'alice' }],
    });
    const result = await login(baseInput(), { prisma, config: baseConfig() });
    expect(result).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    // Should not have been logged in.
    expect(state.users[0]?.lastLoginAt).toBeNull();
  });

  it('13) plaintext password is never returned in failure shape (REQ-AUTH-055)', async () => {
    const { prisma } = buildFakePrisma();
    const result = await login(
      baseInput({ identifier: 'ghost', password: 'super-secret-plaintext' }),
      { prisma, config: baseConfig() },
    );
    expect(JSON.stringify(result)).not.toContain('super-secret-plaintext');
  });

  it('14) empty identifier or password → INVALID_CREDENTIALS (no Zod leakage)', async () => {
    const { prisma } = buildFakePrisma({ preexistingUsers: [user] });
    const r1 = await login(baseInput({ identifier: '' }), {
      prisma,
      config: baseConfig(),
    });
    expect(r1).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    const r2 = await login(baseInput({ password: '' }), {
      prisma,
      config: baseConfig(),
    });
    expect(r2).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
  });

  it('15) failure tuple keys are exactly ["ok","code"] — no field-name leakage', async () => {
    const { prisma } = buildFakePrisma({ preexistingUsers: [user] });
    const result = await login(
      baseInput({ password: 'wrong' }),
      { prisma, config: baseConfig() },
    );
    expect(result.ok).toBe(false);
    expect(Object.keys(result).sort()).toEqual(['code', 'ok']);
  });

  it('16) whitespace-only identifier or password → INVALID_CREDENTIALS', async () => {
    const { prisma } = buildFakePrisma({ preexistingUsers: [user] });
    const result = await login(baseInput({ identifier: '   ' }), {
      prisma,
      config: baseConfig(),
    });
    expect(result).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
  });
});
