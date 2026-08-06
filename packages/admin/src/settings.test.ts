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
  getEmailQueueSettings,
  updateEmailQueueSettings,
  getSeoSettings,
  updateSeoSettings,
  getAdvancedRoutingSettings,
  updateAdvancedRoutingSettings,
  getAdvancedLocalizationSettings,
  updateAdvancedLocalizationSettings,
  getAdvancedPerformanceSettings,
  updateAdvancedPerformanceSettings,
  getAsyncSettings,
  updateAsyncSettings,
  getSitelockSettings,
  updateSitelockSettings,
  getPollConfig,
  updatePollConfig,
  getTagSettings,
  updateTagSettings,
  getCommunicationSettings,
  updateCommunicationSettings,
  getDebugSettings,
  updateDebugSettings,
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
          // Intentionally invalid value to verify Zod rejects it at runtime.
          downloadPermission: 'invalid_permission',
          pointDeduction: 0,
          hotlinkProtection: true,
        } as unknown as Parameters<typeof updateFileDownloadSettings>[0],
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// Email Queue Settings — REQ-ADMIN2-112
// ---------------------------------------------------------------------------

describe('getEmailQueueSettings — REQ-ADMIN2-112', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default queue settings', async () => {
    const result = await getEmailQueueSettings({ prisma: mockPrisma });

    expect(result.queueMode).toBe('immediate');
    expect(result.batchSize).toBe(50);
  });
});

describe('updateEmailQueueSettings — REQ-ADMIN2-112', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update queue settings', async () => {
    const result = await updateEmailQueueSettings(
      {
        queueMode: 'queued',
        batchSize: 100,
      },
      { prisma: mockPrisma },
    );

    expect(result.queueMode).toBe('queued');
    expect(result.batchSize).toBe(100);
  });

  it('should reject batchSize > 1000 via Zod validation', async () => {
    await expect(
      updateEmailQueueSettings(
        {
          queueMode: 'immediate',
          batchSize: 2000, // Too large
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// SEO Settings — REQ-ADMIN2-118/119
// ---------------------------------------------------------------------------

describe('getSeoSettings — REQ-ADMIN2-118', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default SEO settings', async () => {
    const result = await getSeoSettings({ prisma: mockPrisma });

    expect(result.defaultMetaTitle).toBe('');
    expect(result.defaultMetaDescription).toBe('');
    expect(result.canonicalUrlPolicy).toBe('none');
    expect(result.sitemapEnabled).toBe(false);
  });
});

describe('updateSeoSettings — REQ-ADMIN2-118', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update SEO settings', async () => {
    const result = await updateSeoSettings(
      {
        defaultMetaTitle: 'My Site',
        defaultMetaDescription: 'Description',
        canonicalUrlPolicy: 'default',
        sitemapEnabled: true,
      },
      { prisma: mockPrisma },
    );

    expect(result.defaultMetaTitle).toBe('My Site');
    expect(result.canonicalUrlPolicy).toBe('default');
    expect(result.sitemapEnabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Advanced Routing Settings — REQ-ADMIN2-116
// ---------------------------------------------------------------------------

describe('getAdvancedRoutingSettings — REQ-ADMIN2-116', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default routing settings', async () => {
    const result = await getAdvancedRoutingSettings({ prisma: mockPrisma });

    expect(result.siteTimezone).toBe('Asia/Seoul');
    expect(result.defaultLanguage).toBe('ko');
    expect(result.cacheDriver).toBe('file');
  });
});

describe('updateAdvancedRoutingSettings — REQ-ADMIN2-116', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update routing settings', async () => {
    const result = await updateAdvancedRoutingSettings(
      {
        siteTimezone: 'America/New_York',
        defaultLanguage: 'en',
        cacheDriver: 'redis',
      },
      { prisma: mockPrisma },
    );

    expect(result.siteTimezone).toBe('America/New_York');
    expect(result.cacheDriver).toBe('redis');
  });
});

// ---------------------------------------------------------------------------
// Advanced Localization Settings — REQ-ADMIN2-157
// ---------------------------------------------------------------------------

