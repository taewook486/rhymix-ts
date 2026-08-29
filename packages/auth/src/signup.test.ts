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
import { type SignupConfig, isEmailHostAllowed, signup } from './signup';

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

interface FakeEmailHost {
  siteId?: number | null;
  host: string;
  policy: 'ALLOW' | 'DENY';
}

interface FakeOptions {
  preexistingUsers?: FakeUser[];
  preexistingDenied?: FakeDenied[];
  preexistingEmailHosts?: FakeEmailHost[];
  failOnUserCreate?: { code: string };
  failOnAuditCreate?: boolean;
}

function buildFakePrisma(opts: FakeOptions = {}) {
  const users: FakeUser[] = [...(opts.preexistingUsers ?? [])];
  const denied: FakeDenied[] = [...(opts.preexistingDenied ?? [])];
  const emailHosts: FakeEmailHost[] = [...(opts.preexistingEmailHosts ?? [])];
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
    managedEmailHost: {
      // SPEC-MEMBER-ADMIN-001 REQ-MADM-032~035: signup 이메일 호스트 정책 조회.
      findMany: async (args?: { where?: { siteId?: number | null } }) => {
        const wantSiteId = args?.where?.siteId ?? null;
        return emailHosts.filter((h) => (h.siteId ?? null) === wantSiteId);
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
    state: { users, denied, emailHosts, emailTokens, auditLogs },
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

  // -------------------------------------------------------------------------
  // SPEC-MEMBER-ADMIN-001 Slice D — REQ-MADM-017, REQ-MADM-023, REQ-MADM-025, REQ-MADM-026
  // -------------------------------------------------------------------------

  it('17) REQ-MADM-017: accessMode=DENY → SIGNUP_CLOSED, no DB writes', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ accessMode: 'DENY' }),
    });
    expect(result).toEqual({ ok: false, code: 'SIGNUP_CLOSED' });
    expect(state.users).toHaveLength(0);
  });

  it('18) REQ-MADM-017: accessMode=SIGNUP_KEY + missing key → SIGNUP_CLOSED', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ accessMode: 'SIGNUP_KEY', signupKeyValue: 'correct-key' }),
    });
    expect(result).toEqual({ ok: false, code: 'SIGNUP_CLOSED' });
    expect(state.users).toHaveLength(0);
  });

  it('19) REQ-MADM-017: accessMode=SIGNUP_KEY + wrong key → SIGNUP_CLOSED', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), signupKey: 'wrong-key' },
      {
        prisma,
        mail,
        config: baseConfig({ accessMode: 'SIGNUP_KEY', signupKeyValue: 'correct-key' }),
      },
    );
    expect(result).toEqual({ ok: false, code: 'SIGNUP_CLOSED' });
    expect(state.users).toHaveLength(0);
  });

  it('20) REQ-MADM-017: accessMode=SIGNUP_KEY + correct key → ok:true', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), signupKey: 'correct-key' },
      {
        prisma,
        mail,
        config: baseConfig({ accessMode: 'SIGNUP_KEY', signupKeyValue: 'correct-key' }),
      },
    );
    expect(result.ok).toBe(true);
    expect(state.users).toHaveLength(1);
  });

  it('21) REQ-MADM-023: special char rejected by default (nicknamePolicy absent → no special chars)', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), nickName: 'Alice!' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(state.users).toHaveLength(0);
  });

  it('22) REQ-MADM-023: special char accepted when nicknamePolicy allows it explicitly', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), nickName: 'Alice-1' },
      {
        prisma,
        mail,
        config: baseConfig({
          nicknamePolicy: { allowSpecialChars: true, allowedSpecialChars: '-', allowSpacing: false },
        }),
      },
    );
    expect(result.ok).toBe(true);
    expect(state.users).toHaveLength(1);
  });

  it('23) REQ-MADM-023: spacing rejected by default', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), nickName: 'Al ice' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(state.users).toHaveLength(0);
  });

  it('24) REQ-MADM-023: spacing accepted when nicknamePolicy.allowSpacing=true', async () => {
    const { prisma } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), nickName: 'Al ice' },
      {
        prisma,
        mail,
        config: baseConfig({
          nicknamePolicy: { allowSpecialChars: false, allowedSpecialChars: '', allowSpacing: true },
        }),
      },
    );
    expect(result.ok).toBe(true);
  });

  it('25) REQ-MADM-025: passwordPolicy=strong rejects a digit-less password', async () => {
    const { prisma } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), password: 'correct horse battery staple' },
      { prisma, mail, config: baseConfig({ passwordPolicy: 'strong' }) },
    );
    expect(result).toEqual({ ok: false, code: 'WEAK_PASSWORD' });
  });

  it('26) REQ-MADM-025: passwordPolicy=strong accepts a password with a digit', async () => {
    const { prisma } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), password: 'correct horse battery staple9' },
      { prisma, mail, config: baseConfig({ passwordPolicy: 'strong' }) },
    );
    expect(result.ok).toBe(true);
  });

  it('27) REQ-MADM-025: passwordPolicy=very_strong rejects a password lacking a special char', async () => {
    const { prisma } = buildFakePrisma();
    // NOTE: no spaces — a space itself counts as a "special char" for this
    // policy, so a diceware-style passphrase would defeat this negative case.
    const result = await signup(
      { ...baseInput(), password: 'correcthorsebatterystaple9' },
      { prisma, mail, config: baseConfig({ passwordPolicy: 'very_strong' }) },
    );
    expect(result).toEqual({ ok: false, code: 'WEAK_PASSWORD' });
  });

  it('28) REQ-MADM-025: passwordPolicy=very_strong accepts a password with digit + special char', async () => {
    const { prisma } = buildFakePrisma();
    const result = await signup(
      { ...baseInput(), password: 'correct horse battery staple9!' },
      { prisma, mail, config: baseConfig({ passwordPolicy: 'very_strong' }) },
    );
    expect(result.ok).toBe(true);
  });

  it('29) REQ-MADM-026: argon2TimeCost override is reflected in the stored PHC hash t= param', async () => {
    const { prisma, state } = buildFakePrisma();
    await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ argon2TimeCost: 5 }),
    });
    const stored = state.users[0]?.passwordHash ?? '';
    // PHC format: $argon2id$v=19$m=65536,t=5,p=4$<salt>$<hash>
    expect(stored).toMatch(/,t=5,/);
  });

  it('30) REQ-MADM-026: argon2TimeCost absent falls back to the ANCHOR default (t=3)', async () => {
    const { prisma, state } = buildFakePrisma();
    await signup(baseInput(), { prisma, mail, config: baseConfig() });
    const stored = state.users[0]?.passwordHash ?? '';
    expect(stored).toMatch(/,t=3,/);
  });

  it('31) REQ-MADM-026: argon2TimeCost outside the safe range (2~10) is clamped, not passed through raw', async () => {
    const { prisma, state } = buildFakePrisma();
    await signup(baseInput(), {
      prisma,
      mail,
      config: baseConfig({ argon2TimeCost: 100 }),
    });
    const stored = state.users[0]?.passwordHash ?? '';
    expect(stored).toMatch(/,t=10,/); // clamped to the safe-range upper bound
  });
});

