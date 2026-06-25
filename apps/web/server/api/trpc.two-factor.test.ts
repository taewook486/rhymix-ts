/**
 * Specification tests for 2FA tRPC middleware — SPEC-ADMIN-001 Slice I (REQ-ADMIN-023).
 *
 * I-1-5: tRPC — 2FA 활성 + 미인증 관리자 → FORBIDDEN
 * I-1-6: tRPC — 2FA 비활성 → 정상 통과 (기존 동작 회귀 없음)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

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

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const mockSiteSettingFindFirst = vi.fn();
const mockModuleFindMany = vi.fn();
const mockModuleInstanceFindMany = vi.fn();
const mockAdminLogCreate = vi.fn();
// SPEC-ADMIN-2FA-OTP-001 M5: checkAdmin2FA 가 실제 User.twoFactorEnabled/secret
// 컬럼을 조회하므로 user.findUnique 도 mock 해야 한다.
const mockUserFindUnique = vi.fn();

const mockPrisma = {
  siteSetting: {
    findFirst: (...args: unknown[]) => mockSiteSettingFindFirst(...args),
  },
  moduleDefinition: {
    findMany: (...args: unknown[]) => mockModuleFindMany(...args),
  },
  moduleInstance: {
    findMany: (...args: unknown[]) => mockModuleInstanceFindMany(...args),
  },
  adminLog: {
    create: (...args: unknown[]) => mockAdminLogCreate(...args),
  },
  user: {
    findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
  },
};

// ---------------------------------------------------------------------------
// Context fixtures
// ---------------------------------------------------------------------------

const adminCtxNo2FA = {
  session: { user: { id: 1, isAdmin: true, groups: [], twoFactorVerified: false } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

const adminCtxWith2FA = {
  session: { user: { id: 1, isAdmin: true, groups: [], twoFactorVerified: true } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('protectedAdminProcedure 2FA 미들웨어 (Slice I — REQ-ADMIN-023)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminLogCreate.mockResolvedValue({ id: BigInt(1) });
    // SPEC-ADMIN-2FA-OTP-001 M5: 등록된 관리자로 가정(두 필드 모두 채워짐).
    // policy on 케이스에서 checkAdmin2FA 가 userlookup 을 수행하므로 기본값 제공.
    mockUserFindUnique.mockResolvedValue({
      twoFactorEnabled: true,
      twoFactorSecret: 'enc-blob',
    });
  });

  it('I-1-5: 2FA 활성 + 미인증 관리자 → FORBIDDEN (REQ-ADMIN-023)', async () => {
    // 2FA 활성화
    mockSiteSettingFindFirst.mockResolvedValue({ key: 'requireAdminTwoFactor', value: true });
    mockModuleFindMany.mockResolvedValue([]);
    mockModuleInstanceFindMany.mockResolvedValue([]);

    const { adminModuleRouter } = await import('./routers/admin/module');
    const { createCallerFactory } = await import('./trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtxNo2FA as any);

    await expect(caller.list({ siteId: 1 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('I-1-6: 2FA 비활성 → 정상 통과 (기존 회귀 없음)', async () => {
    // 2FA 비활성화 (설정 없음)
    mockSiteSettingFindFirst.mockResolvedValue(null);
    mockModuleFindMany.mockResolvedValue([]);
    mockModuleInstanceFindMany.mockResolvedValue([]);

    const { adminModuleRouter } = await import('./routers/admin/module');
    const { createCallerFactory } = await import('./trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtxNo2FA as any);

    // 예외 없이 통과해야 함
    const result = await caller.list({ siteId: 1 });
    expect(result).toBeDefined();
  });

  it('I-1-6b: 2FA 활성 + 인증 완료 → 정상 통과', async () => {
    // 2FA 활성화 but verified
    mockSiteSettingFindFirst.mockResolvedValue({ key: 'requireAdminTwoFactor', value: true });
    mockModuleFindMany.mockResolvedValue([]);
    mockModuleInstanceFindMany.mockResolvedValue([]);

    const { adminModuleRouter } = await import('./routers/admin/module');
    const { createCallerFactory } = await import('./trpc');
    const createCaller = createCallerFactory(adminModuleRouter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller(adminCtxWith2FA as any);

    // 예외 없이 통과해야 함
    const result = await caller.list({ siteId: 1 });
    expect(result).toBeDefined();
  });
});
