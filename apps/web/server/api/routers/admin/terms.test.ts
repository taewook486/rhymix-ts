/**
 * admin.terms tRPC router tests — SPEC-CAPTCHA-001 REQ-CAPTCHA-002
 *
 * Tests for Terms CRUD operations:
 * - list: 모든 약관 조회
 * - create: 새 약관 생성
 * - update: 약관 수정
 * - delete: 약관 삭제
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

function makeMockPrisma() {
  return {
    site: { findFirst: vi.fn(async () => ({ id: 1 })) },
    siteSetting: {
      findFirst: vi.fn(async () => null), // 2FA disabled
    },
    adminLog: { create: vi.fn(async () => ({ id: 1 })) },
    terms: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('admin.terms router', () => {
  const mockSession = { user: { id: 1, isAdmin: true, groups: [] } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return all terms for the site', async () => {
      const mockTerms = [
        { id: 1, siteId: 1, type: 'terms', title: '이용약관', content: '내용', required: true, active: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, siteId: 1, type: 'privacy', title: '개인정보처리방침', content: '내용', required: true, active: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockPrisma = makeMockPrisma();
      mockPrisma.terms.findMany = vi.fn(async () => mockTerms);

      const { adminTermsRouter } = await import('./terms');
      const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
      clearAdminSecurityCache();
      const createCaller = createCallerFactory(adminTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ session: mockSession, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test', siteId: 1 } as any);

      const result = await caller.list();

      expect(result).toEqual(mockTerms);
      expect(mockPrisma.terms.findMany).toHaveBeenCalledWith({
        where: { siteId: 1 },
        orderBy: [{ type: 'asc' }, { id: 'asc' }],
      });
    });
  });

  describe('create', () => {
    it('should create a new term', async () => {
      const input = {
        type: 'custom' as const,
        title: '마케팅 활용 동의',
        content: '<p>마케팅 활용에 동의합니다.</p>',
        required: false,
        active: true,
      };

      const newTerm = { id: 1, siteId: 1, ...input, createdAt: new Date(), updatedAt: new Date() };

      const mockPrisma = makeMockPrisma();
      mockPrisma.terms.create = vi.fn(async () => newTerm);

      const { adminTermsRouter } = await import('./terms');
      const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
      clearAdminSecurityCache();
      const createCaller = createCallerFactory(adminTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ session: mockSession, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test', siteId: 1 } as any);

      const result = await caller.create(input);

      expect(result).toEqual(newTerm);
      expect(mockPrisma.terms.create).toHaveBeenCalledWith({
        data: {
          siteId: 1,
          type: input.type,
          title: input.title,
          content: input.content,
          required: input.required,
          active: input.active,
        },
      });
      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          action: 'create',
          target: 'terms:1',
          diff: { before: null, after: { type: input.type, title: input.title } },
          ip: '127.0.0.1',
          userAgent: 'test',
        },
      });
    });
  });

  describe('update', () => {
    it('should update an existing term', async () => {
      const input = {
        id: 1,
        title: '이용약관 (수정)',
      };

      const existingTerm = { id: 1, siteId: 1, type: 'terms' as const, title: '이용약관', content: '내용', required: true, active: true, createdAt: new Date(), updatedAt: new Date() };
      const updatedTerm = { ...existingTerm, title: input.title, updatedAt: new Date() };

      const mockPrisma = makeMockPrisma();
      mockPrisma.terms.findFirst = vi.fn(async () => existingTerm);
      mockPrisma.terms.update = vi.fn(async () => updatedTerm);

      const { adminTermsRouter } = await import('./terms');
      const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
      clearAdminSecurityCache();
      const createCaller = createCallerFactory(adminTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ session: mockSession, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test', siteId: 1 } as any);

      const result = await caller.update(input);

      expect(result).toEqual(updatedTerm);
      expect(mockPrisma.terms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: input.title },
      });
      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          action: 'update',
          target: 'terms:1',
          diff: {
            before: { type: 'terms', title: '이용약관' },
            after: { type: 'terms', title: '이용약관 (수정)' },
          },
          ip: '127.0.0.1',
          userAgent: 'test',
        },
      });
    });

    it('should throw NOT_FOUND if term does not exist', async () => {
      const mockPrisma = makeMockPrisma();
      mockPrisma.terms.findFirst = vi.fn(async () => null);

      const { adminTermsRouter } = await import('./terms');
      const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
      clearAdminSecurityCache();
      const createCaller = createCallerFactory(adminTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ session: mockSession, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test', siteId: 1 } as any);

      await expect(caller.update({ id: 999, title: '수정' })).rejects.toThrow('약관을 찾을 수 없습니다');
    });
  });

  describe('delete', () => {
    it('should delete an existing term', async () => {
      const existingTerm = { id: 1, siteId: 1, type: 'terms' as const, title: '이용약관', content: '내용', required: true, active: true, createdAt: new Date(), updatedAt: new Date() };

      const mockPrisma = makeMockPrisma();
      mockPrisma.terms.findFirst = vi.fn(async () => existingTerm);
      mockPrisma.terms.delete = vi.fn(async () => existingTerm);

      const { adminTermsRouter } = await import('./terms');
      const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
      clearAdminSecurityCache();
      const createCaller = createCallerFactory(adminTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ session: mockSession, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test', siteId: 1 } as any);

      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      expect(mockPrisma.terms.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.adminLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          action: 'delete',
          target: 'terms:1',
          diff: { before: { type: 'terms', title: '이용약관' }, after: null },
          ip: '127.0.0.1',
          userAgent: 'test',
        },
      });
    });

    it('should throw NOT_FOUND if term does not exist', async () => {
      const mockPrisma = makeMockPrisma();
      mockPrisma.terms.findFirst = vi.fn(async () => null);

      const { adminTermsRouter } = await import('./terms');
      const { createCallerFactory, clearAdminSecurityCache } = await import('../../trpc');
      clearAdminSecurityCache();
      const createCaller = createCallerFactory(adminTermsRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ session: mockSession, prisma: mockPrisma, ip: '127.0.0.1', userAgent: 'test', siteId: 1 } as any);

      await expect(caller.delete({ id: 999 })).rejects.toThrow('약관을 찾을 수 없습니다');
    });
  });
});
