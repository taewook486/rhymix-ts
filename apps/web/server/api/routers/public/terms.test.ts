/**
 * public.terms tRPC router tests — SPEC-CAPTCHA-001 REQ-CAPTCHA-002
 *
 * Tests for public terms queries:
 * - listActive: 활성화된 약관 목록 조회
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next-auth', () => ({
  default: () => ({ auth: vi.fn() }),
}));

vi.mock('@/lib/auth/config', () => ({
  authConfig: { providers: [] },
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}));

describe('public.terms router', () => {
  const mockCtx = {
    session: null,
    prisma: {},
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    siteId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listActive', () => {
    it('should return active terms for the site', async () => {
      const mockActiveTerms = [
        { id: 1, type: 'terms', title: '이용약관', content: '내용', required: true },
        { id: 2, type: 'privacy', title: '개인정보처리방침', content: '내용', required: true },
        { id: 3, type: 'custom', title: '마케팅 동의', content: '내용', required: false },
      ];

      const mockPrisma = {
        site: { findFirst: vi.fn(async () => ({ id: 1 })) },
        terms: {
          findMany: vi.fn(async () => mockActiveTerms),
        },
      };

      const { publicTermsRouter } = await import('./terms');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma } as any);

      const result = await caller.listActive();

      expect(result).toEqual(mockActiveTerms);
      expect(mockPrisma.terms.findMany).toHaveBeenCalledWith({
        where: {
          siteId: 1,
          active: true,
        },
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          required: true,
        },
      });
    });

    it('should return empty array when no site exists', async () => {
      const mockPrisma = {
        site: { findFirst: vi.fn(async () => null) },
        terms: { findMany: vi.fn(async () => []) },
      };

      const { publicTermsRouter } = await import('./terms');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma, siteId: undefined } as any);

      const result = await caller.listActive();

      expect(result).toEqual([]);
      expect(mockPrisma.terms.findMany).not.toHaveBeenCalled();
    });

    it('should use siteId from context when available', async () => {
      const mockActiveTerms = [
        { id: 1, type: 'terms', title: '이용약관', content: '내용', required: true },
      ];

      const mockPrisma = {
        terms: {
          findMany: vi.fn(async () => mockActiveTerms),
        },
      };

      const { publicTermsRouter } = await import('./terms');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma, siteId: 5 } as any);

      const result = await caller.listActive();

      expect(result).toEqual(mockActiveTerms);
      expect(mockPrisma.terms.findMany).toHaveBeenCalledWith({
        where: {
          siteId: 5,
          active: true,
        },
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          required: true,
        },
      });
    });

    it('should exclude inactive terms', async () => {
      const mockActiveTerms = [
        { id: 1, type: 'terms', title: '이용약관', content: '내용', required: true },
      ];

      const mockPrisma = {
        site: { findFirst: vi.fn(async () => ({ id: 1 })) },
        terms: {
          findMany: vi.fn(async () => mockActiveTerms),
        },
      };

      const { publicTermsRouter } = await import('./terms');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma } as any);

      const result = await caller.listActive();

      expect(result).toHaveLength(1);
      expect(mockPrisma.terms.findMany).toHaveBeenCalledWith({
        where: {
          siteId: 1,
          active: true,
        },
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          required: true,
        },
      });
    });
  });
});
