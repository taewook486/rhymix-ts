/**
 * Specification tests for admin.user tRPC router — SPEC-ADMIN-001 Slice E-5.
 *
 * E-5-1: admin.user.list → { users, total } 반환.
 * E-5-2: admin.user.list q 검색 → 매칭 행만.
 * E-5-3: admin.user.list status 필터.
 * E-5-4: admin.user.update SUSPENDED → changeUserStatus 호출 증거.
 * E-5-5: admin.user.bulk suspend → 각 id changeUserStatus 호출.
 * E-5-6: admin.user.deniedList.add → DeniedIdentifier 생성.
 * E-5-7: admin.user.deniedList.remove → DeniedIdentifier 삭제.
 * E-5-8: 비관리자 → FORBIDDEN (protectedAdminProcedure).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// @rhymix-ts/auth mock — changeUserStatus / softDeleteUser
// validateNickname is kept as the REAL implementation (pure function, no I/O) —
// SPEC-MEMBER-ADMIN-001 REQ-MADM-023 shares it with packages/auth/src/signup.ts,
// so mocking it here would defeat the point of testing the shared policy.
// ---------------------------------------------------------------------------

const mockChangeUserStatus = vi.fn();
const mockSoftDeleteUser = vi.fn();

vi.mock('@rhymix-ts/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rhymix-ts/auth')>();
  return {
    validateNickname: actual.validateNickname,
    hashPassword: actual.hashPassword,
    changeUserStatus: (...args: unknown[]) => mockChangeUserStatus(...args),
    softDeleteUser: (...args: unknown[]) => mockSoftDeleteUser(...args),
  };
});

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockUserFindMany = vi.fn();
const mockUserCount = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockDeniedIdentifierCreate = vi.fn();
const mockDeniedIdentifierDelete = vi.fn();
const mockDeniedIdentifierFindMany = vi.fn();
const mockDeniedIdentifierFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockMemberGroupMemberFindMany = vi.fn();
const mockNicknameChangeLogCreate = vi.fn();
const mockNicknameChangeLogFindMany = vi.fn();
const mockNicknameChangeLogCount = vi.fn();
const mockUserTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
  fn({
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    nicknameChangeLog: {
      create: (...args: unknown[]) => mockNicknameChangeLogCreate(...args),
    },
  }),
);
const mockSiteSettingFindFirst = vi.fn();
const mockSiteSettingFindUnique = vi.fn();
const mockSiteFindFirst = vi.fn();

const mockPrisma = {
  site: {
    findFirst: (...args: unknown[]) => mockSiteFindFirst(...args),
  },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
    findUnique: (...args: unknown[]) => mockSiteSettingFindUnique(...args),
  },
  user: {
    findMany: (...args: unknown[]) => mockUserFindMany(...args),
    count: (...args: unknown[]) => mockUserCount(...args),
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
  },
  deniedIdentifier: {
    create: (...args: unknown[]) => mockDeniedIdentifierCreate(...args),
    delete: (...args: unknown[]) => mockDeniedIdentifierDelete(...args),
    findMany: (...args: unknown[]) => mockDeniedIdentifierFindMany(...args),
    findFirst: (...args: unknown[]) => mockDeniedIdentifierFindFirst(...args),
  },
  memberGroupMember: {
    findMany: (...args: unknown[]) => mockMemberGroupMemberFindMany(...args),
  },
  nicknameChangeLog: {
    create: (...args: unknown[]) => mockNicknameChangeLogCreate(...args),
    findMany: (...args: unknown[]) => mockNicknameChangeLogFindMany(...args),
    count: (...args: unknown[]) => mockNicknameChangeLogCount(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  $transaction: (...args: unknown[]) => mockUserTransaction(...args),
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.user tRPC router (Slice E-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
    mockSiteFindFirst.mockResolvedValue({ id: 1 });
    mockSiteSettingFindUnique.mockResolvedValue(null); // 기본값: 닉네임 설정 미저장(모두 기본값 적용)
    // actor 조회 기본값
    mockUserFindUnique.mockResolvedValue({ id: 1, isAdmin: true, status: 'APPROVED' });
    mockMemberGroupMemberFindMany.mockResolvedValue([]);
  });

  it('E-5-1: admin.user.list → { users, total } 반환 (US-7)', async () => {
    const users = [
      { id: 2, userId: 'user1', nickName: '닉네임1', emailAddress: 'u1@test.com',
        status: 'APPROVED', isAdmin: false, lastLoginAt: null, createdAt: new Date() },
    ];
    mockUserFindMany.mockResolvedValue(users);
    mockUserCount.mockResolvedValue(1);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list({ page: 1, pageSize: 50 });

    expect(result).toMatchObject({ total: 1 });
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({ userId: 'user1' });
  });

  it('E-5-2: admin.user.list q 검색 → userId/email/nickName 포함 행만 (US-7)', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.list({ q: 'searchterm', page: 1, pageSize: 50 });

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ userId: expect.objectContaining({ contains: 'searchterm' }) }),
          ]),
        }),
      }),
    );
  });

  it('E-5-3: admin.user.list status 필터 (US-7)', async () => {
    mockUserFindMany.mockResolvedValue([]);
    mockUserCount.mockResolvedValue(0);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.list({ status: 'SUSPENDED', page: 1, pageSize: 50 });

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SUSPENDED' }),
      }),
    );
  });

  it('E-5-4: admin.user.update SUSPENDED → changeUserStatus 위임 증거 (US-7)', async () => {
    mockChangeUserStatus.mockResolvedValue({
      ok: true, targetUserId: 2, previousStatus: 'APPROVED', newStatus: 'SUSPENDED',
    });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.update({ userId: 2, status: 'SUSPENDED' });

    expect(mockChangeUserStatus).toHaveBeenCalledOnce();
    expect(mockChangeUserStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserId: 2,
        newStatus: 'SUSPENDED',
        actorId: 1,
      }),
      expect.objectContaining({ prisma: mockPrisma }),
    );
    expect(result).toMatchObject({ ok: true, targetUserId: 2 });
  });

  it('E-5-5: admin.user.bulk suspend → 각 id changeUserStatus 호출 (US-7)', async () => {
    mockChangeUserStatus.mockResolvedValue({ ok: true });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.bulk({ ids: [2, 3, 4], action: 'suspend' });

    expect(mockChangeUserStatus).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ processed: 3 });
  });

  it('E-5-6: admin.user.deniedList.add → DeniedIdentifier 생성 (US-7)', async () => {
    const created = { id: 10, kind: 'USER_ID', pattern: 'baduser' };
    mockDeniedIdentifierCreate.mockResolvedValue(created);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deniedList.add({ type: 'USER_ID', pattern: 'baduser' });

    expect(mockDeniedIdentifierCreate).toHaveBeenCalledOnce();
    expect(mockDeniedIdentifierCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: 'USER_ID', pattern: 'baduser' }),
      }),
    );
    expect(result).toMatchObject({ kind: 'USER_ID' });
  });

  it('AC-B2: admin.user.deniedList.add → 중복 (kind, pattern) 등록 시 위반 필드+기존값을 명시한 BAD_REQUEST (REQ-MADM-006)', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockDeniedIdentifierCreate.mockRejectedValue(p2002);
    mockDeniedIdentifierFindFirst.mockResolvedValue({
      id: 5,
      kind: 'NICK_NAME',
      pattern: 'badword',
    });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.deniedList.add({ type: 'NICK_NAME', pattern: 'badword' }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining('NICK_NAME'),
    });

    // 위반 필드(kind, pattern) + 기존 등록값이 메시지에 노출되어야 한다.
    try {
      await caller.deniedList.add({ type: 'NICK_NAME', pattern: 'badword' });
    } catch (err) {
      const message = (err as { message: string }).message;
      expect(message).toContain('NICK_NAME');
      expect(message).toContain('badword');
    }
  });

  it('E-5-7: admin.user.deniedList.remove → DeniedIdentifier 삭제 (US-7)', async () => {
    const deleted = { id: 10, kind: 'USER_ID', pattern: 'baduser' };
    mockDeniedIdentifierDelete.mockResolvedValue(deleted);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.deniedList.remove({ id: 10 });

    expect(mockDeniedIdentifierDelete).toHaveBeenCalledOnce();
    expect(mockDeniedIdentifierDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } }),
    );
  });

  // ==========================================================================
  // 닉네임 변경 (REQ-ADMIN2-056, REQ-ADMIN2-057)
  // ==========================================================================

  it('NICKNAME-001: updateNickname → updates nickName and appends NicknameChangeLog row in a transaction', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '이전닉네임' });
    mockUserUpdate.mockResolvedValue({ id: 2, nickName: '새닉네임' });
    mockNicknameChangeLogCreate.mockResolvedValue({ id: 1 });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateNickname({ userId: 2, newNickName: '새닉네임' });

    expect(result).toEqual({ id: 2, nickName: '새닉네임' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nickName: '새닉네임' },
      select: { id: true, nickName: true },
    });
    expect(mockNicknameChangeLogCreate).toHaveBeenCalledWith({
      data: {
        userId: 2,
        oldNickName: '이전닉네임',
        newNickName: '새닉네임',
        changedByAdminId: 1,
      },
    });
  });

  it('NICKNAME-002: updateNickname → throws NOT_FOUND when target user does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateNickname({ userId: 999, newNickName: '새닉네임' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mockNicknameChangeLogCreate).not.toHaveBeenCalled();
  });

  it('NICKNAME-003: updateNickname → no-op (no log entry) when newNickName equals current nickName', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '동일닉네임' });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateNickname({ userId: 2, newNickName: '동일닉네임' });

    expect(result).toEqual({ id: 2, nickName: '동일닉네임' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockNicknameChangeLogCreate).not.toHaveBeenCalled();
  });

  it('NICKNAME-004: updateNickname → throws BAD_REQUEST on unique constraint violation (P2002)', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '이전닉네임' });
    mockUserUpdate.mockRejectedValue({ code: 'P2002' });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateNickname({ userId: 2, newNickName: '중복닉네임' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('NICKNAME-006 (REQ-MADM-021): updateNickname → FORBIDDEN when member.nickname.changeAllowed=false, no writes', async () => {
    mockSiteSettingFindUnique.mockImplementation(async ({ where }: any) => {
      if (where.siteId_key.key === 'member.nickname.changeAllowed') return { value: false };
      return null;
    });
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '이전닉네임' });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateNickname({ userId: 2, newNickName: '새닉네임' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockNicknameChangeLogCreate).not.toHaveBeenCalled();
  });

  it('NICKNAME-007 (REQ-MADM-022): updateNickname → member.nickname.saveChangeLog=false skips NicknameChangeLog row, still updates nickName', async () => {
    mockSiteSettingFindUnique.mockImplementation(async ({ where }: any) => {
      if (where.siteId_key.key === 'member.nickname.saveChangeLog') return { value: false };
      return null;
    });
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '이전닉네임' });
    mockUserUpdate.mockResolvedValue({ id: 2, nickName: '새닉네임' });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateNickname({ userId: 2, newNickName: '새닉네임' });

    expect(result).toEqual({ id: 2, nickName: '새닉네임' });
    expect(mockUserUpdate).toHaveBeenCalledOnce();
    expect(mockNicknameChangeLogCreate).not.toHaveBeenCalled();
  });

  it('NICKNAME-008 (REQ-MADM-023): updateNickname → rejects a special-char nickname when policy disallows (default)', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '이전닉네임' });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.updateNickname({ userId: 2, newNickName: '새닉네임!' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('NICKNAME-009 (REQ-MADM-023): updateNickname → accepts a special-char nickname when policy explicitly allows it', async () => {
    mockSiteSettingFindUnique.mockImplementation(async ({ where }: any) => {
      if (where.siteId_key.key === 'member.nickname.allowSpecialChars') return { value: true };
      if (where.siteId_key.key === 'member.nickname.allowedSpecialChars') return { value: '!' };
      return null;
    });
    mockUserFindUnique.mockResolvedValue({ id: 2, nickName: '이전닉네임' });
    mockUserUpdate.mockResolvedValue({ id: 2, nickName: '새닉네임!' });

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateNickname({ userId: 2, newNickName: '새닉네임!' });

    expect(result).toEqual({ id: 2, nickName: '새닉네임!' });
  });

  it('NICKNAME-005: nicknameLog.list → returns paginated { total, items, page, pageSize }', async () => {
    mockNicknameChangeLogCount.mockResolvedValue(1);
    mockNicknameChangeLogFindMany.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        oldNickName: '이전닉네임',
        newNickName: '새닉네임',
        changedByAdminId: 1,
        changedAt: new Date('2026-06-20T00:00:00Z'),
        user: { id: 2, userId: 'user1', nickName: '새닉네임' },
      },
    ]);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.nicknameLog.list({ page: 1, pageSize: 50 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ oldNickName: '이전닉네임', newNickName: '새닉네임' });
  });

  it('NICKNAME-006: nicknameLog.list → filters by userId when provided', async () => {
    mockNicknameChangeLogCount.mockResolvedValue(0);
    mockNicknameChangeLogFindMany.mockResolvedValue([]);

    const { adminUserRouter } = await import('./user');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminUserRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await caller.nicknameLog.list({ userId: 2, page: 1, pageSize: 50 });

    expect(mockNicknameChangeLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 2 } }),
    );
  });
});
