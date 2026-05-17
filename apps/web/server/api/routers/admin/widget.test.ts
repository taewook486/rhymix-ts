/**
 * Specification tests for admin.widget tRPC router — SPEC-ADMIN-001 Slice I (REQ-ADMIN-043).
 *
 * I-3-1: 등록된 위젯 + 유효 props → savePreset 성공, DB 에 레코드 생성
 * I-3-2: 미등록 widgetName → BAD_REQUEST
 * I-3-3: 유효 widgetName + 잘못된 props → BAD_REQUEST (propsSchema 실패)
 * I-3-4: listPresets() → 전체 목록, listPresets({ widgetName: 'hello' }) → 필터 적용
 * I-3-5: deletePreset → DB 삭제
 * I-3-6: 비관리자 → FORBIDDEN
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// NextAuth + authConfig mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

// DB mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// Widget registry mock — 'hello' 위젯만 등록됨
vi.mock('@rhymix-ts/core/widgets', () => ({
  getWidget: (name: string) => {
    if (name === 'hello') {
      return {
        name: 'hello',
        propsSchema: z.object({ name: z.string() }),
        Component: () => null,
      };
    }
    return undefined;
  },
}));

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockWidgetInstanceCreate = vi.fn();
const mockWidgetInstanceFindMany = vi.fn();
const mockWidgetInstanceDelete = vi.fn();
const mockAdminLogCreate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  widgetInstance: {
    create: (...args: unknown[]) => mockWidgetInstanceCreate(...args),
    findMany: (...args: unknown[]) => mockWidgetInstanceFindMany(...args),
    delete: (...args: unknown[]) => mockWidgetInstanceDelete(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
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

const nonAdminCtx = {
  session: { user: { id: 2, isAdmin: false, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin.widget tRPC router (Slice I — REQ-ADMIN-043)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화 기본값
  });

  it('I-3-1: 등록된 위젯 + 유효 props → savePreset 성공', async () => {
    const saved = {
      id: 1,
      widgetName: 'hello',
      label: 'preset1',
      props: { name: 'Alice' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockWidgetInstanceCreate.mockResolvedValueOnce(saved);

    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.savePreset({
      widgetName: 'hello',
      label: 'preset1',
      props: { name: 'Alice' },
    });

    expect(mockWidgetInstanceCreate).toHaveBeenCalledOnce();
    expect(mockWidgetInstanceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        widgetName: 'hello',
        label: 'preset1',
        props: { name: 'Alice' },
      }),
    });
    expect(result).toMatchObject({ id: 1, widgetName: 'hello', label: 'preset1' });
  });

  it('I-3-2: 미등록 widgetName → BAD_REQUEST', async () => {
    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    await expect(
      caller.savePreset({ widgetName: 'not-registered', label: 'test', props: {} }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('I-3-3: 유효 widgetName + 잘못된 props → BAD_REQUEST', async () => {
    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    // hello 위젯은 { name: string } 이 필요한데 숫자를 넣음
    await expect(
      caller.savePreset({ widgetName: 'hello', label: 'test', props: { name: 123 } }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('I-3-4a: listPresets() → 전체 목록 반환', async () => {
    const presets = [
      { id: 1, widgetName: 'hello', label: 'p1', props: {}, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, widgetName: 'other', label: 'p2', props: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockWidgetInstanceFindMany.mockResolvedValueOnce(presets);

    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.listPresets({});
    expect(result).toHaveLength(2);
    expect(mockWidgetInstanceFindMany).toHaveBeenCalledWith({ where: {}, orderBy: { createdAt: 'desc' } });
  });

  it('I-3-4b: listPresets({ widgetName: "hello" }) → 필터 적용', async () => {
    const presets = [
      { id: 1, widgetName: 'hello', label: 'p1', props: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockWidgetInstanceFindMany.mockResolvedValueOnce(presets);

    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.listPresets({ widgetName: 'hello' });
    expect(result).toHaveLength(1);
    expect(mockWidgetInstanceFindMany).toHaveBeenCalledWith({
      where: { widgetName: 'hello' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('I-3-5: deletePreset → DB 삭제', async () => {
    const deleted = { id: 1, widgetName: 'hello', label: 'p1', props: {}, createdAt: new Date(), updatedAt: new Date() };
    mockWidgetInstanceDelete.mockResolvedValueOnce(deleted);

    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.deletePreset({ id: 1 });
    expect(result).toMatchObject({ deleted: true });
    expect(mockWidgetInstanceDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('I-3-6: 비관리자 → FORBIDDEN', async () => {
    const { adminWidgetRouter } = await import('./widget');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminWidgetRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(nonAdminCtx as any);

    await expect(
      caller.listPresets({}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
