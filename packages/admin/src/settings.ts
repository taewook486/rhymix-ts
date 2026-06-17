/**
 * settings.ts — SPEC-ADMIN-002 Slice 1F (알림 + 보안 설정)
 *
 * Admin settings management:
 * - getNotificationSettings / updateNotificationSettings: SMTP + email sender settings
 * - getSecuritySettings / updateSecuritySettings: Password policy, session, lockout
 *
 * @MX:ANCHOR [AUTO]: Admin settings CRUD의 단일 진입점.
 * @MX:REASON: SiteSetting 기반 설정의 일관성과 검증 로직의 중앙화 —
 *             fan_in >= 2 (admin tRPC, future import/export tools).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-110, REQ-ADMIN2-113, REQ-ADMIN2-114
 */
import type { PrismaClient, SiteSetting, Prisma } from '@prisma/client';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 에러
// ---------------------------------------------------------------------------

export class InvalidSecuritySettingError extends Error {
  readonly code = 'INVALID_SECURITY_SETTING';
  constructor(field: string, value: unknown) {
    super(`Invalid security setting for ${field}: ${JSON.stringify(value)}`);
    this.name = 'InvalidSecuritySettingError';
  }
}

export class SiteNotFoundError extends Error {
  readonly code = 'SITE_NOT_FOUND';
  constructor() {
    super('Site not found');
    this.name = 'SiteNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// 스키마
// ---------------------------------------------------------------------------

const NotificationSettingsSchema = z.object({
  // Email sender settings
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email(),
  // SMTP settings
  smtpHost: z.string().min(1).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFrom: z.string().email().optional(),
});

const SecuritySettingsSchema = z.object({
  // Password policy
  passwordMinLength: z.number().int().min(4).max(50),
  passwordRequireComplex: z.boolean().default(false),
  // Session settings
  sessionLifetime: z.number().int().min(60).max(31536000), // 1분 ~ 1년 (초)
  // Login lockout
  loginMaxAttempts: z.number().int().min(1).max(10),
  loginLockoutTime: z.number().int().min(60).max(86400), // 1분 ~ 1일 (초)
});

// ---------------------------------------------------------------------------
// Actor 타입
// ---------------------------------------------------------------------------

interface Actor {
  userId: number;
  userGroupSrl: number;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * SiteSetting을 가져오거나 생성한다.
 */
async function getOrCreateSiteSetting(
  prisma: PrismaClient,
  key: string,
): Promise<SiteSetting> {
  const site = await prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new SiteNotFoundError();
  }

  let setting = await prisma.siteSetting.findUnique({
    where: { siteId_key: { siteId: site.id, key } },
  });

  if (!setting) {
    setting = await prisma.siteSetting.create({
      data: { siteId: site.id, key, value: {} },
    });
  }

  return setting;
}

/**
 * SiteSetting을 업데이트한다.
 */
async function updateSiteSetting(
  prisma: PrismaClient,
  key: string,
  value: Record<string, unknown>,
): Promise<SiteSetting> {
  const site = await prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new SiteNotFoundError();
  }

  const jsonValue = value as Prisma.InputJsonValue;
  return prisma.siteSetting.upsert({
    where: { siteId_key: { siteId: site.id, key } },
    create: { siteId: site.id, key, value: jsonValue },
    update: { value: jsonValue },
  });
}

// ---------------------------------------------------------------------------
// 알림 설정 (Notification Settings)
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
}

/**
 * 알림 설정을 조회한다.
 */
export async function getNotificationSettings(
  ctx: { prisma: PrismaClient },
): Promise<NotificationSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'notification');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    senderName: (value.senderName as string) || '관리자',
    senderEmail: (value.senderEmail as string) || 'noreply@example.com',
    smtpHost: value.smtpHost as string | undefined,
    smtpPort: value.smtpPort as number | undefined,
    smtpSecure: value.smtpSecure as boolean | undefined,
    smtpUser: value.smtpUser as string | undefined,
    smtpPassword: value.smtpPassword as string | undefined,
    smtpFrom: value.smtpFrom as string | undefined,
  };
}

/**
 * 알림 설정을 업데이트한다.
 */
export async function updateNotificationSettings(
  input: NotificationSettings,
  ctx: { prisma: PrismaClient },
): Promise<NotificationSettings> {
  // 검증
  const validated = NotificationSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'notification', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 보안 설정 (Security Settings)
// ---------------------------------------------------------------------------

export interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireComplex: boolean;
  sessionLifetime: number;
  loginMaxAttempts: number;
  loginLockoutTime: number;
}

/**
 * 보안 설정을 조회한다.
 */
export async function getSecuritySettings(
  ctx: { prisma: PrismaClient },
): Promise<SecuritySettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'security');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    passwordMinLength: (value.passwordMinLength as number) || 8,
    passwordRequireComplex: (value.passwordRequireComplex as boolean) || false,
    sessionLifetime: (value.sessionLifetime as number) || 3600, // 1시간
    loginMaxAttempts: (value.loginMaxAttempts as number) || 5,
    loginLockoutTime: (value.loginLockoutTime as number) || 1800, // 30분
  };
}

/**
 * 보안 설정을 업데이트한다.
 *
 * REQ-ADMIN2-114 (Unwanted): 보안 설정이 인증을 우회할 수 있는 값은 거부한다.
 * Zod 스키마 검증을 통해 최소값 보장 (sessionLifetime >= 60초, passwordMinLength >= 4).
 */
export async function updateSecuritySettings(
  input: SecuritySettings,
  ctx: { prisma: PrismaClient },
): Promise<SecuritySettings> {
  // Zod 검증 - REQ-ADMIN2-114 최소값 보장
  const validated = SecuritySettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'security', validated);

  return validated;
}
