/**
 * Specification tests for admin features — SPEC-AUTH-001 Slice D2.
 *
 * RED-first: 본 파일은 `admin.ts` 구현 이전에 작성된다.
 *
 * Coverage:
 *   - REQ-AUTH-020: status 변경 시 세션 + autologin 즉시 무효화
 *   - REQ-AUTH-021: soft delete + PII anonymize + 90일 retention
 *   - REQ-AUTH-034: group 기반 admin 권한 검증
 *   - AC-AUTH-020, AC-AUTH-053(actor 식별)
 *
 * 자기 행위 정책:
 *   - self DELETE  : 차단 (SELF_ACTION_DENIED)
 *   - self SUSPEND : 허용 (보안 인시던트 대응)
 *   - self DENIED  : 허용
 *   - self APPROVED: 차단 (의미 없음 + 4-eye 원칙)
 */

// `@rhymix-ts/db`는 모듈 로드 시 PrismaClient를 초기화한다.
// 단위 테스트는 fake prisma를 직접 주입하므로 초기화 없이 Prisma.sql만 제공한다.
import { vi } from 'vitest';
vi.mock('@rhymix-ts/db', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
}));

import type { PrismaClient } from '@rhymix-ts/db';
import { describe, expect, it } from 'vitest';

import {
  changeUserStatus,
  softDeleteUser,
  type AdminCtx,
} from './admin';

// ---------------------------------------------------------------------------
// In-memory Prisma fake
// ---------------------------------------------------------------------------

interface FakeUser {
  id: number;
  userId: string;
  emailAddress: string;
  nickName: string;
  userName: string | null;
  phoneNumber: string | null;
  passwordHash: string;
  isAdmin: boolean;
  status: 'APPROVED' | 'UNAUTHED' | 'SUSPENDED' | 'DENIED' | 'DELETED';
  deletedAt: Date | null;
  sessionsRevokedAt: Date | null;
  createdAt: Date;
}
interface FakeGroup {
  id: number;
  isAdmin: boolean;
}
interface FakeMembership {
  groupId: number;
  userId: number;
}
interface FakeAutoLogin {
  id: number;
  userId: number;
}
interface FakeSessionRevocation {
  id: number;
  userId: number;
  reason: string;
  revokedAt: Date;
}
interface FakeAuditLog {
  actorId: number | null;
  targetId: number | null;
  action: string;
  metadata: Record<string, unknown>;
}

