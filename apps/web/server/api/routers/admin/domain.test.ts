/**
 * Specification tests for admin.domain.setIndexModule — 인덱스 모듈 지정.
 *
 * D2-1: 같은 사이트의 모듈 인스턴스를 인덱스로 지정 → domain.update 호출
 * D2-2: 다른 사이트의 모듈 인스턴스 지정 → 거부 (사이트 경계 침범 방지)
 * D2-3: null 지정 → 인덱스 해제
 * D2-4: 다른 사이트의 도메인 지정 → 거부
 * D2-5: 비관리자 호출 → FORBIDDEN
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const mockDomainFindUnique = vi.fn();
const mockDomainUpdate = vi.fn();
const mockModuleFindUnique = vi.fn();
const mockSiteSettingFindFirst = vi.fn();

const mockPrisma = {
  domain: {
    findUnique: (...a: unknown[]) => mockDomainFindUnique(...a),
    update: (...a: unknown[]) => mockDomainUpdate(...a),
  },
  moduleInstance: {
    findUnique: (...a: unknown[]) => mockModuleFindUnique(...a),
  },
  siteSetting: {
    findFirst: (...a: unknown[]) => mockSiteSettingFindFirst(...a),
  },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};
const guestCtx = { session: null, prisma: mockPrisma, ip: '::1', userAgent: 'test' };

async function makeCaller(ctx: unknown) {
  const { adminDomainRouter } = await import('./domain');
  const { createCallerFactory } = await import('../../trpc');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createCallerFactory(adminDomainRouter)(ctx as any);
}

describe('admin.domain.setIndexModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSiteSettingFindFirst.mockResolvedValue(null);
    mockDomainUpdate.mockResolvedValue({ id: 1, indexModuleInstanceId: 5 });
  });

  it('D2-1: 같은 사이트의 모듈을 인덱스로 지정하면 domain.update 가 호출된다', async () => {
    mockDomainFindUnique.mockResolvedValue({ id: 1, siteId: 1 });
    mockModuleFindUnique.mockResolvedValue({ id: 5, siteId: 1 });

    const caller = await makeCaller(adminCtx);
    await caller.setIndexModule({ domainId: 1, moduleInstanceId: 5 });

    expect(mockDomainUpdate).toHaveBeenCalledTimes(1);
    const arg = mockDomainUpdate.mock.calls[0]![0] as {
      where: { id: number };
      data: { indexModuleInstanceId: number | null };
    };
    expect(arg.where.id).toBe(1);
    expect(arg.data.indexModuleInstanceId).toBe(5);
  });

  it('D2-2: 다른 사이트의 모듈 인스턴스는 거부한다', async () => {
    mockDomainFindUnique.mockResolvedValue({ id: 1, siteId: 1 });
    mockModuleFindUnique.mockResolvedValue({ id: 9, siteId: 2 });

    const caller = await makeCaller(adminCtx);
    await expect(
      caller.setIndexModule({ domainId: 1, moduleInstanceId: 9 })
    ).rejects.toThrow();
    expect(mockDomainUpdate).not.toHaveBeenCalled();
  });

  it('D2-3: null 을 넘기면 인덱스 모듈을 해제한다', async () => {
    mockDomainFindUnique.mockResolvedValue({ id: 1, siteId: 1 });

    const caller = await makeCaller(adminCtx);
    await caller.setIndexModule({ domainId: 1, moduleInstanceId: null });

    const arg = mockDomainUpdate.mock.calls[0]![0] as {
      data: { indexModuleInstanceId: number | null };
    };
    expect(arg.data.indexModuleInstanceId).toBeNull();
    expect(mockModuleFindUnique).not.toHaveBeenCalled();
  });

  it('D2-4: 존재하지 않는 도메인은 거부한다', async () => {
    mockDomainFindUnique.mockResolvedValue(null);

    const caller = await makeCaller(adminCtx);
    await expect(
      caller.setIndexModule({ domainId: 999, moduleInstanceId: null })
    ).rejects.toThrow();
    expect(mockDomainUpdate).not.toHaveBeenCalled();
  });

  it('D2-5: 비관리자 호출은 거부한다', async () => {
    const caller = await makeCaller(guestCtx);
    await expect(
      caller.setIndexModule({ domainId: 1, moduleInstanceId: null })
    ).rejects.toThrow();
    expect(mockDomainUpdate).not.toHaveBeenCalled();
  });
});
