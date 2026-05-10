/**
 * Specification tests for the signup pipeline.
 *
 * SPEC-AUTH-001 Slice B coverage:
 *   - REQ-AUTH-005, REQ-AUTH-006 (validation, no leakage)
 *   - REQ-AUTH-010 (uniqueness, citext-style case-insensitive)
 *   - REQ-AUTH-011 (UNAUTHED + EmailAuthToken when enable_confirm)
 *   - REQ-AUTH-051 (uniform error — failure tuple has no field name)
 *   - REQ-AUTH-052 (DeniedIdentifier blocking)
 *   - AC-AUTH-010, AC-AUTH-011, AC-AUTH-052 (pure-logic level)
 *
 * Mocks: 손수 만든 in-memory Prisma fake — 테스트가 의존하는 4개 테이블만 흉내냄.
 */
import type { PrismaClient } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryMailDispatcher } from './mail';
import { type SignupConfig, signup } from './signup';

// ---------------------------------------------------------------------------
// In-memory Prisma fake
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  userId: string;
  emailAddress: string;
  passwordHash: string;
  nickName: string;
  phoneNumber: string | null;
  status: 'APPROVED' | 'UNAUTHED';
}
interface FakeDenied {
  kind: 'USER_ID' | 'NICK_NAME';
  pattern: string;
}
interface FakeEmailToken {
  id: number;
  userId: number;
  authKey: string;
  authType: 'SIGNUP' | 'PASSWORD_RESET' | 'EMAIL_CHANGE';
  expiresAt: Date;
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
  failOnUserCreate?: { code: string };
  failOnAuditCreate?: boolean;
}

