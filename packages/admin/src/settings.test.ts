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
  getFileUploadSettings,
  updateFileUploadSettings,
  getFileDownloadSettings,
  updateFileDownloadSettings,
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

// ---------------------------------------------------------------------------
// File Upload Settings — REQ-ADMIN2-080
// ---------------------------------------------------------------------------

describe('getFileUploadSettings — REQ-ADMIN2-080', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default upload settings', async () => {
    const result = await getFileUploadSettings({ prisma: mockPrisma });

    expect(result.allowedExtensions).toEqual(['jpg', 'png', 'gif', 'jpeg', 'webp']);
    expect(result.maxFileSize).toBe(10485760); // 10MB
    expect(result.maxAttachmentsPerPost).toBe(10);
    expect(result.imageAutoResize).toEqual({ width: 1920, height: 1080 });
  });
});

describe('updateFileUploadSettings — REQ-ADMIN2-080', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update upload settings', async () => {
    const result = await updateFileUploadSettings(
      {
        allowedExtensions: ['jpg', 'png', 'gif', 'webp'],
        maxFileSize: 20971520, // 20MB
        maxAttachmentsPerPost: 20,
        imageAutoResize: { width: 2560, height: 1440 },
      },
      { prisma: mockPrisma },
    );

    expect(result.allowedExtensions).toEqual(['jpg', 'png', 'gif', 'webp']);
    expect(result.maxFileSize).toBe(20971520);
  });

  it('should reject maxFileSize > 1GB via Zod validation', async () => {
    await expect(
      updateFileUploadSettings(
        {
          allowedExtensions: ['jpg'],
          maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB - invalid
          maxAttachmentsPerPost: 10,
          imageAutoResize: { width: 1920, height: 1080 },
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// File Download Settings — REQ-ADMIN2-081
// ---------------------------------------------------------------------------

describe('getFileDownloadSettings — REQ-ADMIN2-081', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default download settings', async () => {
    const result = await getFileDownloadSettings({ prisma: mockPrisma });

    expect(result.downloadPermission).toBe('unlimited'); // 무제한
    expect(result.hotlinkProtection).toBe(false);
  });
});

describe('updateFileDownloadSettings — REQ-ADMIN2-081', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update download settings', async () => {
    const result = await updateFileDownloadSettings(
      {
        downloadPermission: 'member_only',
        pointDeduction: 10,
        hotlinkProtection: true,
      },
      { prisma: mockPrisma },
    );

    expect(result.downloadPermission).toBe('member_only');
    expect(result.pointDeduction).toBe(10);
    expect(result.hotlinkProtection).toBe(true);
  });

  it('should reject invalid downloadPermission via Zod validation', async () => {
    await expect(
      updateFileDownloadSettings(
        {
          downloadPermission: 'invalid_permission',
          pointDeduction: 0,
          hotlinkProtection: true,
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});
