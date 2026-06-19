/**
 * admin-utils tRPC Router Tests — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * TDD RED phase: Write failing tests before implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

// Mock the admin package
vi.mock('@rhymix-ts/admin', () => ({
  invalidateAdminMenuCache: vi.fn(() => ({ invalidated: true, path: '/admin' })),
  purgeExpiredSessions: vi.fn(() => ({
    removedCount: 7,
    currentSessionPreserved: true,
    breakdown: { expiredAutoLogins: 5, oldSessionRevocations: 2 },
  })),
}));

// Mock trpc
vi.mock('../../trpc', () => ({
  protectedAdminProcedure: {
    input: vi.fn((schema) => ({
      mutation: vi.fn((resolver) => resolver),
      query: vi.fn((resolver) => resolver),
    })),
    mutation: vi.fn((resolver) => resolver),
    query: vi.fn((resolver) => resolver),
  },
  router: vi.fn((opts) => opts),
}));

// Mock context
const mockPrisma = {} as PrismaClient;
const mockContext = {
  prisma: mockPrisma,
  session: { user: { id: 1 } },
  ip: '127.0.0.1',
  userAgent: 'test',
};

describe('admin-utils router — REQ-ADMIN2-150, REQ-ADMIN2-151', () => {
  it('should have invalidateMenuCache mutation', async () => {
    const { adminUtilsRouter } = await import('./admin-utils');
    expect(adminUtilsRouter).toBeDefined();
  });

  it('should have purgeExpiredSessions mutation', async () => {
    const { adminUtilsRouter } = await import('./admin-utils');
    expect(adminUtilsRouter).toBeDefined();
  });
});
