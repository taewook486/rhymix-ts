/**
 * Onboarding dismiss action 테스트 — SPEC-INSTALL-003 REQ-INSTALL3-002.
 *
 * TDD RED phase: 이 파일의 테스트는 구현 전 실패 상태여야 함.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dismissOnboarding } from '../onboarding';

// Mock dependencies
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1' } })),
}));

vi.mock('@rhymix-ts/db', () => ({
  prisma: {
    siteSetting: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    site: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@rhymix-ts/db';

describe('dismissOnboarding action - RED phase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('REQ-INSTALL3-002: Dismiss persistence', () => {
    it('should upsert SiteSetting with operator_onboarding_dismissed=true', async () => {
      // Given: authenticated operator
      const mockSite = { id: 1, siteId: 1 };
      (prisma.site.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockSite);

      // When: dismissOnboarding is called
      await dismissOnboarding({ siteId: 1 });

      // Then: should upsert SiteSetting
      expect(prisma.siteSetting.upsert).toHaveBeenCalledWith({
        where: {
          siteId_key: {
            siteId: 1,
            key: 'operator_onboarding_dismissed',
          },
        },
        create: {
          siteId: 1,
          key: 'operator_onboarding_dismissed',
          value: true,
        },
        update: {
          value: true,
        },
      });
    });

    it('should return success response on successful upsert', async () => {
      // Given: authenticated operator
      const mockSite = { id: 1, siteId: 1 };
      (prisma.site.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockSite);
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        siteId: 1,
        key: 'operator_onboarding_dismissed',
        value: true,
        updatedAt: new Date(),
      });

      // When: dismissOnboarding is called
      const result = await dismissOnboarding({ siteId: 1 });

      // Then: should return success
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should return error response on failure', async () => {
      // Given: database error
      (prisma.siteSetting.upsert as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database error')
      );

      // When: dismissOnboarding is called
      const result = await dismissOnboarding({ siteId: 1 });

      // Then: should return error
      expect(result).toEqual({
        ok: false,
        error: expect.stringContaining('Database error'),
      });
    });
  });
});
