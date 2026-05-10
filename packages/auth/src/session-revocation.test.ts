/**
 * Specification tests for session revocation — SPEC-AUTH-001 Slice D1.
 *
 * RED-first: these tests are authored before `session-revocation.ts` exists.
 *
 * Coverage:
 *   - REQ-AUTH-020 enforcement *primitive* (실제 트리거는 D2)
 *   - 다중 revocation 누적 / 최신값 비교
 *   - User.sessionsRevokedAt 비정규화 갱신
 *   - AuditLog SESSION_REVOKED 기록
 *   - 트랜잭션 원자성 (AuditLog 실패 시 SessionRevocation 롤백)
 *   - 인덱스 (userId, revokedAt) 존재 — 스키마 introspection 대신 fake 의 호출 패턴으로 검증
 */

import type { PrismaClient } from '@rhymix-ts/db';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  isSessionRevoked,
  revokeAllSessions,
  type RevocationReason,
} from './session-revocation';

// ---------------------------------------------------------------------------
// In-memory Prisma fake (SessionRevocation + User + AuditLog)
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  sessionsRevokedAt: Date | null;
}

interface FakeSessionRevocation {
  id: number;
  userId: number;
  revokedAt: Date;
  reason: string;
}

interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
  metadata: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

interface FakeOptions {
  preexistingUsers?: FakeUser[];
  preexistingRevocations?: FakeSessionRevocation[];
  failOnAuditCreate?: boolean;
}

interface FakeQueryLog {
  /** revocations 테이블에 대한 모든 SELECT 쿼리. */
  revocationQueries: Array<{
    where?: Record<string, unknown>;
    orderBy?: unknown;
    take?: number;
  }>;
}

function buildFakePrisma(opts: FakeOptions = {}) {
  const users: FakeUser[] = [...(opts.preexistingUsers ?? [])];
  const revocations: FakeSessionRevocation[] = [...(opts.preexistingRevocations ?? [])];
  const auditLogs: FakeAuditLog[] = [];
  const queryLog: FakeQueryLog = { revocationQueries: [] };
  let nextRevocationId = revocations.length + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findUnique: async (args: { where: { id: number } }) =>
        users.find((u) => u.id === args.where.id) ?? null,
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
    sessionRevocation: {
      create: async (args: {
        data: Omit<FakeSessionRevocation, 'id'>;
      }) => {
        const row: FakeSessionRevocation = {
          id: nextRevocationId++,
          ...args.data,
        };
        revocations.push(row);
        return row;
      },
      findFirst: async (args: {
        where?: Record<string, unknown>;
        orderBy?: unknown;
      }) => {
        queryLog.revocationQueries.push({ ...args, take: 1 });
        const where = args.where ?? {};
        const userIdFilter = where.userId as number | undefined;
        const matched = revocations
          .filter((r) =>
            userIdFilter === undefined ? true : r.userId === userIdFilter,
          )
          .slice()
          .sort((a, b) => b.revokedAt.getTime() - a.revokedAt.getTime());
        return matched[0] ?? null;
      },
      findMany: async (args: {
        where?: Record<string, unknown>;
        orderBy?: unknown;
        take?: number;
      }) => {
        queryLog.revocationQueries.push({ ...args });
        const where = args.where ?? {};
        const userIdFilter = where.userId as number | undefined;
        const sorted = revocations
          .filter((r) =>
            userIdFilter === undefined ? true : r.userId === userIdFilter,
          )
          .slice()
          .sort((a, b) => b.revokedAt.getTime() - a.revokedAt.getTime());
        return typeof args.take === 'number'
          ? sorted.slice(0, args.take)
          : sorted;
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
      // 단순 시뮬레이션: throw 시 스냅샷 시점으로 되돌린다.
      const snapshot = {
        users: users.map((u) => ({ ...u })),
        revocations: revocations.length,
        auditLogs: auditLogs.length,
      };
      try {
        return await fn(fake);
      } catch (err) {
        // rollback
        users.length = 0;
        users.push(...snapshot.users);
        revocations.length = snapshot.revocations;
        auditLogs.length = snapshot.auditLogs;
        throw err;
      }
    },
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: { users, revocations, auditLogs },
    queryLog,
  };
}

// ---------------------------------------------------------------------------
// Tests — revokeAllSessions
// ---------------------------------------------------------------------------

