/**
 * Specification tests for content.report tRPC router — SPEC-CONTENT-001 Slice D.
 *
 * CR-1: content.report.create 정상.
 * CR-2: content.report.create 중복 → CONFLICT (409).
 * CR-3: content.report.create 미인증 → UNAUTHORIZED.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Domain mocks
const mockReportDocument = vi.fn();

class DuplicateReportError extends Error {
  readonly code = 'DUPLICATE_REPORT';
  constructor(targetType: string, targetId: number) {
    super(`Already reported ${targetType} ${targetId}`);
    this.name = 'DuplicateReportError';
  }
}

vi.mock('@rhymix-ts/board', () => ({
  reportDocument: (...args: unknown[]) => mockReportDocument(...args),
  DuplicateReportError,
}));

vi.mock('next-auth', () => ({ default: () => ({ auth: vi.fn() }) }));
vi.mock('@/lib/auth/config', () => ({ authConfig: { providers: [] } }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

const mockPrisma = {
  siteSetting: { findFirst: vi.fn().mockResolvedValue(null) },
  adminLog: { create: vi.fn() },
};

const memberCtx = {
  session: { user: { id: 42, isAdmin: false, groups: [{ id: 1 }] } },
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

describe('content.report tRPC router (Slice D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CR-1: report.create 정상 → reportDocument 호출, 결과 반환', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentReportRouter } = await import('./report');

    mockReportDocument.mockResolvedValue({
      id: 1, documentId: 10, reporterId: '42', reason: '스팸', resolved: false,
    });

    const caller = createCallerFactory(contentReportRouter)(memberCtx as never);
    const result = await caller.create({ documentId: 10, reason: '스팸' });

    expect(mockReportDocument).toHaveBeenCalledOnce();
    expect(result.documentId).toBe(10);
    expect(result.resolved).toBe(false);
  });

  it('CR-2: report.create 중복 → CONFLICT', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentReportRouter } = await import('./report');

    mockReportDocument.mockRejectedValue(new DuplicateReportError('document', 10));

    const caller = createCallerFactory(contentReportRouter)(memberCtx as never);

    await expect(
      caller.create({ documentId: 10, reason: '스팸' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('CR-3: report.create 미인증 → UNAUTHORIZED', async () => {
    const { createCallerFactory } = await import('../../trpc');
    const { contentReportRouter } = await import('./report');

    const caller = createCallerFactory(contentReportRouter)(guestCtx as never);

    await expect(
      caller.create({ documentId: 10, reason: '스팸' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(mockReportDocument).not.toHaveBeenCalled();
  });
});
