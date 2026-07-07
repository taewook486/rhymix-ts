/**
 * public.captcha tRPC router tests — SPEC-CAPTCHA-001 REQ-CAPTCHA-003, REQ-CAPTCHA-005
 *
 * Tests for public captcha config query:
 * - getConfig: 클라이언트용 CAPTCHA 설정 (secret 제외)
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

describe('public.captcha router', () => {
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

  describe('getConfig', () => {
    it('should return captcha config without secret key', async () => {
      const mockPrisma = {
        site: { findFirst: vi.fn(async () => ({ id: 1 })) },
        siteSetting: {
          findUnique: vi.fn(async ({ where }: any) => {
            const key = where.siteId_key.key;
            if (key === 'security.captcha.signup.enabled') {
              return { value: true };
            }
            if (key === 'security.captcha.login.enabled') {
              return { value: true };
            }
            if (key === 'security.captcha.turnstile.siteKey') {
              return { value: '0xTestSiteKey123' };
            }
            // secret key should exist in DB but must NOT be returned
            if (key === 'security.captcha.turnstile.secretKey') {
              return { value: '0xTestSecretKey456' };
            }
            return null;
          }),
        },
      };

      const { publicCaptchaRouter } = await import('./captcha');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicCaptchaRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma } as any);

      const result = await caller.getConfig();

      expect(result).toEqual({
        signupEnabled: true,
        loginEnabled: true,
        siteKey: '0xTestSiteKey123',
      });
      // Verify secret key is NOT in response
      expect(result).not.toHaveProperty('secretKey');
      expect(result).not.toHaveProperty('turnstileSecretKey');
    });

    it('should return default values when settings do not exist', async () => {
      const mockPrisma = {
        site: { findFirst: vi.fn(async () => ({ id: 1 })) },
        siteSetting: {
          findUnique: vi.fn(async () => null),
        },
      };

      const { publicCaptchaRouter } = await import('./captcha');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicCaptchaRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma } as any);

      const result = await caller.getConfig();

      expect(result).toEqual({
        signupEnabled: false,
        loginEnabled: false,
        siteKey: '',
      });
    });

    it('should return empty defaults when no site exists', async () => {
      const mockPrisma = {
        site: { findFirst: vi.fn(async () => null) },
        siteSetting: { findUnique: vi.fn(async () => null) },
      };

      const { publicCaptchaRouter } = await import('./captcha');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicCaptchaRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma, siteId: undefined } as any);

      const result = await caller.getConfig();

      expect(result).toEqual({
        signupEnabled: false,
        loginEnabled: false,
        siteKey: '',
      });
    });

    it('should use siteId from context when available', async () => {
      const mockPrisma = {
        siteSetting: {
          findUnique: vi.fn(async ({ where }: any) => {
            expect(where.siteId_key.siteId).toBe(5);
            return null;
          }),
        },
      };

      const { publicCaptchaRouter } = await import('./captcha');
      const { createCallerFactory } = await import('../../trpc');
      const createCaller = createCallerFactory(publicCaptchaRouter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caller = createCaller({ ...mockCtx, prisma: mockPrisma, siteId: 5 } as any);

      const result = await caller.getConfig();

      expect(result).toEqual({
        signupEnabled: false,
        loginEnabled: false,
        siteKey: '',
      });
    });
  });
});
