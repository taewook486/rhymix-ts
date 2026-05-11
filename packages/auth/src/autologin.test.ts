/**
 * AutoLogin specification tests — SPEC-AUTH-001 Slice E (E-3).
 *
 * REQ-AUTH-018, REQ-AUTH-019, REQ-AUTH-053, AC-AUTH-019, AC-AUTH-053:
 *   - createAutoLogin: securityKey 발급
 *   - verifyAutoLogin: key rotation (AC-AUTH-019)
 *   - verifyAutoLogin previousKey match: token theft 감지 (AC-AUTH-053)
 *   - revokeAutoLogin: 레코드 삭제
 */
import type { PrismaClient } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InMemoryMailDispatcher } from './mail';

// ---------------------------------------------------------------------------
// Fake
// ---------------------------------------------------------------------------

interface FakeAutoLogin {
  id: number;
  userId: number;
  securityKey: string;
  previousKey: string | null;
  ip: string;
  userAgent: string;
  deviceId: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

interface FakeUser {
  id: number;
  emailAddress: string;
  nickName: string;
  sessionsRevokedAt: Date | null;
}

interface FakeSessionRevocation {
  userId: number;
  revokedAt: Date;
  reason: string;
}

interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
}

function buildFakePrisma(opts: {
  autoLogins?: FakeAutoLogin[];
  users?: FakeUser[];
} = {}) {
  const autoLogins: FakeAutoLogin[] = [...(opts.autoLogins ?? [])];
  const users: FakeUser[] = [...(opts.users ?? [])];
  const revocations: FakeSessionRevocation[] = [];
  const auditLogs: FakeAuditLog[] = [];
  let nextId = autoLogins.length + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    autoLogin: {
      create: async (args: { data: Partial<FakeAutoLogin> }) => {
        const row: FakeAutoLogin = {
          id: nextId++,
          userId: args.data.userId!,
          securityKey: args.data.securityKey!,
          previousKey: args.data.previousKey ?? null,
          ip: args.data.ip ?? '',
          userAgent: args.data.userAgent ?? '',
          deviceId: args.data.deviceId ?? null,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          expiresAt: args.data.expiresAt ?? new Date(Date.now() + 30 * 86400_000),
        };
        autoLogins.push(row);
        return row;
      },
      findFirst: async (args: { where: { securityKey?: string; previousKey?: string } }) => {
        if (args.where.securityKey) {
          return autoLogins.find((a) => a.securityKey === args.where.securityKey) ?? null;
        }
        if (args.where.previousKey) {
          return autoLogins.find((a) => a.previousKey === args.where.previousKey) ?? null;
        }
        return null;
      },
      update: async (args: { where: { id: number }; data: Partial<FakeAutoLogin> }) => {
        const a = autoLogins.find((x) => x.id === args.where.id);
        if (!a) throw new Error('AutoLogin not found');
        Object.assign(a, args.data);
        return a;
      },
      delete: async (args: { where: { id: number } }) => {
        const idx = autoLogins.findIndex((a) => a.id === args.where.id);
        if (idx >= 0) autoLogins.splice(idx, 1);
        return {};
      },
    },
    user: {
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
    state: { autoLogins, users, revocations, auditLogs },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let createAutoLogin: typeof import('./autologin').createAutoLogin;
let verifyAutoLogin: typeof import('./autologin').verifyAutoLogin;
let revokeAutoLogin: typeof import('./autologin').revokeAutoLogin;

beforeEach(async () => {
  const mod = await import('./autologin');
  createAutoLogin = mod.createAutoLogin;
  verifyAutoLogin = mod.verifyAutoLogin;
  revokeAutoLogin = mod.revokeAutoLogin;
});

describe('createAutoLogin', () => {
  it('1) 새로운 AutoLogin row 생성, previousKey=null, 43자 토큰 반환', async () => {
    const { prisma, state } = buildFakePrisma();

    const result = await createAutoLogin(
      { userId: 1, ip: '1.2.3.4', userAgent: 'test-ua' },
      { prisma },
    );

    expect(result.securityKey).toBeDefined();
    expect(result.securityKey.length).toBe(43); // 32-byte base64url without padding
    expect(state.autoLogins).toHaveLength(1);
    expect(state.autoLogins[0]!.previousKey).toBeNull();
    expect(state.autoLogins[0]!.userId).toBe(1);
  });
});

describe('verifyAutoLogin', () => {
  it('2) 유효한 securityKey → 키 rotation (AC-AUTH-019)', async () => {
    const oldKey = 'original-security-key-value-12345678901';
    const { prisma, state } = buildFakePrisma({
      autoLogins: [
        {
          id: 1,
          userId: 42,
          securityKey: oldKey,
          previousKey: null,
          ip: '1.2.3.4',
          userAgent: 'old-ua',
          deviceId: null,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400_000),
        },
      ],
    });

    const result = await verifyAutoLogin(
      { securityKey: oldKey, ip: '5.6.7.8', userAgent: 'new-ua' },
      { prisma },
    );

    expect(result).toMatchObject({ ok: true, userId: 42 });
    // key rotation: 새 securityKey, old → previousKey
    expect(state.autoLogins[0]!.securityKey).not.toBe(oldKey);
    expect(state.autoLogins[0]!.previousKey).toBe(oldKey);
    // ip/userAgent 업데이트
    expect(state.autoLogins[0]!.ip).toBe('5.6.7.8');
    expect(state.autoLogins[0]!.userAgent).toBe('new-ua');
  });

  it('3) previousKey match (token theft) → 삭제 + revokeAllSessions + mail (AC-AUTH-053)', async () => {
    const stolenKey = 'stolen-key-value-abcdefghij123456789012';
    const mail = new InMemoryMailDispatcher();
    const { prisma, state } = buildFakePrisma({
      autoLogins: [
        {
          id: 1,
          userId: 42,
          securityKey: 'new-rotated-key-value-xxxxxxxxxxxxxxxxxx',
          previousKey: stolenKey,
          ip: '1.2.3.4',
          userAgent: 'ua',
          deviceId: null,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400_000),
        },
      ],
      users: [
        {
          id: 42,
          emailAddress: 'alice@example.com',
          nickName: 'Alice',
          sessionsRevokedAt: null,
        },
      ],
    });

    const result = await verifyAutoLogin(
      { securityKey: stolenKey, ip: '9.9.9.9', userAgent: 'thief-ua' },
      { prisma, mail },
    );

    expect(result).toEqual({ ok: false, code: 'TOKEN_THEFT' });
    // AutoLogin 삭제됨
    expect(state.autoLogins).toHaveLength(0);
    // 세션 무효화됨
    expect(state.users[0]!.sessionsRevokedAt).toBeInstanceOf(Date);
    // 보안 알림 메일 발송됨
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]!.template).toBe('security-alert');
  });

  it('4) 아예 없는 key → TOKEN_INVALID', async () => {
    const { prisma } = buildFakePrisma();

    const result = await verifyAutoLogin(
      { securityKey: 'nonexistent-key', ip: '1.2.3.4', userAgent: 'ua' },
      { prisma },
    );

    expect(result).toEqual({ ok: false, code: 'TOKEN_INVALID' });
  });
});

describe('revokeAutoLogin', () => {
  it('5) 레코드 삭제', async () => {
    const { prisma, state } = buildFakePrisma({
      autoLogins: [
        {
          id: 7,
          userId: 1,
          securityKey: 'key',
          previousKey: null,
          ip: '1.2.3.4',
          userAgent: 'ua',
          deviceId: null,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400_000),
        },
      ],
    });

    await revokeAutoLogin({ autoLoginId: 7 }, { prisma });

    expect(state.autoLogins).toHaveLength(0);
  });
});
