// @vitest-environment jsdom
/**
 * admin.group tRPC 라우터 테스트 — SPEC-MEMBER-ADMIN-001 Slice C.
 *
 * TDD RED phase: imageMark 저장/조회 + reorder 신규 프로시저 (단일 $transaction) 검증.
 * 기존 SPEC-ADMIN-002 스텁 테스트(group.test.ts)와 별도 파일로 분리 — 그 파일은
 * 다른 SPEC 소유이므로 건드리지 않는다(PRESERVE).
 *
 * @MX:SPEC: SPEC-MEMBER-ADMIN-001 REQ-MADM-009, REQ-MADM-010, REQ-MADM-011, REQ-MADM-012, REQ-MADM-013
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

const mockGroupFindMany = vi.fn();
const mockGroupFindUnique = vi.fn();
const mockGroupCreate = vi.fn();
const mockGroupUpdate = vi.fn();
const mockGroupUpdateMany = vi.fn();
const mockGroupCount = vi.fn();
const mockTransaction = vi.fn();
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  memberGroup: {
    findMany: (...args: unknown[]) => mockGroupFindMany(...args),
    findUnique: (...args: unknown[]) => mockGroupFindUnique(...args),
    create: (...args: unknown[]) => mockGroupCreate(...args),
    update: (...args: unknown[]) => mockGroupUpdate(...args),
    updateMany: (...args: unknown[]) => mockGroupUpdateMany(...args),
    count: (...args: unknown[]) => mockGroupCount(...args),
  },
  $transaction: (...args: unknown[]) => mockTransaction(...args),
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.group tRPC router — SPEC-MEMBER-ADMIN-001 Slice C', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGroupUpdateMany.mockResolvedValue({ count: 0 });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('REQ-MADM-009: create → imageMark 을 prisma.create data 에 전달한다', async () => {
    mockGroupCreate.mockResolvedValue({ id: 1, imageMark: '/uploads/mark.png' });

    const { adminGroupRouter } = await import('./group');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminGroupRouter)(adminCtx as never);

    await caller.create({ title: '그룹1', imageMark: '/uploads/mark.png' });

    expect(mockGroupCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageMark: '/uploads/mark.png' }),
      }),
    );
  });

  it('REQ-MADM-009: update → imageMark 을 prisma.update data 에 전달한다', async () => {
    mockGroupFindUnique.mockResolvedValue({ id: 1, isDefault: false, imageMark: null });
    mockGroupUpdate.mockResolvedValue({ id: 1, imageMark: '/uploads/new.png' });

    const { adminGroupRouter } = await import('./group');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminGroupRouter)(adminCtx as never);

    await caller.update({ id: 1, imageMark: '/uploads/new.png' });

    expect(mockGroupUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageMark: '/uploads/new.png' }),
      }),
    );
  });

  it('REQ-MADM-010: list → imageMark, listOrder 필드를 포함해 반환한다', async () => {
    mockGroupFindMany.mockResolvedValue([
      {
        id: 1,
        title: '그룹1',
        description: null,
        isDefault: false,
        isAdmin: false,
        imageMark: '/uploads/mark.png',
        listOrder: 0,
        _count: { members: 3 },
      },
    ]);

    const { adminGroupRouter } = await import('./group');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminGroupRouter)(adminCtx as never);

    const result = await caller.list();

    expect(result[0]).toMatchObject({ imageMark: '/uploads/mark.png', listOrder: 0 });
    expect(mockGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ imageMark: true, listOrder: true }),
      }),
    );
  });

  it('REQ-MADM-011/012: reorder → 다수 그룹의 listOrder 를 단일 $transaction 으로 원자적 갱신한다', async () => {
    mockTransaction.mockResolvedValue([{ id: 3 }, { id: 1 }, { id: 2 }]);

    const { adminGroupRouter } = await import('./group');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminGroupRouter)(adminCtx as never);

    const result = await caller.reorder({
      items: [
        { id: 3, listOrder: 0 },
        { id: 1, listOrder: 1 },
        { id: 2, listOrder: 2 },
      ],
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    // 단일 $transaction 호출에 3개의 update 프로미스 배열이 전달되어야 한다 (원자적 일괄 갱신).
    const txArg = mockTransaction.mock.calls[0]![0];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg).toHaveLength(3);
    expect(result).toEqual({ updated: 3 });
  });

  it('REQ-MADM-011: reorder → 빈 items 는 no-op 으로 처리한다', async () => {
    const { adminGroupRouter } = await import('./group');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminGroupRouter)(adminCtx as never);

    const result = await caller.reorder({ items: [] });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({ updated: 0 });
  });

  it('REQ-MADM-013: reorder → 트랜잭션 실패 시 에러를 전파한다(부분 반영 없음)', async () => {
    mockTransaction.mockRejectedValue(new Error('db unavailable'));

    const { adminGroupRouter } = await import('./group');
    const { createCallerFactory } = await import('../../trpc');
    const caller = createCallerFactory(adminGroupRouter)(adminCtx as never);

    await expect(
      caller.reorder({ items: [{ id: 1, listOrder: 0 }] }),
    ).rejects.toThrow('db unavailable');
  });
});
