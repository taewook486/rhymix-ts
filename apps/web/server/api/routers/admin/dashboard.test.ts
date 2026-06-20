/**
 * Specification tests for admin.dashboard tRPC router — SPEC-ADMIN-002 Slice 1A + Slice 3E.
 *
 * DASHBOARD-WIDGET-PREFS-001: getWidgetPrefs → returns default prefs (all true) when dashboardWidgetPrefs is null.
 * DASHBOARD-WIDGET-PREFS-002: getWidgetPrefs → returns default prefs (all true) when dashboardWidgetPrefs is empty object.
 * DASHBOARD-WIDGET-PREFS-003: getWidgetPrefs → returns stored prefs when present.
 * DASHBOARD-WIDGET-PREFS-004: updateWidgetPrefs → updates a single widget's visibility, merging with existing prefs.
 * DASHBOARD-WIDGET-PREFS-005: updateWidgetPrefs → updates multiple widgets at once.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// NextAuth + DB mock
vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

// Prisma mock
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  user: {
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    update: (...args: unknown[]) => mockUserUpdate(...args),
  },
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.dashboard tRPC router (Slice 1A + Slice 3E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  // ==========================================================================
  // getWidgetPrefs (REQ-ADMIN2-008)
  // ==========================================================================

  it('DASHBOARD-WIDGET-PREFS-001: getWidgetPrefs → dashboardWidgetPrefs가 null이면 기본값(모두 true) 반환', async () => {
    mockUserFindUnique.mockResolvedValue({ dashboardWidgetPrefs: null });

    const { adminDashboardRouter } = await import('./dashboard');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDashboardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getWidgetPrefs();

    expect(result).toEqual({
      visitStats: true,
      recentDocuments: true,
      recentComments: true,
      updateNotification: true,
      summaryCounterStrip: true,
    });
  });

  it('DASHBOARD-WIDGET-PREFS-002: getWidgetPrefs → dashboardWidgetPrefs가 빈 객체이면 기본값(모두 true) 반환', async () => {
    mockUserFindUnique.mockResolvedValue({ dashboardWidgetPrefs: {} });

    const { adminDashboardRouter } = await import('./dashboard');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDashboardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getWidgetPrefs();

    expect(result).toEqual({
      visitStats: true,
      recentDocuments: true,
      recentComments: true,
      updateNotification: true,
      summaryCounterStrip: true,
    });
  });

  it('DASHBOARD-WIDGET-PREFS-003: getWidgetPrefs → 저장된 값이 있으면 그대로 반환', async () => {
    mockUserFindUnique.mockResolvedValue({
      dashboardWidgetPrefs: {
        visitStats: false,
        recentDocuments: true,
        recentComments: false,
        updateNotification: true,
        summaryCounterStrip: false,
      },
    });

    const { adminDashboardRouter } = await import('./dashboard');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDashboardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.getWidgetPrefs();

    expect(result).toEqual({
      visitStats: false,
      recentDocuments: true,
      recentComments: false,
      updateNotification: true,
      summaryCounterStrip: false,
    });
  });

  // ==========================================================================
  // updateWidgetPrefs (REQ-ADMIN2-008)
  // ==========================================================================

  it('DASHBOARD-WIDGET-PREFS-004: updateWidgetPrefs → 단일 위젯 표시 여부를 기존 설정과 병합하여 업데이트', async () => {
    mockUserFindUnique.mockResolvedValue({
      dashboardWidgetPrefs: {
        visitStats: true,
        recentDocuments: true,
        recentComments: true,
        updateNotification: true,
        summaryCounterStrip: true,
      },
    });
    mockUserUpdate.mockResolvedValue({});

    const { adminDashboardRouter } = await import('./dashboard');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDashboardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateWidgetPrefs({ visitStats: false });

    expect(result).toEqual({
      visitStats: false,
      recentDocuments: true,
      recentComments: true,
      updateNotification: true,
      summaryCounterStrip: true,
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        dashboardWidgetPrefs: {
          visitStats: false,
          recentDocuments: true,
          recentComments: true,
          updateNotification: true,
          summaryCounterStrip: true,
        },
      },
    });
  });

  it('DASHBOARD-WIDGET-PREFS-005: updateWidgetPrefs → 여러 위젯을 한 번에 업데이트', async () => {
    mockUserFindUnique.mockResolvedValue({ dashboardWidgetPrefs: null });
    mockUserUpdate.mockResolvedValue({});

    const { adminDashboardRouter } = await import('./dashboard');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminDashboardRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateWidgetPrefs({
      visitStats: false,
      recentComments: false,
    });

    expect(result).toEqual({
      visitStats: false,
      recentComments: false,
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        dashboardWidgetPrefs: {
          visitStats: false,
          recentComments: false,
        },
      },
    });
  });
});
