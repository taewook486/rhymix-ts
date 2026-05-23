/**
 * Specification tests for admin.moderation tRPC router — SPEC-CONTENT-001 Slice D.
 *
 * AM-1: admin.moderation.reports resolved=false 필터.
 * AM-2: admin.moderation.reports 비admin → FORBIDDEN.
 * AM-3: admin.moderation.resolveReport → resolved=true.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockListReports = vi.fn();
const mockResolveReport = vi.fn();

vi.mock('@rhymix-ts/board', () => ({
  listReports: (...args: unknown[]) => mockListReports(...args),
  resolveReport: (...args: unknown[]) => mockResolveReport(...args),
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/auth/admin-middleware', () => ({
  isAdminSession: (session: unknown) =>
    (session as { user?: { isAdmin?: boolean } } | null)?.user?.isAdmin === true,
}));
vi.mock('@/lib/auth/two-factor', () => ({
  isAdminTwoFactorRequired: vi.fn().mockResolvedValue(false),
  isSessionTwoFactorVerified: vi.fn().mockReturnValue(true),
}));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
};

const adminCtx = {
  session: { user: { id: 1, isAdmin: true, groups: [{ id: 1, isAdmin: true }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};
const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
  prisma: mockPrisma,
  ip: '::1',
  userAgent: 'test',
};

describe('admin.moderation tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.adminLog.create.mockResolvedValue({});
  });

  it('AM-1: moderation.reports resolved=false 필터 → 미해결 신고 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminModerationRouter } = await import('./moderation');

    const fakeResult = {
      items: [{ id: 1, resolved: false, documentId: 10 }],
      total: 1,
    };
    mockListReports.mockResolvedValue(fakeResult);

    const caller = createCallerFactory(adminModerationRouter)(adminCtx as never);
    const result = await caller.reports({ resolved: false });

    expect(mockListReports).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('AM-2: moderation.reports 비admin → FORBIDDEN', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminModerationRouter } = await import('./moderation');

    const caller = createCallerFactory(adminModerationRouter)(memberCtx as never);

    await expect(caller.reports({ resolved: false })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockListReports).not.toHaveBeenCalled();
  });

  it('AM-3: moderation.resolveReport admin → resolved=true', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { adminModerationRouter } = await import('./moderation');

    mockResolveReport.mockResolvedValue({ id: 1, resolved: true });

    const caller = createCallerFactory(adminModerationRouter)(adminCtx as never);
    const result = await caller.resolveReport({ reportId: 1 });

    expect(result.resolved).toBe(true);
  });
});