// ---------------------------------------------------------------------------
// SPEC-MEMBER-ADMIN-001 Group E — ManagedEmailHost signup policy
//   REQ-MADM-032 (whitelist mode), REQ-MADM-033 (blacklist mode),
//   REQ-MADM-034 (unrestricted), REQ-MADM-035 (clear error, atomic reject),
//   CONFLICT: same host under ALLOW+DENY → ALLOW wins.
// ---------------------------------------------------------------------------

describe('isEmailHostAllowed (pure policy evaluation)', () => {
  it('REQ-034: zero ALLOW + zero DENY → unrestricted (any domain permitted)', () => {
    expect(isEmailHostAllowed('user@anything.com', [])).toBe(true);
  });

  it('REQ-032: ≥1 ALLOW host → whitelist mode, domain in ALLOW passes', () => {
    const hosts = [{ host: 'gmail.com', policy: 'ALLOW' as const }];
    expect(isEmailHostAllowed('user@gmail.com', hosts)).toBe(true);
  });

  it('REQ-032: ≥1 ALLOW host → whitelist mode, domain NOT in ALLOW rejected', () => {
    const hosts = [{ host: 'gmail.com', policy: 'ALLOW' as const }];
    expect(isEmailHostAllowed('user@yahoo.com', hosts)).toBe(false);
  });

  it('REQ-032: whitelist match is case-insensitive (domain + host)', () => {
    const hosts = [{ host: 'Gmail.COM', policy: 'ALLOW' as const }];
    expect(isEmailHostAllowed('User@GMAIL.com', hosts)).toBe(true);
  });

  it('REQ-033: zero ALLOW + ≥1 DENY → blacklist mode, DENY domain rejected', () => {
    const hosts = [{ host: 'spam.com', policy: 'DENY' as const }];
    expect(isEmailHostAllowed('user@spam.com', hosts)).toBe(false);
  });

  it('REQ-033: zero ALLOW + ≥1 DENY → other domains still pass', () => {
    const hosts = [{ host: 'spam.com', policy: 'DENY' as const }];
    expect(isEmailHostAllowed('user@gmail.com', hosts)).toBe(true);
  });

  it('CONFLICT: same host under ALLOW and DENY → ALLOW wins (permitted)', () => {
    const hosts = [
      { host: 'gmail.com', policy: 'ALLOW' as const },
      { host: 'gmail.com', policy: 'DENY' as const },
    ];
    expect(isEmailHostAllowed('user@gmail.com', hosts)).toBe(true);
  });

  it('CONFLICT: ALLOW-priority host wins even when other DENY hosts exist', () => {
    const hosts = [
      { host: 'gmail.com', policy: 'ALLOW' as const },
      { host: 'gmail.com', policy: 'DENY' as const },
      { host: 'spam.com', policy: 'DENY' as const },
    ];
    // gmail is explicitly ALLOW → passes; but whitelist mode is active (≥1 ALLOW)
    expect(isEmailHostAllowed('user@gmail.com', hosts)).toBe(true);
    // spam is not in ALLOW list → whitelist mode rejects it
    expect(isEmailHostAllowed('user@spam.com', hosts)).toBe(false);
  });
});