describe('getAdvancedLocalizationSettings — REQ-ADMIN2-157', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default localization settings', async () => {
    const result = await getAdvancedLocalizationSettings({ prisma: mockPrisma });

    expect(result.shortUrlPolicy).toBe('disabled');
    expect(result.mobileViewEnabled).toBe(true);
    expect(result.supportedLanguages).toEqual(['ko']);
  });
});

describe('updateAdvancedLocalizationSettings — REQ-ADMIN2-157', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update localization settings', async () => {
    const result = await updateAdvancedLocalizationSettings(
      {
        shortUrlPolicy: 'xe_compat',
        mobileViewEnabled: false,
        tabletAsMobile: false,
        autoLanguageSelection: false,
        supportedLanguages: ['ko', 'en', 'ja'],
        defaultLanguage: 'ko',
        mobileViewport: 'width=device-width, initial-scale=1',
      },
      { prisma: mockPrisma },
    );

    expect(result.shortUrlPolicy).toBe('xe_compat');
    expect(result.mobileViewEnabled).toBe(false);
    expect(result.supportedLanguages).toEqual(['ko', 'en', 'ja']);
  });
});

// ---------------------------------------------------------------------------
// Advanced Performance Settings — REQ-ADMIN2-158
// ---------------------------------------------------------------------------

describe('getAdvancedPerformanceSettings — REQ-ADMIN2-158', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default performance settings', async () => {
    const result = await getAdvancedPerformanceSettings({ prisma: mockPrisma });

    expect(result.sessionDbUse).toBe(false);
    expect(result.cacheEnabled).toBe(true);
    expect(result.cacheDefaultTtl).toBe(3600);
    expect(result.jqueryVersion).toBe('3.7.1');
  });
});

describe('updateAdvancedPerformanceSettings — REQ-ADMIN2-158', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update performance settings', async () => {
    const result = await updateAdvancedPerformanceSettings(
      {
        sessionDbUse: true,
        sessionDelayStart: false,
        templateCacheDelay: false,
        thumbnailTarget: 'attached',
        thumbnailMethod: 'gd',
        cacheEnabled: false,
        cacheDefaultTtl: 3600,
        cacheDeleteMethod: 'folder',
        cacheControlOptions: [],
        adminLayout: 'admin',
        jsCompressionPolicy: 'none',
        jsMergePolicy: 'none',
        cssCompressionPolicy: 'none',
        cssMergePolicy: 'none',
        jqueryVersion: '2.2.4',
      },
      { prisma: mockPrisma },
    );

    expect(result.sessionDbUse).toBe(true);
    expect(result.cacheEnabled).toBe(false);
    expect(result.jqueryVersion).toBe('2.2.4');
  });
});

// ---------------------------------------------------------------------------
// Async Task Settings — REQ-ADMIN2-154
// ---------------------------------------------------------------------------

describe('getAsyncSettings — REQ-ADMIN2-154', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default async settings', async () => {
    const result = await getAsyncSettings({ prisma: mockPrisma });

    expect(result.enabled).toBe(false);
    expect(result.driver).toBe('none');
    expect(result.intervalMinutes).toBe(5);
  });
});

describe('updateAsyncSettings — REQ-ADMIN2-154', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update async settings and generate webcron key', async () => {
    const result = await updateAsyncSettings(
      {
        enabled: true,
        driver: 'db',
        webcronShowError: false,
        intervalMinutes: 10,
        processCount: 2,
      },
      { prisma: mockPrisma },
    );

    expect(result.enabled).toBe(true);
    expect(result.driver).toBe('db');
    expect(result.webcronKey).toBeDefined();
    expect(result.webcronKey?.length).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Site Lock Settings — REQ-ADMIN2-155
// ---------------------------------------------------------------------------

describe('getSitelockSettings — REQ-ADMIN2-155', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default sitelock settings', async () => {
    const result = await getSitelockSettings({ prisma: mockPrisma });

    expect(result.locked).toBe(false);
    expect(result.allowedIpList).toEqual([]);
  });
});