interface FakeOpts {
  users?: FakeUser[];
  groups?: FakeGroup[];
  memberships?: FakeMembership[];
  autoLogins?: FakeAutoLogin[];
  failOnAuditCreate?: boolean;
}

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: 1,
    userId: 'alice',
    emailAddress: 'alice@example.com',
    nickName: 'Alice',
    userName: '앨리스',
    phoneNumber: '+821012345678',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$abcd$efgh',
    isAdmin: false,
    status: 'APPROVED',
    deletedAt: null,
    sessionsRevokedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildFakePrisma(opts: FakeOpts = {}) {
  const users: FakeUser[] = (opts.users ?? []).map((u) => ({ ...u }));
  const groups: FakeGroup[] = [...(opts.groups ?? [])];
  const memberships: FakeMembership[] = [...(opts.memberships ?? [])];
  const autoLogins: FakeAutoLogin[] = [...(opts.autoLogins ?? [])];
  const sessionRevocations: FakeSessionRevocation[] = [];
  const auditLogs: FakeAuditLog[] = [];
  let nextSrId = 1;
  let nextAlId = autoLogins.length + 1;

  function effectiveAdminIds(): Set<number> {
    const ids = new Set<number>();
    for (const u of users) {
      if (u.status !== 'APPROVED') continue;
      if (u.isAdmin) ids.add(u.id);
    }
    for (const m of memberships) {
      const g = groups.find((x) => x.id === m.groupId);
      const u = users.find((x) => x.id === m.userId);
      if (g?.isAdmin && u?.status === 'APPROVED') ids.add(m.userId);
    }
    return ids;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fake: any = {
    user: {
      findUnique: async (args: {
        where: { id: number };
        include?: { groups?: unknown };
      }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) return null;
        if (args.include?.groups) {
          const memberRows = memberships
            .filter((m) => m.userId === u.id)
            .map((m) => ({
              group: groups.find((g) => g.id === m.groupId) ?? null,
            }));
          return { ...u, groups: memberRows };
        }
        return u;
      },
      update: async (args: {
        where: { id: number };
        data: Partial<FakeUser>;
      }) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('user not found');
        Object.assign(u, args.data);
        return u;
      },
    },
    sessionRevocation: {
      create: async (args: {
        data: { userId: number; reason: string; revokedAt?: Date };
      }) => {
        const row: FakeSessionRevocation = {
          id: nextSrId++,
          userId: args.data.userId,
          reason: args.data.reason,
          revokedAt: args.data.revokedAt ?? new Date(),
        };
        sessionRevocations.push(row);
        return row;
      },
    },
    autoLogin: {
      deleteMany: async (args: { where: { userId: number } }) => {
        const before = autoLogins.length;
        for (let i = autoLogins.length - 1; i >= 0; i -= 1) {
          if (autoLogins[i]!.userId === args.where.userId) {
            autoLogins.splice(i, 1);
          }
        }
        return { count: before - autoLogins.length };
      },
      create: async (args: { data: { userId: number } }) => {
        const row: FakeAutoLogin = { id: nextAlId++, userId: args.data.userId };
        autoLogins.push(row);
        return row;
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
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      void values;
      if (sql.includes('pg_advisory_xact_lock')) {
        return [{ pg_advisory_xact_lock: '' }];
      }
      // 카운트 쿼리는 사용 가능하도록 admins count 반환.
      return [{ count: BigInt(effectiveAdminIds().size) }];
    },
    $transaction: async <T>(fn: (tx: typeof fake) => Promise<T>): Promise<T> => {
      const snapshot = {
        users: users.map((u) => ({ ...u })),
        autoLogins: autoLogins.map((a) => ({ ...a })),
        sessionRevocations: sessionRevocations.length,
        auditLogs: auditLogs.length,
      };
      try {
        return await fn(fake);
      } catch (err) {
        users.length = 0;
        users.push(...snapshot.users);
        autoLogins.length = 0;
        autoLogins.push(...snapshot.autoLogins);
        sessionRevocations.length = snapshot.sessionRevocations;
        auditLogs.length = snapshot.auditLogs;
        throw err;
      }
    },
  };

  return {
    prisma: fake as unknown as PrismaClient,
    state: {
      users,
      groups,
      memberships,
      autoLogins,
      sessionRevocations,
      auditLogs,
    },
    effectiveAdminIds,
  };
}

function ctx(prisma: PrismaClient): AdminCtx {
  return { prisma };
}

// ---------------------------------------------------------------------------
// Tests — changeUserStatus
// ---------------------------------------------------------------------------