function buildFakePrisma(opts: FakeOptions = {}) {
  const users: FakeUser[] = [...(opts.preexistingUsers ?? [])];
  const denied: FakeDenied[] = [...(opts.preexistingDenied ?? [])];
  const emailTokens: FakeEmailToken[] = [];
  const auditLogs: FakeAuditLog[] = [];
  let nextUserId = users.length + 1;
  let nextTokenId = 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findFirst: async (args: {
        where: {
          OR: Array<{ userId?: string; emailAddress?: string; phoneNumber?: string }>;
        };
      }) => {
        const conds = args.where.OR;
        return (
          users.find((u) =>
            conds.some(
              (c) =>
                (c.userId !== undefined &&
                  u.userId.toLowerCase() === c.userId.toLowerCase()) ||
                (c.emailAddress !== undefined &&
                  u.emailAddress.toLowerCase() === c.emailAddress.toLowerCase()) ||
                (c.phoneNumber !== undefined && u.phoneNumber === c.phoneNumber),
            ),
          ) ?? null
        );
      },
      create: async (args: { data: Omit<FakeUser, 'id'> }) => {
        if (opts.failOnUserCreate) {
          // Simulate Prisma P2002 unique-constraint violation shape.
          const err = new Error('Unique constraint failed') as Error & {
            code?: string;
          };
          err.code = opts.failOnUserCreate.code;
          throw err;
        }
        const user: FakeUser = { id: nextUserId++, ...args.data };
        users.push(user);
        return user;
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
    emailAuthToken: {
      create: async (args: { data: Omit<FakeEmailToken, 'id'> }) => {
        const token: FakeEmailToken = { id: nextTokenId++, ...args.data };
        emailTokens.push(token);
        return token;
      },
    },
    auditLog: {
      create: async (args: { data: FakeAuditLog }) => {
        if (opts.failOnAuditCreate) {
          throw new Error('audit-log write failed');
        }
        auditLogs.push(args.data);
        return args.data;
      },
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> => {
      // Naive transaction: snapshot lengths so we can roll back if fn throws.
      const snapshot = {
        users: users.length,
        emailTokens: emailTokens.length,
        auditLogs: auditLogs.length,
      };
      try {
        return await fn(fake);
      } catch (err) {
        users.length = snapshot.users;
        emailTokens.length = snapshot.emailTokens;
        auditLogs.length = snapshot.auditLogs;
        throw err;
      }
    },
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: { users, denied, emailTokens, auditLogs },
  };
}

// ---------------------------------------------------------------------------
// Common fixtures
// ---------------------------------------------------------------------------

const baseInput = () => ({
  userId: 'alice',
  email: 'alice@example.com',
  password: 'correct horse battery staple',
  nickName: 'Alice',
  ip: '127.0.0.1',
  userAgent: 'vitest',
  agreements: [],
  extraVars: {},
});

const baseConfig = (overrides: Partial<SignupConfig> = {}): SignupConfig => ({
  enableConfirm: false,
  signupTokenTtlHours: 24,
  passwordPolicy: 'normal',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('signup', () => {
  let mail: InMemoryMailDispatcher;
  beforeEach(() => {
    mail = new InMemoryMailDispatcher();
  });

  it('1) happy path with enable_confirm=false → APPROVED, no mail dispatched', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ enableConfirm: false }),
    });
    expect(result).toEqual({
      ok: true,
      userId: 1,
      status: 'APPROVED',
      requiresEmailVerification: false,
    });
    expect(mail.sent).toHaveLength(0);
    expect(state.emailTokens).toHaveLength(0);
    expect(state.users).toHaveLength(1);
  });

  it('2) happy path with enable_confirm=true → UNAUTHED + 1 mail dispatched', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ enableConfirm: true }),
    });
    expect(result).toEqual({
      ok: true,
      userId: 1,
      status: 'UNAUTHED',
      requiresEmailVerification: true,
    });
    expect(state.emailTokens).toHaveLength(1);
    expect(state.emailTokens[0]?.authType).toBe('SIGNUP');
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]?.template).toBe('signup-verify');
    expect(mail.sent[0]?.to).toBe('alice@example.com');
  });

  it('3) validation failure (bad email) → VALIDATION_FAILED, no DB writes', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), email: 'not-an-email' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(state.users).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
  });

  it('4) zod runs before policy: short password → VALIDATION_FAILED, not WEAK_PASSWORD', async () => {
    const { prisma } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), password: 'short' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('5) common-list password (length passes zod) → WEAK_PASSWORD', async () => {
    const { prisma } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), password: '1234567890' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'WEAK_PASSWORD' });
  });

  it('6) denied user_id → IDENTIFIER_DENIED', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingDenied: [{ kind: 'USER_ID', pattern: 'alice' }],
    });
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig(),
    });
    expect(result).toEqual({ ok: false, code: 'IDENTIFIER_DENIED' });
    expect(state.users).toHaveLength(0);
  });

  it('7) denied nick_name → IDENTIFIER_DENIED', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingDenied: [{ kind: 'NICK_NAME', pattern: 'alice' }],
    });
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig(),
    });
    expect(result).toEqual({ ok: false, code: 'IDENTIFIER_DENIED' });
    expect(state.users).toHaveLength(0);
  });

  it('8) case-insensitive duplicate user_id ("ALICE" vs existing "alice") → IDENTIFIER_TAKEN', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingUsers: [
        {
          id: 1,
          userId: 'alice',
          emailAddress: 'a@x.com',
          passwordHash: 'x',
          nickName: 'Other',
          phoneNumber: null,
          status: 'APPROVED',
        },
      ],
    });
    const result = await signup(
      { ...baseInput(), userId: 'ALICE', email: 'new@example.com', nickName: 'New' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'IDENTIFIER_TAKEN' });
    expect(state.users).toHaveLength(1); // only the pre-existing one
  });

  it('9) duplicate email → IDENTIFIER_TAKEN', async () => {
    const { prisma } = buildFakePrisma({
      preexistingUsers: [
        {
          id: 1,
          userId: 'someone',
          emailAddress: 'alice@example.com',
          passwordHash: 'x',
          nickName: 'Someone',
          phoneNumber: null,
          status: 'APPROVED',
        },
      ],
    });
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig(),
    });
    expect(result).toEqual({ ok: false, code: 'IDENTIFIER_TAKEN' });
  });

  it('10) Prisma P2002 race during user.create → IDENTIFIER_TAKEN', async () => {
    const { prisma, state } = buildFakePrisma({
      failOnUserCreate: { code: 'P2002' },
    });
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig(),
    });
    expect(result).toEqual({ ok: false, code: 'IDENTIFIER_TAKEN' });
    expect(state.users).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
  });

  it('11) password is hashed before persistence (argon2id PHC stored)', async () => {
    const { prisma, state } = buildFakePrisma();
    const plain = baseInput().password;
    await signup(baseInput(), { prisma, mail, config: baseConfig() });
    const stored = state.users[0]?.passwordHash ?? '';
    expect(stored).not.toBe(plain);
    expect(stored).toMatch(/^\$argon2id\$/);
  });

  it('12a) AuditLog written on successful signup', async () => {
    const { prisma, state } = buildFakePrisma();
    await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(state.auditLogs).toHaveLength(1);
    expect(state.auditLogs[0]?.action).toBe('SIGNUP');
    expect(state.auditLogs[0]?.targetId).toBe(1);
  });

  it('12b) AuditLog NOT written on IDENTIFIER_TAKEN failure', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingUsers: [
        {
          id: 1,
          userId: 'alice',
          emailAddress: 'alice@example.com',
          passwordHash: 'x',
          nickName: 'Alice',
          phoneNumber: null,
          status: 'APPROVED',
        },
      ],
    });
    await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(state.auditLogs).toHaveLength(0);
  });

  it('13) transaction rollback: when audit-log throws, user is not persisted', async () => {
    const { prisma, state } = buildFakePrisma({ failOnAuditCreate: true });
    await expect(
      signup(baseInput(), { prisma, mail, config: baseConfig() }),
    ).rejects.toThrow();
    expect(state.users).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
  });

  it('14) EmailAuthToken expiresAt ≈ now + ttlHours (1s tolerance)', async () => {
    const { prisma, state } = buildFakePrisma();
    const before = Date.now();
    await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ enableConfirm: true, signupTokenTtlHours: 24 }),
    });
    const after = Date.now();
    const expires = state.emailTokens[0]!.expiresAt.getTime();
    const expectedMin = before + 24 * 3600 * 1000;
    const expectedMax = after + 24 * 3600 * 1000;
    expect(expires).toBeGreaterThanOrEqual(expectedMin - 1000);
    expect(expires).toBeLessThanOrEqual(expectedMax + 1000);
  });

  it('15) mail dispatch failure (post-commit) does NOT roll back user → still ok:true', async () => {
    class FailingMail extends InMemoryMailDispatcher {
      override async dispatch(): Promise<void> {
        throw new Error('SMTP down');
      }
    }
    const failingMail = new FailingMail();
    const { prisma, state } = buildFakePrisma();
    const result = await signup(baseInput(), {
      prisma,
      mail: failingMail,
      config: baseConfig({ enableConfirm: true }),
    });
    expect(result).toMatchObject({ ok: true, status: 'UNAUTHED' });
    expect(state.users).toHaveLength(1);
    expect(state.emailTokens).toHaveLength(1);
    expect(state.auditLogs).toHaveLength(1);
  });

  it('16) REQ-AUTH-051: failure tuple keys are exactly ["ok","code"] — no field-name leakage', async () => {
    const { prisma } = buildFakePrisma({
      preexistingDenied: [{ kind: 'USER_ID', pattern: 'alice' }],
    });
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig(),
    });
    expect(result.ok).toBe(false);
    expect(Object.keys(result).sort()).toEqual(['code', 'ok']);
  });
});
