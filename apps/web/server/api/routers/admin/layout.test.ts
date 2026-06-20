/**
 * Specification tests for admin.layout tRPC router — SPEC-ADMIN-002 Slice 2A + Slice 3D.
 *
 * LAYOUT-001: admin 세션 + layout.list → Layout 목록과 인스턴스 수 반환.
 * LAYOUT-002: layout.list → 각 Layout에 대한 ThemeAssignment 수를 집계.
 * LAYOUT-003: admin 세션 + layout.listInstances → ThemeAssignment 목록 반환.
 * LAYOUT-004: layout.createInstance → 새 ThemeAssignment 생성.
 * LAYOUT-005: layout.updateInstanceVariables → tokensOverride JSON 갱신.
 * LAYOUT-006: layout.preview → 레이아웃 미리보기 데이터 반환 (REQ-ADMIN2-023).
 * LAYOUT-007: layout.duplicateInstance → 레이아웃 인스턴스 복제 (REQ-ADMIN2-024).
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
const mockLayoutFindMany = vi.fn();
const mockLayoutFindUnique = vi.fn();
const mockThemeAssignmentFindMany = vi.fn();
const mockThemeAssignmentFindUnique = vi.fn();
const mockThemeAssignmentCreate = vi.fn();
const mockThemeAssignmentUpdate = vi.fn();
const mockThemeAssignmentCount = vi.fn();
const mockSiteSettingFindFirst = vi.fn();
const mockAdminLogCreate = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  layout: {
    findMany: (...args: unknown[]) => mockLayoutFindMany(...args),
    findUnique: (...args: unknown[]) => mockLayoutFindUnique(...args),
  },
  themeAssignment: {
    findMany: (...args: unknown[]) => mockThemeAssignmentFindMany(...args),
    findUnique: (...args: unknown[]) => mockThemeAssignmentFindUnique(...args),
    create: (...args: unknown[]) => mockThemeAssignmentCreate(...args),
    update: (...args: unknown[]) => mockThemeAssignmentUpdate(...args),
    count: (...args: unknown[]) => mockThemeAssignmentCount(...args),
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

const guestCtx = {
  session: null,
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.layout tRPC router (Slice 2A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null); // 2FA 비활성화
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
  });

  it('LAYOUT-001: admin 세션 + layout.list → Layout 목록과 인스턴스 수 반환', async () => {
    const layouts = [
      { id: '1', name: 'default', title: '기본 레이아웃', layoutType: 'DESKTOP' as const, themeId: 'theme1' },
      { id: '2', name: 'mobile', title: '모바일 레이아웃', layoutType: 'MOBILE' as const, themeId: 'theme1' },
    ];
    mockLayoutFindMany.mockResolvedValueOnce(layouts);
    mockThemeAssignmentCount
      .mockResolvedValueOnce(5) // default 레이아웃 인스턴스 5개
      .mockResolvedValueOnce(3); // mobile 레이아웃 인스턴스 3개

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list();

    expect(mockLayoutFindMany).toHaveBeenCalledOnce();
    expect(result).toEqual([
      { ...layouts[0], instanceCount: 5 },
      { ...layouts[1], instanceCount: 3 },
    ]);
  });

  it('LAYOUT-002: layout.list → 각 Layout에 대한 ThemeAssignment 수를 집계', async () => {
    const layouts = [
      { id: '1', name: 'default', title: '기본 레이아웃', layoutType: 'DESKTOP' as const, themeId: 'theme1' },
    ];
    mockLayoutFindMany.mockResolvedValueOnce(layouts);
    mockThemeAssignmentCount.mockResolvedValueOnce(10);

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.list();

    expect(mockThemeAssignmentCount).toHaveBeenCalledWith({
      where: { layoutName: 'default' },
    });
    expect(result[0]?.instanceCount).toBe(10);
  });

  it('LAYOUT-003: admin 세션 + layout.listInstances → ThemeAssignment 목록 반환', async () => {
    const instances = [
      {
        id: '1',
        scope: 'SITE' as const,
        refType: 'layout',
        refId: 'site1',
        layoutName: 'default',
        tokensOverride: { logo: '/logo.png', primaryColor: '#000000' },
        createdAt: new Date('2024-01-01'),
      },
    ];
    mockThemeAssignmentFindMany.mockResolvedValueOnce(instances);

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.listInstances();

    expect(mockThemeAssignmentFindMany).toHaveBeenCalledOnce();
    expect(result).toEqual(instances);
  });

  it('LAYOUT-004: layout.createInstance → 새 ThemeAssignment 생성', async () => {
    const newInstance = {
      id: 'new-id',
      themeId: 'theme1',
      scope: 'SITE',
      refType: 'layout',
      refId: 'site1',
      layoutName: 'default',
      tokensOverride: null,
    };
    mockThemeAssignmentCreate.mockResolvedValueOnce(newInstance);

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.createInstance({
      themeId: 'theme1',
      scope: 'SITE',
      refId: 'site1',
      layoutName: 'default',
    });

    expect(mockThemeAssignmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        themeId: 'theme1',
        scope: 'SITE',
        refType: 'layout',
        refId: 'site1',
        layoutName: 'default',
      }),
    });
    expect(result).toEqual(newInstance);
  });

  it('LAYOUT-005: layout.updateInstanceVariables → tokensOverride JSON 갱신', async () => {
    const updatedInstance = {
      id: '1',
      tokensOverride: { logo: '/new-logo.png', primaryColor: '#ffffff' },
    };
    mockThemeAssignmentUpdate.mockResolvedValueOnce(updatedInstance);

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.updateInstanceVariables({
      id: '1',
      tokensOverride: { logo: '/new-logo.png', primaryColor: '#ffffff' },
    });

    expect(mockThemeAssignmentUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { tokensOverride: { logo: '/new-logo.png', primaryColor: '#ffffff' } },
    });
    expect(result).toEqual(updatedInstance);
  });

  it('LAYOUT-006: layout.preview → 레이아웃 미리보기 데이터 반환 (REQ-ADMIN2-023)', async () => {
    const layout = {
      id: '1',
      name: 'default',
      title: '기본 레이아웃',
      layoutType: 'DESKTOP' as const,
      themeId: 'theme1',
    };
    mockLayoutFindUnique.mockResolvedValueOnce(layout);

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.preview({ layoutId: '1' });

    expect(mockLayoutFindUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
    expect(result).toEqual({
      layout,
      sampleContent: {
        title: '샘플 페이지 제목',
        content: '<p>샘플 콘텐츠입니다.</p>',
        widgets: [],
      },
    });
  });

  it('LAYOUT-007: layout.duplicateInstance → 레이아웃 인스턴스 복제 (REQ-ADMIN2-024)', async () => {
    const existingInstance = {
      id: 'existing-id',
      themeId: 'theme1',
      scope: 'SITE' as const,
      refType: 'layout',
      refId: 'site1',
      layoutName: 'default',
      mobileLayoutName: 'mobile',
      mlayoutMode: 'AUTO',
      skinName: 'default',
      tokensOverride: { logo: '/logo.png', primaryColor: '#000000' },
    };
    mockThemeAssignmentFindUnique.mockResolvedValueOnce(existingInstance);

    const duplicatedInstance = {
      ...existingInstance,
      id: 'new-duplicated-id',
      refId: 'site2',
    };
    mockThemeAssignmentCreate.mockResolvedValueOnce(duplicatedInstance);

    const { adminLayoutRouter } = await import('./layout');
    const { createCallerFactory } = await import('../../trpc');
    const createCaller = createCallerFactory(adminLayoutRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtx as any);

    const result = await caller.duplicateInstance({
      instanceId: 'existing-id',
      newRefId: 'site2',
    });

    expect(mockThemeAssignmentFindUnique).toHaveBeenCalledWith({
      where: { id: 'existing-id' },
    });
    expect(mockThemeAssignmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        themeId: 'theme1',
        scope: 'SITE',
        refType: 'layout',
        refId: 'site2',
        layoutName: 'default',
        mobileLayoutName: 'mobile',
        mlayoutMode: 'AUTO',
        skinName: 'default',
        tokensOverride: { logo: '/logo.png', primaryColor: '#000000' },
      }),
    });
    expect(result).toEqual(duplicatedInstance);
  });
});
