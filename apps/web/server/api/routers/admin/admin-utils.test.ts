/**
 * admin-utils tRPC Router Tests — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * TDD RED phase: Write failing tests before implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

// Mock the admin package
const mockPurgeExpiredSessions = vi.fn(() => ({
  removedCount: 7,
  currentSessionPreserved: true,
  breakdown: { expiredAutoLogins: 5, oldSessionRevocations: 2 },
}));

vi.mock('@rhymix-ts/admin', () => ({
  invalidateAdminMenuCache: vi.fn(() => ({ invalidated: true, path: '/admin' })),
  purgeExpiredSessions: (...args: unknown[]) => mockPurgeExpiredSessions(...(args as [])),
}));

// next/cache is imported by the router; stub it so the resolver can run.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have invalidateMenuCache mutation', async () => {
    const { adminUtilsRouter } = await import('./admin-utils');
    expect(adminUtilsRouter).toBeDefined();
  });

  it('should have purgeExpiredSessions mutation', async () => {
    const { adminUtilsRouter } = await import('./admin-utils');
    expect(adminUtilsRouter).toBeDefined();
  });

  it('purgeExpiredSessions forwards currentUserId (by userId, not a fabricated token)', async () => {
    // With the mocked trpc, the router value maps each procedure to its resolver fn.
    const { adminUtilsRouter } = await import('./admin-utils');
    const resolver = (adminUtilsRouter as any).purgeExpiredSessions as (args: {
      ctx: typeof mockContext;
      input: { batchSize: number };
    }) => Promise<unknown>;

    await resolver({ ctx: mockContext, input: { batchSize: 500 } });

    expect(mockPurgeExpiredSessions).toHaveBeenCalledTimes(1);
    const [, options] = mockPurgeExpiredSessions.mock.calls[0] as unknown as [
      unknown,
      { currentUserId?: number; currentSessionToken?: string },
    ];
    // The current admin is excluded by numeric userId, NOT a `user-<id>` string.
    expect(options.currentUserId).toBe(Number(mockContext.session.user.id));
    expect(options.currentSessionToken).toBeUndefined();
  });
});