describe('signup email-host policy branch', () => {
  let mail: InMemoryMailDispatcher;
  beforeEach(() => {
    mail = new InMemoryMailDispatcher();
  });

  it('REQ-034: no managed hosts → signup proceeds unrestricted', async () => {
    const { prisma, state } = buildFakePrisma();
    const result = await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(result).toMatchObject({ ok: true });
    expect(state.users).toHaveLength(1);
  });

  it('REQ-032/035: whitelist mode rejects non-listed domain with EMAIL_HOST_DENIED, no user row', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingEmailHosts: [{ host: 'company.com', policy: 'ALLOW' }],
    });
    const result = await signup(
      { ...baseInput(), email: 'alice@gmail.com' },
      { prisma, mail, config: baseConfig() },
    );
    expect(result).toEqual({ ok: false, code: 'EMAIL_HOST_DENIED' });
    expect(state.users).toHaveLength(0); // atomic: no partial user row
    expect(state.auditLogs).toHaveLength(0);
  });

  it('REQ-032: whitelist mode admits a listed domain', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingEmailHosts: [{ host: 'example.com', policy: 'ALLOW' }],
    });
    const result = await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(result).toMatchObject({ ok: true });
    expect(state.users).toHaveLength(1);
  });

  it('REQ-033/035: blacklist mode rejects a DENY domain with EMAIL_HOST_DENIED, no user row', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingEmailHosts: [{ host: 'example.com', policy: 'DENY' }],
    });
    const result = await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(result).toEqual({ ok: false, code: 'EMAIL_HOST_DENIED' });
    expect(state.users).toHaveLength(0);
  });

  it('REQ-033: blacklist mode admits a non-DENY domain', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingEmailHosts: [{ host: 'spam.com', policy: 'DENY' }],
    });
    const result = await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(result).toMatchObject({ ok: true });
    expect(state.users).toHaveLength(1);
  });

  it('CONFLICT: host under both ALLOW+DENY → signup for that host permitted', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingEmailHosts: [
        { host: 'example.com', policy: 'ALLOW' },
        { host: 'example.com', policy: 'DENY' },
      ],
    });
    const result = await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(result).toMatchObject({ ok: true });
    expect(state.users).toHaveLength(1);
  });

  it('siteId scoping: hosts on another site do not restrict the default site', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingEmailHosts: [{ siteId: 99, host: 'company.com', policy: 'ALLOW' }],
    });
    // config.emailHostSiteId defaults to null → site-99 ALLOW list is not applied
    const result = await signup(baseInput(), { prisma, mail, config: baseConfig() });
    expect(result).toMatchObject({ ok: true });
    expect(state.users).toHaveLength(1);
  });
});
