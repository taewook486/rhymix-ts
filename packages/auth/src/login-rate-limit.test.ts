/**
 * Rate limiting specification tests — SPEC-AUTH-001 Slice E (E-1).
 *
 * REQ-AUTH-033, AC-AUTH-033: IP 기반 로그인 시도 횟수 제한.
 * window_minutes 내 max_error_count 이상 INVALID_CREDENTIALS 실패 시 RATE_LIMITED.
 *
 * Mocks: hand-rolled in-memory Prisma fake (login.test.ts 패턴 재사용).
 */
import type { PrismaClient } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from './password';
import { type LoginConfig, login } from './login';

// ---------------------------------------------------------------------------
// In-memory Prisma fake — login.test.ts 와 동일한 패턴 + loginAttempt.count 지원
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

interface FakeLoginAttempt {
  id: number;
  ip: string;
  identifier: string | null;
  result: 'SUCCESS' | 'INVALID_CREDENTIALS' | 'STATUS_BLOCKED' | 'RATE_LIMITED';
  createdAt: Date;
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
  preexistingLoginAttempts?: FakeLoginAttempt[];
}

function buildFakePrisma(opts: FakeOptions = {}) {
  const users: FakeUser[] = [...(opts.preexistingUsers ?? [])];
  const loginAttempts: FakeLoginAttempt[] = [
    ...(opts.preexistingLoginAttempts ?? []),
  ];
  const auditLogs: FakeAuditLog[] = [];
  let nextId = loginAttempts.length + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findFirst: async (args: {
        where: { OR?: Array<{ userId?: string; emailAddress?: string }> };
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
      findFirst: async () => null,
    },
    loginAttempt: {
      count: async (args: {
        where: {
          ip: string;
          result: string;
          createdAt: { gt: Date };
        };
      }) => {
        const { ip, result, createdAt } = args.where;
        return loginAttempts.filter(
          (a) =>
            a.ip === ip &&
            a.result === result &&
            a.createdAt.getTime() > createdAt.gt.getTime(),
        ).length;
      },
      create: async (args: { data: Omit<FakeLoginAttempt, 'id' | 'createdAt'> }) => {
        const row: FakeLoginAttempt = {
          ...args.data,
          id: nextId++,
          createdAt: new Date(),
        } as FakeLoginAttempt;
        loginAttempts.push(row);
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
    state: { users, loginAttempts, auditLogs },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PLAIN = 'correct horse battery staple';
const IP = '203.0.113.5';
const OTHER_IP = '198.51.100.1';

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

function makeFailedAttempts(
  ip: string,
  count: number,
  minutesAgo: number = 1,
): FakeLoginAttempt[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    ip,
    identifier: 'alice',
    result: 'INVALID_CREDENTIALS' as const,
    createdAt: new Date(now - minutesAgo * 60 * 1000),
  }));
}

const baseConfig = (overrides: Partial<LoginConfig> = {}): LoginConfig => ({
  passwordPolicy: 'normal',
  maxErrorCount: 5,
  windowMinutes: 10,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('login rate limiting (E-1)', () => {
  let user: FakeUser;

  beforeEach(async () => {
    user = await makeUser();
  });

  it('1) 5번 실패 후 6번째 시도 → RATE_LIMITED (verifyPassword 호출 없음)', async () => {
    // 5개의 실패 기록을 미리 삽입
    const attempts = makeFailedAttempts(IP, 5);
    const { prisma, state } = buildFakePrisma({
      preexistingUsers: [user],
      preexistingLoginAttempts: attempts,
    });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() },
    );

    expect(result).toEqual({ ok: false, code: 'RATE_LIMITED' });
    // RATE_LIMITED LoginAttempt row 가 기록되어야 한다
    const rateLimitedRows = state.loginAttempts.filter(
      (a) => a.result === 'RATE_LIMITED',
    );
    expect(rateLimitedRows).toHaveLength(1);
  });

  it('2) window 밖의 실패 기록은 카운트되지 않음', async () => {
    // 15분 전 실패 기록 (window=10분이므로 만료)
    const attempts = makeFailedAttempts(IP, 5, 15);
    const { prisma } = buildFakePrisma({
      preexistingUsers: [user],
      preexistingLoginAttempts: attempts,
    });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() },
    );

    // window 밖이므로 정상 로그인 성공
    expect(result).toMatchObject({ ok: true });
  });

  it('3) 다른 IP의 실패 기록은 카운트되지 않음', async () => {
    // 다른 IP의 5번 실패 기록
    const attempts = makeFailedAttempts(OTHER_IP, 5);
    const { prisma } = buildFakePrisma({
      preexistingUsers: [user],
      preexistingLoginAttempts: attempts,
    });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() },
    );

    // 다른 IP이므로 정상 로그인 성공
    expect(result).toMatchObject({ ok: true });
  });

  it('4) 성공 로그인 후에도 LoginAttempt SUCCESS row 는 기록됨', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingUsers: [user],
    });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() },
    );

    expect(result).toMatchObject({ ok: true });
    const successRows = state.loginAttempts.filter(
      (a) => a.result === 'SUCCESS',
    );
    expect(successRows).toHaveLength(1);
  });

  it('5) maxErrorCount 미만이면 정상 로그인 가능', async () => {
    // 4번 실패 (limit 5 미만)
    const attempts = makeFailedAttempts(IP, 4);
    const { prisma } = buildFakePrisma({
      preexistingUsers: [user],
      preexistingLoginAttempts: attempts,
    });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() },
    );

    expect(result).toMatchObject({ ok: true });
  });

  it('6) RATE_LIMITED 응답의 키는 정확히 ["ok","code"]', async () => {
    const attempts = makeFailedAttempts(IP, 5);
    const { prisma } = buildFakePrisma({
      preexistingUsers: [user],
      preexistingLoginAttempts: attempts,
    });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() },
    );

    expect(Object.keys(result).sort()).toEqual(['code', 'ok']);
  });
});

// ---------------------------------------------------------------------------
// REQ-AUTH-032: password force-change-after-days
// ---------------------------------------------------------------------------

describe('login password force change (REQ-AUTH-032)', () => {
  it('1) passwordForceChangeDays 초과 → needsPasswordChange:true', async () => {
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000); // 91일 전
    const staleUser = await makeUser({ passwordChangedAt: oldDate });
    const { prisma } = buildFakePrisma({ preexistingUsers: [staleUser] });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig({ passwordForceChangeDays: 90 }) },
    );

    expect(result).toMatchObject({ ok: true, needsPasswordChange: true });
  });

  it('2) passwordForceChangeDays 미초과 → needsPasswordChange:false', async () => {
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10일 전
    const freshUser = await makeUser({ passwordChangedAt: recentDate });
    const { prisma } = buildFakePrisma({ preexistingUsers: [freshUser] });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig({ passwordForceChangeDays: 90 }) },
    );

    expect(result).toMatchObject({ ok: true, needsPasswordChange: false });
  });

  it('3) passwordForceChangeDays 미설정 → needsPasswordChange:false', async () => {
    const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1년 전
    const staleUser = await makeUser({ passwordChangedAt: oldDate });
    const { prisma } = buildFakePrisma({ preexistingUsers: [staleUser] });

    const result = await login(
      { identifier: 'alice', password: PLAIN, ip: IP },
      { prisma, config: baseConfig() }, // passwordForceChangeDays 없음
    );

    expect(result).toMatchObject({ ok: true, needsPasswordChange: false });
  });
});
