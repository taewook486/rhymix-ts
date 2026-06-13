import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSitePointConfig, setSitePointConfig } from './config.js';

// Mock helpers
function makePrisma(overrides = {}) {
  return {
    sitePointConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({
        id: 1,
        signupBonus: 100,
        clampToZero: true,
        allowNegativeBalance: false,
        defaultLevel: 1,
      }),
    },
    ...overrides,
  };
}

describe('Point config functions', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  describe('getSitePointConfig', () => {
    it('should return defaults when no config row exists', async () => {
      // Given: findUnique returns null (no config stored)
      prisma.sitePointConfig.findUnique = vi.fn().mockResolvedValue(null);

      // When: getSitePointConfig
      const result = await getSitePointConfig(prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient);

      // Then: returns default config
      expect(prisma.sitePointConfig.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        })
      );
      expect(result).toEqual({
        signupBonus: 0,
        clampToZero: true,
        allowNegativeBalance: false,
        defaultLevel: 1,
      });
    });

    it('should return stored config values when row exists', async () => {
      // Given: findUnique returns stored config
      prisma.sitePointConfig.findUnique = vi.fn().mockResolvedValue({
        id: 1,
        signupBonus: 100,
        clampToZero: false,
        allowNegativeBalance: true,
        defaultLevel: 5,
      });

      // When: getSitePointConfig
      const result = await getSitePointConfig(prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient);

      // Then: returns parsed config
      expect(result).toEqual({
        signupBonus: 100,
        clampToZero: false,
        allowNegativeBalance: true,
        defaultLevel: 5,
      });
    });
  });

  describe('setSitePointConfig', () => {
    it('should upsert config with merged values', async () => {
      // Given: partial config update
      const partial = {
        signupBonus: 500,
        allowNegativeBalance: true,
      };

      // When: setSitePointConfig
      const result = await setSitePointConfig(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        partial
      );

      // Then: upsert called with merged config (existing values + partial)
      expect(prisma.sitePointConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          create: expect.objectContaining({
            signupBonus: 500,
            clampToZero: true, // default
            allowNegativeBalance: true,
            defaultLevel: 1, // default
          }),
          update: expect.objectContaining({
            signupBonus: 500,
            allowNegativeBalance: true,
          }),
        })
      );
      expect(result).toEqual({
        signupBonus: 500,
        clampToZero: true,
        allowNegativeBalance: true,
        defaultLevel: 1,
      });
    });

    it('should upsert with all values when full config provided', async () => {
      // Given: full config update
      const full = {
        signupBonus: 200,
        clampToZero: false,
        allowNegativeBalance: false,
        defaultLevel: 3,
      };

      // When: setSitePointConfig
      const result = await setSitePointConfig(
        prisma as unknown as import('@packages/db/src/prisma.js').PrismaClient,
        full
      );

      // Then: upsert called with all values
      expect(prisma.sitePointConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining(full),
          update: expect.objectContaining(full),
        })
      );
      expect(result).toEqual(full);
    });
  });
});
