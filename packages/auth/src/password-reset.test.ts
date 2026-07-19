/**
 * Password reset specification tests — SPEC-AUTH-001 Slice E (E-2).
 *
 * REQ-AUTH-016, REQ-AUTH-017, AC-AUTH-017:
 *   - requestPasswordReset: 식별자 미노출 (REQ-AUTH-051), 토큰 발급 + 메일 발송
 *   - confirmPasswordReset: 토큰 소비, 비밀번호 변경, 세션 무효화, autologin 삭제
 */
import type { PrismaClient, Prisma } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryMailDispatcher } from './mail';
import { hashPassword } from './password';

// ---------------------------------------------------------------------------
// Fake
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  userId: string;
  emailAddress: string;
  passwordHash: string;
  passwordAlgo: string;
  passwordChangedAt: Date;
  nickName: string;
  status: string;
  isAdmin: boolean;
  sessionsRevokedAt: Date | null;
}

interface FakeEmailAuthToken {
  id: number;
  userId: number;
  authKey: string;
  authType: string;
  payload: unknown;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

interface FakeSessionRevocation {
  userId: number;
  revokedAt: Date;
  reason: string;
}

interface FakeAutoLogin {
  id: number;
  userId: number;
  securityKey: string;
}

interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
  metadata?: unknown;
}