describe('changeUserStatus', () => {
  it('1) SUSPENDED → User.status 갱신 + revokeAllSessions(STATUS_CHANGED) + AutoLogin 삭제 + AuditLog STATUS_CHANGED', async () => {
    const admin = makeUser({ id: 1, userId: 'admin', isAdmin: true });
    const target = makeUser({ id: 2, userId: 'bob', emailAddress: 'b@x.com', nickName: 'Bob' });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      autoLogins: [
        { id: 1, userId: 2 },
        { id: 2, userId: 2 },
        { id: 3, userId: 99 }, // 다른 유저는 삭제되지 않아야 함
      ],
    });

    const result = await changeUserStatus(
      { targetUserId: 2, newStatus: 'SUSPENDED', actorId: 1 },
      ctx(prisma),
    );

    expect(result).toMatchObject({
      ok: true,
      targetUserId: 2,
      previousStatus: 'APPROVED',
      newStatus: 'SUSPENDED',
    });
    expect(state.users.find((u) => u.id === 2)?.status).toBe('SUSPENDED');
    expect(state.sessionRevocations).toHaveLength(1);
    expect(state.sessionRevocations[0]).toMatchObject({
      userId: 2,
      reason: 'STATUS_CHANGED',
    });
    // user 2의 autologin은 삭제, user 99는 보존
    expect(state.autoLogins.filter((a) => a.userId === 2)).toHaveLength(0);
    expect(state.autoLogins.filter((a) => a.userId === 99)).toHaveLength(1);
    // AuditLog: SESSION_REVOKED + STATUS_CHANGED 두 건이 있어야 함 (revokeAllSessions가 자체 audit 작성)
    const statusChangedLog = state.auditLogs.find(
      (l) => l.action === 'STATUS_CHANGED',
    );
    expect(statusChangedLog).toBeDefined();
    expect(statusChangedLog).toMatchObject({
      actorId: 1,
      targetId: 2,
    });
    expect(statusChangedLog?.metadata).toMatchObject({
      previousStatus: 'APPROVED',
      newStatus: 'SUSPENDED',
    });
  });

  it('2) DENIED → 동일하게 세션/autologin 무효화 + STATUS_CHANGED 기록', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({ id: 2, userId: 'bob' });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      autoLogins: [{ id: 1, userId: 2 }],
    });
    const result = await changeUserStatus(
      { targetUserId: 2, newStatus: 'DENIED', actorId: 1 },
      ctx(prisma),
    );
    expect(result.ok).toBe(true);
    expect(state.sessionRevocations).toHaveLength(1);
    expect(state.autoLogins.filter((a) => a.userId === 2)).toHaveLength(0);
  });

  it('3) APPROVED (재활성화) → status 갱신만, revokeAllSessions / autologin 삭제 없음, AuditLog는 기록', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({ id: 2, userId: 'bob', status: 'SUSPENDED' });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      autoLogins: [{ id: 1, userId: 2 }],
    });
    const result = await changeUserStatus(
      { targetUserId: 2, newStatus: 'APPROVED', actorId: 1 },
      ctx(prisma),
    );
    expect(result.ok).toBe(true);
    expect(state.users.find((u) => u.id === 2)?.status).toBe('APPROVED');
    expect(state.sessionRevocations).toHaveLength(0); // 재활성화는 revoke하지 않음
    expect(state.autoLogins.filter((a) => a.userId === 2)).toHaveLength(1);
    expect(state.auditLogs.some((l) => l.action === 'STATUS_CHANGED')).toBe(true);
  });

  it('4) 비-admin actor → INSUFFICIENT_PRIVILEGES, 어떤 변경도 발생하지 않음', async () => {
    const actor = makeUser({ id: 1, isAdmin: false }); // 평범한 사용자
    const target = makeUser({ id: 2, userId: 'bob' });
    const { prisma, state } = buildFakePrisma({ users: [actor, target] });
    const result = await changeUserStatus(
      { targetUserId: 2, newStatus: 'SUSPENDED', actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'INSUFFICIENT_PRIVILEGES' });
    expect(state.users.find((u) => u.id === 2)?.status).toBe('APPROVED');
    expect(state.sessionRevocations).toHaveLength(0);
    expect(state.auditLogs).toHaveLength(0);
  });

  it('5) self + SUSPENDED → 허용 (보안 인시던트 대응)', async () => {
    const admin = makeUser({ id: 1, userId: 'admin', isAdmin: true });
    const { prisma, state } = buildFakePrisma({
      users: [admin],
      autoLogins: [{ id: 1, userId: 1 }],
    });
    const result = await changeUserStatus(
      { targetUserId: 1, newStatus: 'SUSPENDED', actorId: 1 },
      ctx(prisma),
    );
    expect(result.ok).toBe(true);
    expect(state.users[0]?.status).toBe('SUSPENDED');
    expect(state.sessionRevocations).toHaveLength(1);
  });

  it('6) self + APPROVED (status 변경 의미 없음) → SELF_ACTION_DENIED (4-eye 원칙)', async () => {
    // APPROVED actor 가 자기 자신을 (이미 APPROVED 인데) APPROVED 로 바꾸려는 의미 없는 호출.
    // self-action 정책상 SUSPENDED/DENIED 외에는 차단되어야 한다.
    const admin = makeUser({ id: 1, isAdmin: true, status: 'APPROVED' });
    const { prisma } = buildFakePrisma({ users: [admin] });
    const result = await changeUserStatus(
      { targetUserId: 1, newStatus: 'APPROVED', actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'SELF_ACTION_DENIED' });
  });

  it('7) target이 존재하지 않을 때 → TARGET_NOT_FOUND', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const { prisma } = buildFakePrisma({ users: [admin] });
    const result = await changeUserStatus(
      { targetUserId: 999, newStatus: 'SUSPENDED', actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'TARGET_NOT_FOUND' });
  });

  it('TX-A) Atomicity: changeUserStatus 의 AuditLog 실패 시 status/revoke/autologin 모두 롤백', async () => {
    // REQ-AUTH-020 atomicity gap fix: revokeAllSessions 가 admin.ts 의 main tx 안에서 실행되어야
    // 마지막 AuditLog 가 실패할 때 status 변경과 SessionRevocation row 모두 롤백된다.
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({ id: 2, userId: 'bob' });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      autoLogins: [{ id: 1, userId: 2 }],
      failOnAuditCreate: true,
    });

    await expect(
      changeUserStatus(
        { targetUserId: 2, newStatus: 'SUSPENDED', actorId: 1 },
        ctx(prisma),
      ),
    ).rejects.toThrow();

    // status 는 원래 APPROVED 로 롤백
    expect(state.users.find((u) => u.id === 2)?.status).toBe('APPROVED');
    // sessionRevocation 도 작성되지 않은 상태
    expect(state.sessionRevocations).toHaveLength(0);
    // autologin 도 보존
    expect(state.autoLogins.filter((a) => a.userId === 2)).toHaveLength(1);
    // sessionsRevokedAt 도 갱신되지 않음
    expect(state.users.find((u) => u.id === 2)?.sessionsRevokedAt).toBeNull();
    // auditLog 자체 없음
    expect(state.auditLogs).toHaveLength(0);
  });

  it('TX-B) revokeAllSessions 는 changeUserStatus 의 메인 트랜잭션 안에서 실행된다 (atomicity)', async () => {
    // SessionRevocation row 와 STATUS_CHANGED auditLog 는 같은 트랜잭션에서 commit 된 결과다.
    // 즉, status 가 SUSPENDED 인 사용자는 반드시 sessionRevocation row 를 동반해야 한다.
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({ id: 2, userId: 'bob' });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      autoLogins: [{ id: 1, userId: 2 }],
    });

    const result = await changeUserStatus(
      { targetUserId: 2, newStatus: 'SUSPENDED', actorId: 1 },
      ctx(prisma),
    );

    expect(result.ok).toBe(true);
    // 두 부수효과는 함께 적용되어야 한다.
    expect(state.users.find((u) => u.id === 2)?.status).toBe('SUSPENDED');
    expect(state.users.find((u) => u.id === 2)?.sessionsRevokedAt).not.toBeNull();
    expect(state.sessionRevocations).toHaveLength(1);
    // SESSION_REVOKED 와 STATUS_CHANGED auditLog 모두 기록.
    expect(state.auditLogs.some((l) => l.action === 'SESSION_REVOKED')).toBe(true);
    expect(state.auditLogs.some((l) => l.action === 'STATUS_CHANGED')).toBe(true);
  });

  it('group 경유 admin actor → 정상 동작 (REQ-AUTH-034)', async () => {
    const actor = makeUser({ id: 1, userId: 'group-admin', isAdmin: false });
    const target = makeUser({ id: 2, userId: 'bob' });
    const { prisma, state } = buildFakePrisma({
      users: [actor, target],
      groups: [{ id: 10, isAdmin: true }],
      memberships: [{ groupId: 10, userId: 1 }],
    });
    const result = await changeUserStatus(
      { targetUserId: 2, newStatus: 'SUSPENDED', actorId: 1 },
      ctx(prisma),
    );
    expect(result.ok).toBe(true);
    expect(state.users.find((u) => u.id === 2)?.status).toBe('SUSPENDED');
  });
});

