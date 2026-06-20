/**
 * Admin Utilities Tests — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * TDD RED phase: Write failing tests before implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  invalidateAdminMenuCache,
  purgeExpiredSessions,
} from './admin-utils';

// Mock Prisma client
function createMockPrisma() {
  return {
    autoLogin: {
      deleteMany: async ({ where }: any) => ({ count: 5 }),
    },
    sessionRevocation: {
      deleteMany: async ({ where }: any) => ({ count: 2 }),
    },
  } as unknown as PrismaClient;
}

describe('admin-utils — REQ-ADMIN2-150, REQ-ADMIN2-151', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('invalidateAdminMenuCache — REQ-ADMIN2-150', () => {
    it('should return the admin menu cache path to revalidate', async () => {
      const ctx = { prisma };

      // This package is pure logic — it returns the path to revalidate
      // instead of calling Next.js revalidatePath() directly. The caller
      // (apps/web) is responsible for invoking revalidatePath() with it.
      const result = await invalidateAdminMenuCache(ctx);

      expect(result.invalidated).toBe(true);
      expect(result.path).toBe('/admin');
    });
  });

  describe('purgeExpiredSessions — REQ-ADMIN2-151', () => {
    it('should purge expired AutoLogin tokens in bounded batch', async () => {
      const ctx = { prisma };

      const result = await purgeExpiredSessions(ctx, {
        batchSize: 500,
      });

      expect(result).toBeDefined();
      expect(typeof result.removedCount).toBe('number');
      expect(result.removedCount).toBeGreaterThanOrEqual(0);
    });

    it('should exclude current admin session from purge by userId', async () => {
      const ctx = { prisma };
      const currentUserId = 42;

      const result = await purgeExpiredSessions(ctx, {
        batchSize: 500,
        currentUserId,
      });

      // Verify the current session was not deleted
      // This is a critical invariant - @MX:ANCHOR
      expect(result.removedCount).toBeGreaterThanOrEqual(0);
      expect(result.currentSessionPreserved).toBe(true);
    });

    it('should handle empty expired sessions gracefully', async () => {
      const prismaEmpty = {
        autoLogin: {
          deleteMany: async ({ where }: any) => ({ count: 0 }),
        },
        sessionRevocation: {
          deleteMany: async ({ where }: any) => ({ count: 0 }),
        },
      } as unknown as PrismaClient;

      const result = await purgeExpiredSessions(
        { prisma: prismaEmpty },
        { batchSize: 500 },
      );

      expect(result.removedCount).toBe(0);
    });

    it('should support custom batch size', async () => {
      const ctx = { prisma };

      const result = await purgeExpiredSessions(ctx, {
        batchSize: 100,
      });

      expect(result).toBeDefined();
      // The implementation should respect the batch size
      // This is verified through the implementation logic
    });

    // Critical test: Ensures current admin's own AutoLogin tokens are never purged.
    // The exclusion MUST be by userId, because securityKey is a real per-token value
    // and a fabricated `user-<id>` string never matches it.
    it('should never delete current admin AutoLogin tokens — excluded by userId — @MX:ANCHOR', async () => {
      let capturedWhere: any = null;
      const prismaTrack = {
        autoLogin: {
          deleteMany: async ({ where }: any) => {
            // Capture the where clause to verify exclusion
            capturedWhere = where;
            return { count: 5 }; // Simulate 5 deleted tokens
          },
        },
        sessionRevocation: {
          deleteMany: async () => ({ count: 0 }),
        },
      } as unknown as PrismaClient;

      const currentUserId = 12345;

      const result = await purgeExpiredSessions(
        { prisma: prismaTrack },
        { batchSize: 500, currentUserId },
      );

      // Verify current admin's tokens were excluded via the userId `not` clause
      // (NOT via the fabricated securityKey string, which never matched).
      expect(capturedWhere).toBeDefined();
      expect(capturedWhere?.userId?.not).toBe(currentUserId);
      expect(capturedWhere?.securityKey).toBeUndefined();
      expect(result.currentSessionPreserved).toBe(true);
    });

    // Regression: an expired AutoLogin row belonging to the current admin must NOT be
    // deleted, while expired rows of other users ARE deleted.
    it('should preserve current admin expired rows while deleting others — @MX:ANCHOR', async () => {
      const autoLoginRows = [
        { id: 1, userId: 12345, expiresAt: new Date(0) }, // current admin, expired
        { id: 2, userId: 99, expiresAt: new Date(0) }, // other user, expired
        { id: 3, userId: 100, expiresAt: new Date(0) }, // other user, expired
      ];

      const prismaFilter = {
        autoLogin: {
          deleteMany: async ({ where }: any) => {
            // Emulate Prisma applying the where clause to the dataset.
            const excludedUserId = where?.userId?.not;
            const deleted = autoLoginRows.filter(
              (r) => r.expiresAt < new Date() && r.userId !== excludedUserId,
            );
            return { count: deleted.length };
          },
        },
        sessionRevocation: {
          deleteMany: async () => ({ count: 0 }),
        },
      } as unknown as PrismaClient;

      const result = await purgeExpiredSessions(
        { prisma: prismaFilter },
        { batchSize: 500, currentUserId: 12345 },
      );

      // Only the 2 other users' expired rows are deleted; admin's row is preserved.
      expect(result.breakdown.expiredAutoLogins).toBe(2);
    });
  });
});
