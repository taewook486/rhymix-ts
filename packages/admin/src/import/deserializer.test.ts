/**
 * Import Deserializer Tests
 */
import { describe, it, expect, vi } from 'vitest';

// Mock TRPCError before importing deserializer
vi.mock('@trpc/server', () => ({
  TRPCError: class extends Error {
    code: string;
    constructor(message: string) {
      super(message);
      this.code = 'UNPROCESSABLE_CONTENT';
    }
  },
}));

import { dryRun } from './deserializer';

// Mock Prisma client
const mockPrisma = {
  menu: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  moduleInstance: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  document: {
    findMany: vi.fn().mockResolvedValue([]),
  },
} as unknown as import('@prisma/client').PrismaClient;

describe('deserializer', () => {
  describe('dryRun', () => {
    it('should reject invalid bundle format', async () => {
      const invalidBundle = { invalid: true };

      await expect(dryRun(mockPrisma, invalidBundle, 1)).rejects.toThrow();
    });

    it('should reject unsupported major version', async () => {
      const bundle = {
        metadata: {
          version: '2.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial' as const,
          selection: {
            menu: false,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 0,
            menuItems: 0,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 0,
        },
      };

      const result = await dryRun(mockPrisma, bundle, 1);
      expect(result.valid).toBe(false);
      expect(result.versionCheck.passed).toBe(false);
      expect(result.versionCheck.reason).toContain('Unsupported major version');
    });

    it('should accept supported version', async () => {
      const bundle = {
        metadata: {
          version: '1.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial' as const,
          selection: {
            menu: false,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 0,
            menuItems: 0,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 0,
        },
      };

      const result = await dryRun(mockPrisma, bundle, 1);
      expect(result.valid).toBe(true);
      expect(result.versionCheck.passed).toBe(true);
    });

    it('should detect menu conflicts', async () => {
      const prismaWithMenu = {
        menu: {
          findMany: vi.fn().mockResolvedValue([
            { id: 1, title: 'Main Menu' },
          ]),
        },
        moduleInstance: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        document: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as unknown as import('@prisma/client').PrismaClient;

      const bundle = {
        metadata: {
          version: '1.0.0',
          exportedAt: new Date(),
          exportedBy: { actorId: 1, nickname: 'admin' },
          sourceSiteId: 1,
          format: 'partial' as const,
          selection: {
            menu: true,
            moduleInstances: false,
            documents: { include: false },
            comments: { include: false },
            siteSettings: false,
          },
          entityCounts: {
            menus: 0,
            menuItems: 0,
            moduleInstances: 0,
            documents: 0,
            comments: 0,
          },
          bundleSizeBytes: 0,
        },
        menus: [
          {
            id: 1,
            siteId: 1,
            title: 'Main Menu',
            isAdminMenu: false,
            listOrder: 0,
            exportKey: 'menu:1',
            items: [],
          },
        ],
      };

      const result = await dryRun(prismaWithMenu, bundle, 1);
      expect(result.valid).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].reason).toContain('already exists');
    });
  });
});
