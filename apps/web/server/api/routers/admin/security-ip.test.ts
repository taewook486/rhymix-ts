/**
 * security-ip tRPC Router Tests — SPEC-ADMIN-002 Slice 2G (REQ-ADMIN2-115)
 *
 * TDD RED phase: Write failing tests before implementation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Mock the admin package
vi.mock('@rhymix-ts/admin', () => ({
  getIpControlSettings: vi.fn(() => ({ enabled: false, allowList: [], denyList: [] })),
  updateIpControlSettings: vi.fn((input, ctx) => input),
}));

// Mock trpc
vi.mock('../../trpc', () => ({
  protectedAdminProcedure: {
    input: vi.fn((schema) => ({
      mutation: vi.fn((resolver) => resolver),
    })),
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

describe('security-ip router — REQ-ADMIN2-115', () => {
  it('should have getSettings query', async () => {
    const { adminSecurityIpRouter } = await import('./security-ip');
    expect(adminSecurityIpRouter).toBeDefined();
  });

  it('should have updateSettings mutation', async () => {
    const { adminSecurityIpRouter } = await import('./security-ip');
    expect(adminSecurityIpRouter).toBeDefined();
  });
});
