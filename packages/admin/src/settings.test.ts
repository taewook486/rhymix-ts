/**
 * settings.test.ts — SPEC-ADMIN-002 Slice 1F
 *
 * Admin settings tests (notification + security).
 * TDD RED-GREEN-REFACTOR cycle.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getSecuritySettings,
  updateSecuritySettings,
  SiteNotFoundError,
} from './settings';
import type { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';

// Mock Prisma client
function createMockPrisma() {
  let settings: Map<string, any> = new Map([
    ['notification', { senderName: '관리자', senderEmail: 'noreply@example.com' }],
    ['security', { passwordMinLength: 8, sessionLifetime: 3600 }],
  ]);

  return {
    site: {
      findFirst: async () => ({ id: 1 }),
    },
    siteSetting: {
      findUnique: async ({ where }: any) => {
        const key = where?.siteId_key?.key;
        const value = settings.get(key);
        if (value) {
          return { id: 1, siteId: 1, key, value };
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        const key = where?.key;
        const value = settings.get(key);
        if (value) {
          return { id: 1, siteId: 1, key, value };
        }
        return null;
      },
      create: async ({ data }: any) => {
        settings.set(data.key, data.value);
        return { id: 1, ...data };
      },
      upsert: async ({ where, create, update }: any) => {
        const key = where?.siteId_key?.key || create?.key;
        settings.set(key, update || create?.value);
        return { id: 1, siteId: 1, key, value: update || create?.value };
      },
    },
  } as unknown as PrismaClient;
}

describe('getNotificationSettings', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default notification settings', async () => {
    const result = await getNotificationSettings({ prisma: mockPrisma });

    expect(result.senderName).toBe('관리자');
    expect(result.senderEmail).toBe('noreply@example.com');
  });

  it('should return empty SMTP settings when not configured', async () => {
    const result = await getNotificationSettings({ prisma: mockPrisma });

    expect(result.smtpHost).toBeUndefined();
    expect(result.smtpPort).toBeUndefined();
  });
});

describe('updateNotificationSettings', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update notification settings', async () => {
    const result = await updateNotificationSettings(
      {
        senderName: 'Test Sender',
        senderEmail: 'test@example.com',
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpSecure: true,
      },
      { prisma: mockPrisma },
    );

    expect(result.senderName).toBe('Test Sender');
    expect(result.senderEmail).toBe('test@example.com');
    expect(result.smtpHost).toBe('smtp.example.com');
  });
});

describe('getSecuritySettings', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default security settings', async () => {
    const result = await getSecuritySettings({ prisma: mockPrisma });

    expect(result.passwordMinLength).toBe(8);
    expect(result.sessionLifetime).toBe(3600);
    expect(result.loginMaxAttempts).toBe(5);
    expect(result.loginLockoutTime).toBe(1800);
  });
});

describe('updateSecuritySettings', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update security settings', async () => {
    const result = await updateSecuritySettings(
      {
        passwordMinLength: 12,
        passwordRequireComplex: true,
        sessionLifetime: 7200,
        loginMaxAttempts: 3,
        loginLockoutTime: 900,
      },
      { prisma: mockPrisma },
    );

    expect(result.passwordMinLength).toBe(12);
    expect(result.passwordRequireComplex).toBe(true);
  });

  it('should reject sessionLifetime < 60 seconds via Zod validation', async () => {
    await expect(
      updateSecuritySettings(
        {
          passwordMinLength: 8,
          passwordRequireComplex: false,
          sessionLifetime: 30, // Too short - violates Zod schema
          loginMaxAttempts: 5,
          loginLockoutTime: 1800,
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject passwordMinLength < 4 via Zod validation', async () => {
    await expect(
      updateSecuritySettings(
        {
          passwordMinLength: 3, // Too short - violates Zod schema
          passwordRequireComplex: false,
          sessionLifetime: 3600,
          loginMaxAttempts: 5,
          loginLockoutTime: 1800,
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});