describe('updateSitelockSettings — REQ-ADMIN2-155', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update sitelock settings', async () => {
    const result = await updateSitelockSettings(
      {
        locked: true,
        message: 'Site under maintenance',
        allowedIpList: ['192.168.1.1'],
      },
      { prisma: mockPrisma, currentIp: undefined },
    );

    expect(result.locked).toBe(true);
    expect(result.message).toBe('Site under maintenance');
  });

  it('should auto-include current admin IP when locking site', async () => {
    const result = await updateSitelockSettings(
      {
        locked: true,
        allowedIpList: ['192.168.1.1'],
      },
      { prisma: mockPrisma, currentIp: '10.0.0.1' },
    );

    expect(result.allowedIpList).toContain('10.0.0.1');
  });
});

describe('getPollConfig — REQ-ADMIN2-086', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default poll config when not configured', async () => {
    const result = await getPollConfig({ prisma: mockPrisma });

    expect(result.allowGuestVote).toBe(false);
    expect(result.duplicateVotePolicy).toBe('by-member');
  });
});

describe('updatePollConfig — REQ-ADMIN2-086', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update poll config', async () => {
    const result = await updatePollConfig(
      { allowGuestVote: true, duplicateVotePolicy: 'by-ip' },
      { prisma: mockPrisma },
    );

    expect(result.allowGuestVote).toBe(true);
    expect(result.duplicateVotePolicy).toBe('by-ip');
  });

  it('should reject an invalid duplicateVotePolicy value', async () => {
    await expect(
      updatePollConfig(
        { allowGuestVote: false, duplicateVotePolicy: 'invalid-policy' as never },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// Tag Settings — SPEC-ADMIN-002 Slice 3B, REQ-ADMIN2-087/156
// ---------------------------------------------------------------------------

describe('getTagSettings — REQ-ADMIN2-087/156', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default tag settings when not configured', async () => {
    const result = await getTagSettings({ prisma: mockPrisma });

    expect(result.cloudDisplayCount).toBe(50);
    expect(result.sortBy).toBe('frequency');
    expect(result.delimiters).toEqual(['comma']);
  });
});

describe('updateTagSettings — REQ-ADMIN2-087/156', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update tag settings (cloud count, sort, multiple delimiters)', async () => {
    const result = await updateTagSettings(
      { cloudDisplayCount: 100, sortBy: 'name', delimiters: ['comma', 'hash'] },
      { prisma: mockPrisma },
    );

    expect(result.cloudDisplayCount).toBe(100);
    expect(result.sortBy).toBe('name');
    expect(result.delimiters).toEqual(['comma', 'hash']);
  });

  it('should reject an empty delimiters array (at least one method required)', async () => {
    await expect(
      updateTagSettings(
        { cloudDisplayCount: 50, sortBy: 'frequency', delimiters: [] },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject an invalid sortBy value', async () => {
    await expect(
      updateTagSettings(
        { cloudDisplayCount: 50, sortBy: 'invalid-sort' as never, delimiters: ['comma'] },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject cloudDisplayCount out of range', async () => {
    await expect(
      updateTagSettings(
        { cloudDisplayCount: 0, sortBy: 'frequency', delimiters: ['comma'] },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// Communication Settings Tests (REQ-ADMIN2-143)
// ---------------------------------------------------------------------------

describe('getCommunicationSettings', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default communication settings when not configured', async () => {
    const result = await getCommunicationSettings({ prisma: mockPrisma });

    expect(result.enabled).toBe(false);
    expect(result.inboxLimit).toBe(100);
  });

  it('should return stored communication settings', async () => {
    // getOrCreateSiteSetting은 upsert로 직접 조회+생성한다 (경쟁 조건 방지).
    // update: {} 는 필드를 바꾸지 않으므로, 기존 행이 있으면 그 값을 그대로 반환한다.
    const settings = new Map();
    settings.set('communication', { enabled: true, inboxLimit: 50 });
    (mockPrisma as any).siteSetting.upsert = async ({ where }: any) => {
      const key = where?.siteId_key?.key;
      const value = settings.get(key) ?? {};
      return { id: 1, siteId: 1, key, value };
    };

    const result = await getCommunicationSettings({ prisma: mockPrisma });

    expect(result.enabled).toBe(true);
    expect(result.inboxLimit).toBe(50);
  });
});

describe('updateCommunicationSettings', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update communication settings successfully', async () => {
    const result = await updateCommunicationSettings(
      { enabled: true, inboxLimit: 200 },
      { prisma: mockPrisma },
    );

    expect(result.enabled).toBe(true);
    expect(result.inboxLimit).toBe(200);
  });

  it('should reject inboxLimit below minimum', async () => {
    await expect(
      updateCommunicationSettings(
        { enabled: true, inboxLimit: 0 },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject inboxLimit above maximum', async () => {
    await expect(
      updateCommunicationSettings(
        { enabled: true, inboxLimit: 10001 },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject negative inboxLimit', async () => {
    await expect(
      updateCommunicationSettings(
        { enabled: true, inboxLimit: -10 },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });
});

// ---------------------------------------------------------------------------
// Debug Settings Tests (REQ-ADMIN2-117/159/160)
// ---------------------------------------------------------------------------

describe('getDebugSettings — REQ-ADMIN2-117/159/160', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should return default debug settings when not configured', async () => {
    const result = await getDebugSettings({ prisma: mockPrisma });

    expect(result.enabled).toBe(false);
    expect(result.slowQueryThreshold).toBe(1.0);
    expect(result.slowTriggerThreshold).toBe(1.0);
    expect(result.slowWidgetThreshold).toBe(1.0);
    expect(result.slowExternalThreshold).toBe(1.0);
    expect(result.displayMethods).toEqual(['html_comment']);
    expect(result.displayTarget).toBe('admin_only');
    expect(result.allowedIps).toEqual([]);
    expect(result.addQueryComment).toBe(false);
    expect(result.showFullCallStack).toBe(false);
    expect(result.deduplicateErrors).toBe(true);
    expect(result.errorLogLevel).toBe('critical_only');
  });

  it('should return stored debug settings', async () => {
    const settings = new Map();
    settings.set('debug', {
      enabled: true,
      slowQueryThreshold: 0.5,
      slowTriggerThreshold: 2.0,
      slowWidgetThreshold: 1.5,
      slowExternalThreshold: 3.0,
      displayMethods: ['file_log', 'screen_panel'],
      contentTypes: ['error', 'slow_query', 'slow_trigger'],
      logFilePath: '/var/log/rhymix/debug.log',
      displayTarget: 'allowed_ips',
      allowedIps: ['192.168.1.100', '10.0.0.1'],
      addQueryComment: true,
      showFullCallStack: true,
      deduplicateErrors: false,
      errorLogLevel: 'all_errors_warnings',
    });
    // getOrCreateSiteSetting은 upsert로 직접 조회+생성한다 (경쟁 조건 방지).
    (mockPrisma as any).siteSetting.upsert = async ({ where }: any) => {
      const key = where?.siteId_key?.key;
      const value = settings.get(key) ?? {};
      return { id: 1, siteId: 1, key, value };
    };

    const result = await getDebugSettings({ prisma: mockPrisma });

    expect(result.enabled).toBe(true);
    expect(result.slowQueryThreshold).toBe(0.5);
    expect(result.displayMethods).toEqual(['file_log', 'screen_panel']);
    expect(result.logFilePath).toBe('/var/log/rhymix/debug.log');
    expect(result.displayTarget).toBe('allowed_ips');
    expect(result.allowedIps).toEqual(['192.168.1.100', '10.0.0.1']);
  });
});

describe('updateDebugSettings — REQ-ADMIN2-117/159/160', () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('should update debug settings successfully', async () => {
    const result = await updateDebugSettings(
      {
        enabled: true,
        slowQueryThreshold: 0.5,
        slowTriggerThreshold: 1.0,
        slowWidgetThreshold: 1.5,
        slowExternalThreshold: 2.0,
        displayMethods: ['html_comment', 'file_log'],
        contentTypes: ['error', 'slow_query', 'slow_trigger'],
        logFilePath: '/var/log/rhymix/debug_{date}.log',
        displayTarget: 'admin_only',
        allowedIps: ['127.0.0.1'],
        addQueryComment: true,
        showFullCallStack: true,
        deduplicateErrors: false,
        errorLogLevel: 'all_errors_warnings',
      },
      { prisma: mockPrisma },
    );

    expect(result.enabled).toBe(true);
    expect(result.slowQueryThreshold).toBe(0.5);
    expect(result.displayMethods).toEqual(['html_comment', 'file_log']);
    expect(result.logFilePath).toBe('/var/log/rhymix/debug_{date}.log');
    expect(result.addQueryComment).toBe(true);
    expect(result.showFullCallStack).toBe(true);
  });

  it('should reject negative threshold values', async () => {
    await expect(
      updateDebugSettings(
        {
          enabled: true,
          slowQueryThreshold: -1.0,
          slowTriggerThreshold: 1.0,
          slowWidgetThreshold: 1.0,
          slowExternalThreshold: 1.0,
          displayMethods: ['html_comment'],
          contentTypes: ['error'],
          displayTarget: 'admin_only',
          allowedIps: [],
          addQueryComment: false,
          showFullCallStack: false,
          deduplicateErrors: true,
          errorLogLevel: 'critical_only',
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject empty displayMethods array', async () => {
    await expect(
      updateDebugSettings(
        {
          enabled: true,
          slowQueryThreshold: 1.0,
          slowTriggerThreshold: 1.0,
          slowWidgetThreshold: 1.0,
          slowExternalThreshold: 1.0,
          displayMethods: [],
          contentTypes: ['error'],
          displayTarget: 'admin_only',
          allowedIps: [],
          addQueryComment: false,
          showFullCallStack: false,
          deduplicateErrors: true,
          errorLogLevel: 'critical_only',
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject invalid displayTarget value', async () => {
    await expect(
      updateDebugSettings(
        {
          enabled: true,
          slowQueryThreshold: 1.0,
          slowTriggerThreshold: 1.0,
          slowWidgetThreshold: 1.0,
          slowExternalThreshold: 1.0,
          displayMethods: ['html_comment'],
          contentTypes: ['error'],
          displayTarget: 'invalid_target' as never,
          allowedIps: [],
          addQueryComment: false,
          showFullCallStack: false,
          deduplicateErrors: true,
          errorLogLevel: 'critical_only',
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should reject invalid errorLogLevel value', async () => {
    await expect(
      updateDebugSettings(
        {
          enabled: true,
          slowQueryThreshold: 1.0,
          slowTriggerThreshold: 1.0,
          slowWidgetThreshold: 1.0,
          slowExternalThreshold: 1.0,
          displayMethods: ['html_comment'],
          contentTypes: ['error'],
          displayTarget: 'admin_only',
          allowedIps: [],
          addQueryComment: false,
          showFullCallStack: false,
          deduplicateErrors: true,
          errorLogLevel: 'invalid_level' as never,
        },
        { prisma: mockPrisma },
      ),
    ).rejects.toThrow(ZodError);
  });

  it('should accept all valid display methods', async () => {
    const result = await updateDebugSettings(
      {
        enabled: true,
        slowQueryThreshold: 1.0,
        slowTriggerThreshold: 1.0,
        slowWidgetThreshold: 1.0,
        slowExternalThreshold: 1.0,
        displayMethods: ['html_comment', 'screen_panel', 'file_log'],
        contentTypes: ['error', 'slow_query', 'slow_trigger', 'slow_widget', 'slow_external'],
        displayTarget: 'all',
        allowedIps: [],
        addQueryComment: false,
        showFullCallStack: false,
        deduplicateErrors: true,
        errorLogLevel: 'critical_only',
      },
      { prisma: mockPrisma },
    );

    expect(result.displayMethods).toEqual(['html_comment', 'screen_panel', 'file_log']);
    expect(result.displayTarget).toBe('all');
  });
});