function buildFakePrisma(opts: {
  users?: FakeUser[];
  tokens?: FakeEmailAuthToken[];
  autoLogins?: FakeAutoLogin[];
} = {}) {
  const users: FakeUser[] = [...(opts.users ?? [])];
  const tokens: FakeEmailAuthToken[] = [...(opts.tokens ?? [])];
  const autoLogins: FakeAutoLogin[] = [...(opts.autoLogins ?? [])];
  const revocations: FakeSessionRevocation[] = [];
  const auditLogs: FakeAuditLog[] = [];
  let nextTokenId = tokens.length + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findFirst: async (args: { where: { OR: Array<Record<string, string>> } }) => {
        const conds = args.where.OR;
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
      findUnique: async (args: { where: { id: number } }) => {
        return users.find((u) => u.id === args.where.id) ?? null;
      },
      update: async (args: { where: { id: number }; data: Partial<FakeUser> }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('User not found');
        Object.assign(u, args.data);
        return u;
      },
    },
    emailAuthToken: {
      findUnique: async (args: { where: { authKey: string } }) => {
        return tokens.find((t) => t.authKey === args.where.authKey) ?? null;
      },
      create: async (args: { data: Omit<FakeEmailAuthToken, 'id' | 'createdAt'> }) => {
        const row = { ...args.data, id: nextTokenId++, createdAt: new Date() };
        tokens.push(row as FakeEmailAuthToken);
        return row;
      },
      update: async (args: {
        where: { id: number };
        data: Partial<FakeEmailAuthToken>;
      }) => {
        const t = tokens.find((x) => x.id === args.where.id);
        if (!t) throw new Error('Token not found');
        Object.assign(t, args.data);
        return t;
      },
    },
    autoLogin: {
      deleteMany: async (args: { where: { userId: number } }) => {
        const before = autoLogins.length;
        const remaining = autoLogins.filter((a) => a.userId !== args.where.userId);
        autoLogins.length = 0;
        autoLogins.push(...remaining);
        return { count: before - remaining.length };
      },
    },
    sessionRevocation: {
      create: async (args: { data: FakeSessionRevocation }) => {
        revocations.push(args.data);
        return args.data;
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
    state: { users, tokens, autoLogins, revocations, auditLogs },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PLAIN_OLD = 'old-password-1234567890';
const PLAIN_NEW = 'new-strong-password-xyz';

async function makeUser(overrides: Partial<FakeUser> = {}): Promise<FakeUser> {
  return {
    id: 1,
    userId: 'alice',
    emailAddress: 'alice@example.com',
    passwordHash: await hashPassword(PLAIN_OLD),
    passwordAlgo: 'argon2id',
    passwordChangedAt: new Date(Date.now() - 86400_000),
    nickName: 'Alice',
    status: 'APPROVED',
    isAdmin: false,
    sessionsRevokedAt: null,
    ...overrides,
  };
}

function makeToken(
  userId: number,
  overrides: Partial<FakeEmailAuthToken> = {},
): FakeEmailAuthToken {
  return {
    id: 100,
    userId,
    authKey: 'valid-reset-token-abc123',
    authType: 'PASSWORD_RESET',
    payload: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600_000), // 1h from now
    consumedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — import will fail in RED phase
// ---------------------------------------------------------------------------

// Dynamic import to allow RED phase compilation errors
let requestPasswordReset: typeof import('./password-reset').requestPasswordReset;
let confirmPasswordReset: typeof import('./password-reset').confirmPasswordReset;

beforeEach(async () => {
  const mod = await import('./password-reset');
  requestPasswordReset = mod.requestPasswordReset;
  confirmPasswordReset = mod.confirmPasswordReset;
});

describe('requestPasswordReset', () => {
  it('1) 존재하는 사용자 → ok:true, 토큰 생성 + 메일 발송', async () => {
    const user = await makeUser();
    const mail = new InMemoryMailDispatcher();
    const { prisma, state } = buildFakePrisma({ users: [user] });

    const result = await requestPasswordReset(
      { identifier: 'alice@example.com' },
      { prisma, mail },
    );

    expect(result).toEqual({ ok: true });
    // EmailAuthToken 이 생성되어야 한다
    const resetTokens = state.tokens.filter((t) => t.authType === 'PASSWORD_RESET');
    expect(resetTokens).toHaveLength(1);
    expect(resetTokens[0]!.userId).toBe(1);
    // 메일이 발송되어야 한다
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.template).toBe('password-reset');
    expect(mail.sent[0]!.to).toBe('alice@example.com');
  });

  it('2) 존재하지 않는 식별자 → ok:true (REQ-AUTH-051: no disclosure)', async () => {
    const mail = new InMemoryMailDispatcher();
    const { prisma } = buildFakePrisma();

    const result = await requestPasswordReset(
      { identifier: 'ghost@example.com' },
      { prisma, mail },
    );

    expect(result).toEqual({ ok: true });
    // 메일이 발송되지 않아야 한다
    expect(mail.sent).toHaveLength(0);
  });

  it('3) DELETED 사용자 → ok:true (no disclosure)', async () => {
    const user = await makeUser({ status: 'DELETED' });
    const mail = new InMemoryMailDispatcher();
    const { prisma } = buildFakePrisma({ users: [user] });

    const result = await requestPasswordReset(
      { identifier: 'alice@example.com' },
      { prisma, mail },
    );

    expect(result).toEqual({ ok: true });
    expect(mail.sent).toHaveLength(0);
  });

  it('4) userId 로도 조회 가능', async () => {
    const user = await makeUser();
    const mail = new InMemoryMailDispatcher();
    const { prisma, state } = buildFakePrisma({ users: [user] });

    await requestPasswordReset(
      { identifier: 'alice' },
      { prisma, mail },
    );

    expect(state.tokens.filter((t) => t.authType === 'PASSWORD_RESET')).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
  });
});

describe('confirmPasswordReset', () => {
  it('5) 유효한 토큰 → 비밀번호 변경 + 세션 무효화 + autologin 삭제 + AuditLog', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    const { prisma, state } = buildFakePrisma({
      users: [user],
      tokens: [token],
      autoLogins: [{ id: 1, userId: user.id, securityKey: 'old-key' }],
    });

    const result = await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: PLAIN_NEW },
      { prisma },
    );

    expect(result).toEqual({ ok: true });
    // 비밀번호가 변경되었어야 한다
    expect(state.users[0]!.passwordHash).not.toBe(await hashPassword(PLAIN_OLD));
    expect(state.users[0]!.passwordAlgo).toBe('argon2id');
    expect(state.users[0]!.passwordChangedAt).toBeInstanceOf(Date);
    // 토큰이 소비되었어야 한다
    expect(state.tokens[0]!.consumedAt).toBeInstanceOf(Date);
    // autologin 이 삭제되었어야 한다
    expect(state.autoLogins).toHaveLength(0);
    // 세션이 무효화되었어야 한다 (sessionsRevokedAt 갱신)
    expect(state.users[0]!.sessionsRevokedAt).toBeInstanceOf(Date);
    // AuditLog 에 PASSWORD_RESET 기록
    const pwResetLogs = state.auditLogs.filter((a) => a.action === 'PASSWORD_RESET');
    expect(pwResetLogs).toHaveLength(1);
  });

  it('6) 만료된 토큰 → TOKEN_EXPIRED', async () => {
    const user = await makeUser();
    const token = makeToken(user.id, {
      expiresAt: new Date(Date.now() - 1000), // 만료됨
    });
    const { prisma } = buildFakePrisma({ users: [user], tokens: [token] });

    const result = await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: PLAIN_NEW },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'TOKEN_EXPIRED' });
  });

  it('7) 이미 소비된 토큰 → TOKEN_INVALID', async () => {
    const user = await makeUser();
    const token = makeToken(user.id, {
      consumedAt: new Date(), // 이미 소비됨
    });
    const { prisma } = buildFakePrisma({ users: [user], tokens: [token] });

    const result = await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: PLAIN_NEW },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'TOKEN_INVALID' });
  });

  it('8) 약한 비밀번호 → WEAK_PASSWORD', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    const { prisma } = buildFakePrisma({ users: [user], tokens: [token] });

    const result = await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: 'short' },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'WEAK_PASSWORD' });
  });

  it('8b) REQ-MADM-025: passwordPolicy=strong → digit-less new password rejected as WEAK_PASSWORD', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    const { prisma } = buildFakePrisma({ users: [user], tokens: [token] });

    const result = await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: 'nodigitshere' },
      { prisma, config: { passwordPolicy: 'strong' } },
    );

    expect(result).toEqual({ ok: false, code: 'WEAK_PASSWORD' });
  });

  it('8c) REQ-MADM-025: passwordPolicy=strong → new password with a digit is accepted', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    const { prisma } = buildFakePrisma({ users: [user], tokens: [token] });

    const result = await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: 'hasadigit9' },
      { prisma, config: { passwordPolicy: 'strong' } },
    );

    expect(result).toEqual({ ok: true });
  });

  it('8d) REQ-MADM-026: argon2TimeCost override is reflected in the reset password hash', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    const { prisma, state } = buildFakePrisma({ users: [user], tokens: [token] });

    await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: PLAIN_NEW },
      { prisma, config: { argon2TimeCost: 6 } },
    );

    expect(state.users[0]!.passwordHash).toMatch(/,t=6,/);
  });

  it('9) 존재하지 않는 토큰 → TOKEN_INVALID', async () => {
    const { prisma } = buildFakePrisma();

    const result = await confirmPasswordReset(
      { token: 'nonexistent-token', newPassword: PLAIN_NEW },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'TOKEN_INVALID' });
  });

  it('10) AC-AUTH-017: autologin 이 비밀번호 재설정 후 삭제됨', async () => {
    const user = await makeUser();
    const token = makeToken(user.id);
    const { prisma, state } = buildFakePrisma({
      users: [user],
      tokens: [token],
      autoLogins: [
        { id: 1, userId: user.id, securityKey: 'key-1' },
        { id: 2, userId: user.id, securityKey: 'key-2' },
      ],
    });

    await confirmPasswordReset(
      { token: 'valid-reset-token-abc123', newPassword: PLAIN_NEW },
      { prisma },
    );

    expect(state.autoLogins).toHaveLength(0);
  });
});