// ---------------------------------------------------------------------------
// Tests — softDeleteUser
// ---------------------------------------------------------------------------

describe('softDeleteUser', () => {
  it('8) 5개 PII 필드를 결정적 prefix 패턴으로 anonymize, status=DELETED, deletedAt 설정', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({
      id: 42,
      userId: 'bob',
      emailAddress: 'bob@example.com',
      nickName: 'Bob',
      userName: '밥',
      phoneNumber: '+821055556666',
    });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
    });
    const before = Date.now();
    const result = await softDeleteUser(
      { targetUserId: 42, actorId: 1 },
      ctx(prisma),
    );
    const after = Date.now();

    expect(result).toMatchObject({ ok: true, targetUserId: 42 });
    if (!result.ok) return;
    expect(result.deletedAt.getTime()).toBeGreaterThanOrEqual(before - 10);
    expect(result.deletedAt.getTime()).toBeLessThanOrEqual(after + 10);

    const deleted = state.users.find((u) => u.id === 42)!;
    expect(deleted.status).toBe('DELETED');
    expect(deleted.deletedAt).toEqual(result.deletedAt);
    // 결정적 prefix 패턴 — id 기반.
    expect(deleted.userId).toBe('deleted_42');
    expect(deleted.emailAddress).toBe('deleted_42@anon.local');
    expect(deleted.nickName).toBe('deleted_42');
    expect(deleted.phoneNumber).toBeNull();
    expect(deleted.userName).toBeNull();
  });

  it('9) revokeAllSessions(ADMIN_FORCE_LOGOUT) 호출 + 해당 user의 AutoLogin 모두 삭제', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({ id: 42 });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      autoLogins: [
        { id: 1, userId: 42 },
        { id: 2, userId: 42 },
        { id: 3, userId: 99 },
      ],
    });
    await softDeleteUser({ targetUserId: 42, actorId: 1 }, ctx(prisma));

    expect(state.sessionRevocations).toHaveLength(1);
    expect(state.sessionRevocations[0]).toMatchObject({
      userId: 42,
      reason: 'ADMIN_FORCE_LOGOUT',
    });
    expect(state.autoLogins.filter((a) => a.userId === 42)).toHaveLength(0);
    expect(state.autoLogins.filter((a) => a.userId === 99)).toHaveLength(1);
  });

  it('10) AuditLog MEMBER_DELETED 기록, metadata.deletedAt 포함', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({ id: 42 });
    const { prisma, state } = buildFakePrisma({ users: [admin, target] });
    const result = await softDeleteUser(
      { targetUserId: 42, actorId: 1 },
      ctx(prisma),
    );
    expect(result.ok).toBe(true);
    const log = state.auditLogs.find((l) => l.action === 'MEMBER_DELETED');
    expect(log).toBeDefined();
    expect(log).toMatchObject({ actorId: 1, targetId: 42 });
    expect(log?.metadata).toHaveProperty('deletedAt');
  });

  it('11) self → SELF_ACTION_DENIED', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const { prisma, state } = buildFakePrisma({ users: [admin] });
    const result = await softDeleteUser(
      { targetUserId: 1, actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'SELF_ACTION_DENIED' });
    expect(state.users[0]?.status).toBe('APPROVED');
  });

  it('12) 이미 DELETED인 target → TARGET_ALREADY_DELETED', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({
      id: 42,
      status: 'DELETED',
      deletedAt: new Date(),
    });
    const { prisma } = buildFakePrisma({ users: [admin, target] });
    const result = await softDeleteUser(
      { targetUserId: 42, actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'TARGET_ALREADY_DELETED' });
  });

  it('13) anonymize 이후 원래 식별자(userId/email/nickName)는 다시 가입에 사용 가능 (unique 충돌 없음)', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({
      id: 42,
      userId: 'bob',
      emailAddress: 'bob@example.com',
      nickName: 'Bob',
    });
    const { prisma, state } = buildFakePrisma({ users: [admin, target] });
    await softDeleteUser({ targetUserId: 42, actorId: 1 }, ctx(prisma));

    // 동일한 식별자로 새 user 등록을 시뮬레이션 — fake에서 unique 제약은 없지만,
    // anonymize 결과가 고유 prefix(deleted_42)이므로 원래 값이 자유로워졌음을 확인.
    const reusable = !state.users.some(
      (u) =>
        u.userId === 'bob' ||
        u.emailAddress === 'bob@example.com' ||
        u.nickName === 'Bob',
    );
    expect(reusable).toBe(true);
  });

  it('14) anonymize는 passwordHash / id / createdAt에 영향을 주지 않는다 (out of GDPR delete scope)', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const originalCreatedAt = new Date('2024-06-01T00:00:00Z');
    const target = makeUser({
      id: 42,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$KEEP$ME',
      createdAt: originalCreatedAt,
    });
    const { prisma, state } = buildFakePrisma({ users: [admin, target] });
    await softDeleteUser({ targetUserId: 42, actorId: 1 }, ctx(prisma));
    const after = state.users.find((u) => u.id === 42)!;
    expect(after.passwordHash).toBe('$argon2id$v=19$m=65536,t=3,p=4$KEEP$ME');
    expect(after.id).toBe(42);
    expect(after.createdAt).toEqual(originalCreatedAt);
  });

  it('15) Transaction atomicity: AuditLog insert 실패 시 anonymize/status/revoke 모두 롤백', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const target = makeUser({
      id: 42,
      userId: 'bob',
      emailAddress: 'bob@example.com',
      nickName: 'Bob',
    });
    const { prisma, state } = buildFakePrisma({
      users: [admin, target],
      failOnAuditCreate: true,
    });
    await expect(
      softDeleteUser({ targetUserId: 42, actorId: 1 }, ctx(prisma)),
    ).rejects.toThrow();

    const after = state.users.find((u) => u.id === 42)!;
    // 모든 PII 필드와 status는 원본 그대로여야 함
    expect(after.status).toBe('APPROVED');
    expect(after.userId).toBe('bob');
    expect(after.emailAddress).toBe('bob@example.com');
    expect(after.nickName).toBe('Bob');
    expect(after.deletedAt).toBeNull();
    // 핵심 변경: revokeAllSessions 가 메인 tx 안에서 실행되므로 SessionRevocation row 도 롤백된다.
    expect(state.sessionRevocations).toHaveLength(0);
    expect(after.sessionsRevokedAt).toBeNull();
    expect(state.auditLogs).toHaveLength(0);
  });

  it('16) 비-admin actor의 softDelete → INSUFFICIENT_PRIVILEGES', async () => {
    const actor = makeUser({ id: 1, isAdmin: false });
    const target = makeUser({ id: 42 });
    const { prisma, state } = buildFakePrisma({ users: [actor, target] });
    const result = await softDeleteUser(
      { targetUserId: 42, actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'INSUFFICIENT_PRIVILEGES' });
    expect(state.users.find((u) => u.id === 42)?.status).toBe('APPROVED');
  });

  it('17) softDelete TARGET_NOT_FOUND', async () => {
    const admin = makeUser({ id: 1, isAdmin: true });
    const { prisma } = buildFakePrisma({ users: [admin] });
    const result = await softDeleteUser(
      { targetUserId: 999, actorId: 1 },
      ctx(prisma),
    );
    expect(result).toEqual({ ok: false, code: 'TARGET_NOT_FOUND' });
  });
});