describe('revokeAllSessions', () => {
  let user: FakeUser;
  beforeEach(() => {
    user = { id: 1, sessionsRevokedAt: null };
  });

  it('1) writes a SessionRevocation row and returns { revokedAt }', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const before = Date.now();
    const result = await revokeAllSessions(1, 'STATUS_CHANGED', { prisma });
    const after = Date.now();

    expect(result).toHaveProperty('revokedAt');
    expect(result.revokedAt).toBeInstanceOf(Date);
    expect(result.revokedAt.getTime()).toBeGreaterThanOrEqual(before - 10);
    expect(result.revokedAt.getTime()).toBeLessThanOrEqual(after + 10);

    expect(state.revocations).toHaveLength(1);
    expect(state.revocations[0]).toMatchObject({
      userId: 1,
      reason: 'STATUS_CHANGED',
    });
  });

  it('2) updates User.sessionsRevokedAt to the same revokedAt', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const result = await revokeAllSessions(1, 'STATUS_CHANGED', { prisma });

    expect(state.users[0]?.sessionsRevokedAt).toEqual(result.revokedAt);
  });

  it('3) writes AuditLog with event=SESSION_REVOKED, actorId, targetId, metadata.reason', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    await revokeAllSessions(1, 'ADMIN_FORCE_LOGOUT', {
      prisma,
      actorId: 99,
    });

    expect(state.auditLogs).toHaveLength(1);
    expect(state.auditLogs[0]).toMatchObject({
      action: 'SESSION_REVOKED',
      actorId: 99,
      targetId: 1,
    });
    expect(state.auditLogs[0]?.metadata).toMatchObject({
      reason: 'ADMIN_FORCE_LOGOUT',
    });
  });

  it('3b) actorId defaults to null when not provided (USER_LOGOUT_ALL self-action)', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    await revokeAllSessions(1, 'USER_LOGOUT_ALL', { prisma });

    expect(state.auditLogs[0]?.actorId).toBeNull();
    expect(state.auditLogs[0]?.targetId).toBe(1);
  });

  it('4) multiple sequential calls produce multiple SessionRevocation rows (history preserved)', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    await revokeAllSessions(1, 'PASSWORD_CHANGED', { prisma });
    await new Promise((r) => setTimeout(r, 5));
    await revokeAllSessions(1, 'STATUS_CHANGED', { prisma });
    await new Promise((r) => setTimeout(r, 5));
    await revokeAllSessions(1, 'ADMIN_FORCE_LOGOUT', { prisma });

    expect(state.revocations).toHaveLength(3);
    const reasons = state.revocations.map((r) => r.reason);
    expect(reasons).toEqual([
      'PASSWORD_CHANGED',
      'STATUS_CHANGED',
      'ADMIN_FORCE_LOGOUT',
    ]);
  });

  it('5) after multiple revocations, User.sessionsRevokedAt reflects the LATEST revokedAt', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    await revokeAllSessions(1, 'PASSWORD_CHANGED', { prisma });
    await new Promise((r) => setTimeout(r, 5));
    const second = await revokeAllSessions(1, 'STATUS_CHANGED', { prisma });

    expect(state.users[0]?.sessionsRevokedAt).toEqual(second.revokedAt);
    expect(state.users[0]?.sessionsRevokedAt!.getTime()).toBeGreaterThan(
      state.revocations[0]!.revokedAt.getTime(),
    );
  });

  it('10) Transaction rollback: when AuditLog write fails, SessionRevocation row is NOT persisted', async () => {
    const { prisma, state } = buildFakePrisma({
      preexistingUsers: [user],
      failOnAuditCreate: true,
    });
    await expect(
      revokeAllSessions(1, 'STATUS_CHANGED', { prisma }),
    ).rejects.toThrow();

    expect(state.revocations).toHaveLength(0);
    expect(state.users[0]?.sessionsRevokedAt).toBeNull();
    expect(state.auditLogs).toHaveLength(0);
  });

  it('11) Idempotency: rapid duplicate calls produce 2 rows in monotonic timestamp order', async () => {
    const { prisma, state } = buildFakePrisma({ preexistingUsers: [user] });
    const r1 = await revokeAllSessions(1, 'STATUS_CHANGED', { prisma });
    await new Promise((r) => setTimeout(r, 2));
    const r2 = await revokeAllSessions(1, 'STATUS_CHANGED', { prisma });

    expect(state.revocations).toHaveLength(2);
    expect(r2.revokedAt.getTime()).toBeGreaterThanOrEqual(r1.revokedAt.getTime());
    expect(state.users[0]?.sessionsRevokedAt).toEqual(r2.revokedAt);
  });

  it('reason 컨벤션 4종을 모두 받아들인다', async () => {
    const reasons: RevocationReason[] = [
      'STATUS_CHANGED',
      'ADMIN_FORCE_LOGOUT',
      'PASSWORD_CHANGED',
      'USER_LOGOUT_ALL',
    ];
    for (const reason of reasons) {
      const u = { id: 100, sessionsRevokedAt: null };
      const { prisma, state } = buildFakePrisma({ preexistingUsers: [u] });
      const result = await revokeAllSessions(100, reason, { prisma });
      expect(result.revokedAt).toBeInstanceOf(Date);
      expect(state.revocations[0]?.reason).toBe(reason);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — isSessionRevoked
// ---------------------------------------------------------------------------

describe('isSessionRevoked', () => {
  it('6) tokenIat BEFORE revocation → returns true', async () => {
    const revokedAt = new Date('2026-05-10T12:00:00Z');
    const tokenIat = new Date('2026-05-10T11:00:00Z');
    const { prisma } = buildFakePrisma({
      preexistingUsers: [{ id: 1, sessionsRevokedAt: revokedAt }],
      preexistingRevocations: [
        { id: 1, userId: 1, revokedAt, reason: 'STATUS_CHANGED' },
      ],
    });
    const result = await isSessionRevoked(1, tokenIat, { prisma });
    expect(result).toBe(true);
  });

  it('7) tokenIat AFTER (or equal to) revocation → returns false', async () => {
    const revokedAt = new Date('2026-05-10T12:00:00Z');
    const tokenIatAfter = new Date('2026-05-10T13:00:00Z');
    const { prisma } = buildFakePrisma({
      preexistingUsers: [{ id: 1, sessionsRevokedAt: revokedAt }],
      preexistingRevocations: [
        { id: 1, userId: 1, revokedAt, reason: 'STATUS_CHANGED' },
      ],
    });
    const result = await isSessionRevoked(1, tokenIatAfter, { prisma });
    expect(result).toBe(false);
  });

  it('8) user with no revocations → returns false', async () => {
    const { prisma } = buildFakePrisma({
      preexistingUsers: [{ id: 1, sessionsRevokedAt: null }],
    });
    const result = await isSessionRevoked(1, new Date(), { prisma });
    expect(result).toBe(false);
  });

  it('8b) user not found → returns false (defensive: no leak, no crash)', async () => {
    const { prisma } = buildFakePrisma();
    const result = await isSessionRevoked(999, new Date(), { prisma });
    expect(result).toBe(false);
  });

  it('9) uses indexed fast-path lookup (single roundtrip, no JOIN)', async () => {
    // 비정규화 컬럼 채택의 핵심: User.sessionsRevokedAt 만 읽고 SessionRevocation 테이블에는
    // 접근하지 않는 fast-path. fake 의 queryLog 로 SessionRevocation 쿼리가 0회임을 확인.
    const revokedAt = new Date('2026-05-10T12:00:00Z');
    const tokenIat = new Date('2026-05-10T11:00:00Z');
    const { prisma, queryLog } = buildFakePrisma({
      preexistingUsers: [{ id: 1, sessionsRevokedAt: revokedAt }],
      preexistingRevocations: [
        { id: 1, userId: 1, revokedAt, reason: 'STATUS_CHANGED' },
      ],
    });
    const result = await isSessionRevoked(1, tokenIat, { prisma });
    expect(result).toBe(true);
    expect(queryLog.revocationQueries.length).toBe(0);
  });

  it('boundary: tokenIat exactly equals revokedAt → returns false (not strictly greater)', async () => {
    const revokedAt = new Date('2026-05-10T12:00:00.000Z');
    const tokenIat = new Date('2026-05-10T12:00:00.000Z');
    const { prisma } = buildFakePrisma({
      preexistingUsers: [{ id: 1, sessionsRevokedAt: revokedAt }],
      preexistingRevocations: [
        { id: 1, userId: 1, revokedAt, reason: 'STATUS_CHANGED' },
      ],
    });
    const result = await isSessionRevoked(1, tokenIat, { prisma });
    expect(result).toBe(false);
  });

  it('after multiple revocations, only the LATEST decides', async () => {
    const old = new Date('2026-05-10T10:00:00Z');
    const newer = new Date('2026-05-10T14:00:00Z');
    const tokenIatBetween = new Date('2026-05-10T12:00:00Z');
    const { prisma } = buildFakePrisma({
      preexistingUsers: [{ id: 1, sessionsRevokedAt: newer }],
      preexistingRevocations: [
        { id: 1, userId: 1, revokedAt: old, reason: 'PASSWORD_CHANGED' },
        { id: 2, userId: 1, revokedAt: newer, reason: 'STATUS_CHANGED' },
      ],
    });
    const result = await isSessionRevoked(1, tokenIatBetween, { prisma });
    expect(result).toBe(true);
  });
});
