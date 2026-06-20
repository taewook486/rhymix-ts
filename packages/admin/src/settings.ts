/**
 * settings.ts — SPEC-ADMIN-002 Slice 1F + Slice 2D
 *
 * Admin settings management:
 * - Slice 1F: notification (SMTP + email sender), security (password, session, lockout)
 * - Slice 2D: email queue, SEO, advanced (routing/localization/performance), async, sitelock
 *
 * @MX:ANCHOR [AUTO]: Admin settings CRUD의 단일 진입점.
 * @MX:REASON: SiteSetting 기반 설정의 일관성과 검증 로직의 중앙화 —
 *             fan_in >= 2 (admin tRPC, future import/export tools).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-110, REQ-ADMIN2-113, REQ-ADMIN2-114,
 *                   REQ-ADMIN2-112, REQ-ADMIN2-118/119, REQ-ADMIN2-116/157/158,
 *                   REQ-ADMIN2-154, REQ-ADMIN2-155
 */
import type { PrismaClient, SiteSetting, Prisma } from '@prisma/client';
import { z } from 'zod';
import { parseIpFilter } from './logs/ip-filter';

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

/**
 * Sitelock allowedIpList 에 잘못된 IP/CIDR 형식이 포함되었을 때 발생한다 (REQ-ADMIN2-155).
 * 호출자(tRPC router)는 이 에러를 BAD_REQUEST 로 매핑한다.
 */
export class InvalidSitelockIpError extends Error {
  readonly code = 'INVALID_SITELOCK_IP';
  constructor(ip: string, reason: string) {
    super(`Invalid IP address in sitelock allow list: ${ip} - ${reason}`);
    this.name = 'InvalidSitelockIpError';
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
 * 클라이언트로 반환되는 알림 설정. smtpPassword는 평문으로 절대 노출하지 않고
 * 저장 여부만 hasPassword 플래그로 전달한다.
 */
export type NotificationSettingsView = Omit<NotificationSettings, 'smtpPassword'> & {
  hasPassword: boolean;
};

/**
 * 알림 설정을 조회한다.
 *
 * @MX:NOTE [AUTO]: smtpPassword는 SSR/RSC 페이로드에 평문으로 노출되면 안 되므로
 * hasPassword(boolean)로만 저장 여부를 전달한다. 실제 비밀번호 값은 반환하지 않는다.
 */
export async function getNotificationSettings(
  ctx: { prisma: PrismaClient },
): Promise<NotificationSettingsView> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'notification');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  const smtpPassword = value.smtpPassword as string | undefined;
  return {
    senderName: (value.senderName as string) || '관리자',
    senderEmail: (value.senderEmail as string) || 'noreply@example.com',
    smtpHost: value.smtpHost as string | undefined,
    smtpPort: value.smtpPort as number | undefined,
    smtpSecure: value.smtpSecure as boolean | undefined,
    smtpUser: value.smtpUser as string | undefined,
    smtpFrom: value.smtpFrom as string | undefined,
    hasPassword: Boolean(smtpPassword && smtpPassword.length > 0),
  };
}

/**
 * 알림 설정을 업데이트한다.
 *
 * smtpPassword가 빈 문자열/undefined로 전달되면 기존에 저장된 비밀번호를 유지한다
 * ("blank means unchanged" semantic). 새 비밀번호를 저장하려면 비어있지 않은 값을
 * 전달해야 한다.
 */
export async function updateNotificationSettings(
  input: NotificationSettings,
  ctx: { prisma: PrismaClient },
): Promise<NotificationSettingsView> {
  // 검증
  const validated = NotificationSettingsSchema.parse(input);

  const existingSetting = await getOrCreateSiteSetting(ctx.prisma, 'notification');
  const existingValue = existingSetting.value as Record<string, unknown>;
  const existingPassword = existingValue.smtpPassword as string | undefined;

  const toPersist: NotificationSettings = {
    ...validated,
    smtpPassword: validated.smtpPassword ? validated.smtpPassword : existingPassword,
  };

  await updateSiteSetting(ctx.prisma, 'notification', toPersist as unknown as Record<string, unknown>);

  const { smtpPassword, ...rest } = toPersist;
  return {
    ...rest,
    hasPassword: Boolean(smtpPassword && smtpPassword.length > 0),
  };
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

// ---------------------------------------------------------------------------
// 파일 업로드 설정 (File Upload Settings) — REQ-ADMIN2-080
// ---------------------------------------------------------------------------

const FileUploadSettingsSchema = z.object({
  allowedExtensions: z.array(z.string()).min(1), // 최소 1개 이상의 확장자
  maxFileSize: z.number().int().min(1024).max(1073741824), // 1KB ~ 1GB (바이트)
  maxAttachmentsPerPost: z.number().int().min(1).max(100), // 1~100개
  imageAutoResize: z.object({
    width: z.number().int().min(100).max(4096),
    height: z.number().int().min(100).max(4096),
  }),
});

export interface FileUploadSettings {
  allowedExtensions: string[];
  maxFileSize: number;
  maxAttachmentsPerPost: number;
  imageAutoResize: { width: number; height: number };
}

/**
 * 파일 업로드 설정을 조회한다.
 *
 * REQ-ADMIN2-080: 허용 확장자, 최대 파일 크기, 게시물당 최대 첨부 수, 이미지 자동 리사이즈 치수.
 */
export async function getFileUploadSettings(
  ctx: { prisma: PrismaClient },
): Promise<FileUploadSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'fileUpload');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    allowedExtensions: (value.allowedExtensions as string[]) || ['jpg', 'png', 'gif', 'jpeg', 'webp'],
    maxFileSize: (value.maxFileSize as number) || 10485760, // 10MB
    maxAttachmentsPerPost: (value.maxAttachmentsPerPost as number) || 10,
    imageAutoResize: (value.imageAutoResize as { width: number; height: number }) || { width: 1920, height: 1080 },
  };
}

/**
 * 파일 업로드 설정을 업데이트한다.
 */
export async function updateFileUploadSettings(
  input: FileUploadSettings,
  ctx: { prisma: PrismaClient },
): Promise<FileUploadSettings> {
  // Zod 검증
  const validated = FileUploadSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'fileUpload', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 파일 다운로드 설정 (File Download Settings) — REQ-ADMIN2-081
// ---------------------------------------------------------------------------

const FileDownloadSettingsSchema = z.object({
  downloadPermission: z.enum(['unlimited', 'member_only', 'point_deduction']),
  pointDeduction: z.number().int().min(0).max(1000).optional(), // 0~1000포인트
  hotlinkProtection: z.boolean(),
});

export interface FileDownloadSettings {
  downloadPermission: 'unlimited' | 'member_only' | 'point_deduction';
  pointDeduction?: number;
  hotlinkProtection: boolean;
}

/**
 * 파일 다운로드 설정을 조회한다.
 *
 * REQ-ADMIN2-081: 다운로드 권한 정책 (회원만/포인트차감/무제한), 핫링크 보안 토글.
 */
export async function getFileDownloadSettings(
  ctx: { prisma: PrismaClient },
): Promise<FileDownloadSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'fileDownload');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    downloadPermission: (value.downloadPermission as FileDownloadSettings['downloadPermission']) || 'unlimited',
    pointDeduction: (value.pointDeduction as number | undefined),
    hotlinkProtection: (value.hotlinkProtection as boolean) || false,
  };
}

/**
 * 파일 다운로드 설정을 업데이트한다.
 */
export async function updateFileDownloadSettings(
  input: FileDownloadSettings,
  ctx: { prisma: PrismaClient },
): Promise<FileDownloadSettings> {
  // Zod 검증
  const validated = FileDownloadSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'fileDownload', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 디자인 설정 (Design Settings) — REQ-ADMIN2-053
// ---------------------------------------------------------------------------

const DesignSettingsSchema = z.object({
  memberSkinId: z.string().optional(),
  memberTemplateId: z.string().optional(),
});

export interface DesignSettings {
  memberSkinId?: string;
  memberTemplateId?: string;
}

/**
 * 디자인 설정을 조회한다.
 *
 * REQ-ADMIN2-053: 회원 영역 스킨/템플릿 선택.
 */
export async function getDesignSettings(
  ctx: { prisma: PrismaClient },
): Promise<DesignSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'member.design');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    memberSkinId: (value.memberSkinId as string) || '',
    memberTemplateId: (value.memberTemplateId as string) || '',
  };
}

/**
 * 디자인 설정을 업데이트한다.
 */
export async function updateDesignSettings(
  input: DesignSettings,
  ctx: { prisma: PrismaClient },
): Promise<DesignSettings> {
  // Zod 검증
  const validated = DesignSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'member.design', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 이메일 큐 설정 (Email Queue Settings) — REQ-ADMIN2-112
// ---------------------------------------------------------------------------

const EmailQueueSettingsSchema = z.object({
  queueMode: z.enum(['immediate', 'queued']), // 즉시 발송 / 큐 적재
  batchSize: z.number().int().min(1).max(1000).default(50), // 배치 크기
});

export interface EmailQueueSettings {
  queueMode: 'immediate' | 'queued';
  batchSize: number;
}

/**
 * 이메일 큐 설정을 조회한다.
 *
 * REQ-ADMIN2-112: 즉시 발송/큐 적재 모드와 배치 크기.
 */
export async function getEmailQueueSettings(
  ctx: { prisma: PrismaClient },
): Promise<EmailQueueSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'emailQueue');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    queueMode: (value.queueMode as EmailQueueSettings['queueMode']) || 'immediate',
    batchSize: (value.batchSize as number) || 50,
  };
}

/**
 * 이메일 큐 설정을 업데이트한다.
 */
export async function updateEmailQueueSettings(
  input: EmailQueueSettings,
  ctx: { prisma: PrismaClient },
): Promise<EmailQueueSettings> {
  // Zod 검증
  const validated = EmailQueueSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'emailQueue', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// SEO 설정 (SEO Settings) — REQ-ADMIN2-118/119
// ---------------------------------------------------------------------------

const SeoSettingsSchema = z.object({
  defaultMetaTitle: z.string().max(200).optional(),
  defaultMetaDescription: z.string().max(500).optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImageUrl: z.string().url().optional().or(z.literal('')),
  canonicalUrlPolicy: z.enum(['none', 'default', 'custom']).default('none'),
  sitemapEnabled: z.boolean().default(false),
});

export interface SeoSettings {
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  canonicalUrlPolicy: 'none' | 'default' | 'custom';
  sitemapEnabled: boolean;
}

/**
 * SEO 설정을 조회한다.
 *
 * REQ-ADMIN2-118: 메타 태그, Open Graph, canonical URL 정책.
 * REQ-ADMIN2-119: sitemap.xml 생성 활성화 여부.
 */
export async function getSeoSettings(
  ctx: { prisma: PrismaClient },
): Promise<SeoSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'seo');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    defaultMetaTitle: (value.defaultMetaTitle as string) || '',
    defaultMetaDescription: (value.defaultMetaDescription as string) || '',
    ogTitle: (value.ogTitle as string) || '',
    ogDescription: (value.ogDescription as string) || '',
    ogImageUrl: (value.ogImageUrl as string) || '',
    canonicalUrlPolicy: (value.canonicalUrlPolicy as SeoSettings['canonicalUrlPolicy']) || 'none',
    sitemapEnabled: (value.sitemapEnabled as boolean) || false,
  };
}

/**
 * SEO 설정을 업데이트한다.
 */
export async function updateSeoSettings(
  input: SeoSettings,
  ctx: { prisma: PrismaClient },
): Promise<SeoSettings> {
  // Zod 검증
  const validated = SeoSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'seo', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 고급 설정 - 라우팅/지역화 (Advanced Settings - Routing/Localization) — REQ-ADMIN2-116/157
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES = [
  'ko',
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
  'es',
  'fr',
  'de',
  'ru',
  'pt',
  'vi',
  'th',
  'id',
] as const;

const AdvancedRoutingSchema = z.object({
  siteTimezone: z.string().default('Asia/Seoul'),
  defaultLanguage: z.enum(SUPPORTED_LANGUAGES).default('ko'),
  cacheDriver: z.enum(['file', 'redis', 'memcached']).default('file'),
});

const AdvancedLocalizationSchema = z.object({
  shortUrlPolicy: z.enum(['disabled', 'xe_compat', 'all']).default('disabled'),
  mobileViewEnabled: z.boolean().default(true),
  tabletAsMobile: z.boolean().default(false),
  autoLanguageSelection: z.boolean().default(false),
  supportedLanguages: z.array(z.enum(SUPPORTED_LANGUAGES)).default(['ko']),
  defaultLanguage: z.enum(SUPPORTED_LANGUAGES).default('ko'),
  mobileViewport: z.string().default('width=device-width, initial-scale=1'),
});

export interface AdvancedRoutingSettings {
  siteTimezone: string;
  defaultLanguage: string;
  cacheDriver: 'file' | 'redis' | 'memcached';
}

export interface AdvancedLocalizationSettings {
  shortUrlPolicy: 'disabled' | 'xe_compat' | 'all';
  mobileViewEnabled: boolean;
  tabletAsMobile: boolean;
  autoLanguageSelection: boolean;
  supportedLanguages: string[];
  defaultLanguage: string;
  mobileViewport: string;
}

/**
 * 고급 설정(라우팅)을 조회한다.
 *
 * REQ-ADMIN2-116: 시간대, 기본 언어, 캐시 드라이버.
 */
export async function getAdvancedRoutingSettings(
  ctx: { prisma: PrismaClient },
): Promise<AdvancedRoutingSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'advanced.routing');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    siteTimezone: (value.siteTimezone as string) || 'Asia/Seoul',
    defaultLanguage: (value.defaultLanguage as string) || 'ko',
    cacheDriver: (value.cacheDriver as AdvancedRoutingSettings['cacheDriver']) || 'file',
  };
}

/**
 * 고급 설정(라우팅)을 업데이트한다.
 */
export async function updateAdvancedRoutingSettings(
  input: AdvancedRoutingSettings,
  ctx: { prisma: PrismaClient },
): Promise<AdvancedRoutingSettings> {
  // Zod 검증
  const validated = AdvancedRoutingSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'advanced.routing', validated);

  return validated;
}

/**
 * 고급 설정(지역화)을 조회한다.
 *
 * REQ-ADMIN2-157: 짧은 주소 정책, 모바일 뷰, 언어 설정, viewport.
 */
export async function getAdvancedLocalizationSettings(
  ctx: { prisma: PrismaClient },
): Promise<AdvancedLocalizationSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'advanced.localization');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    shortUrlPolicy: (value.shortUrlPolicy as AdvancedLocalizationSettings['shortUrlPolicy']) || 'disabled',
    mobileViewEnabled: (value.mobileViewEnabled as boolean) ?? true,
    tabletAsMobile: (value.tabletAsMobile as boolean) ?? false,
    autoLanguageSelection: (value.autoLanguageSelection as boolean) ?? false,
    supportedLanguages: (value.supportedLanguages as string[]) || ['ko'],
    defaultLanguage: (value.defaultLanguage as string) || 'ko',
    mobileViewport: (value.mobileViewport as string) || 'width=device-width, initial-scale=1',
  };
}

/**
 * 고급 설정(지역화)을 업데이트한다.
 */
export async function updateAdvancedLocalizationSettings(
  input: AdvancedLocalizationSettings,
  ctx: { prisma: PrismaClient },
): Promise<AdvancedLocalizationSettings> {
  // Zod 검증
  const validated = AdvancedLocalizationSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'advanced.localization', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 고급 설정 - 성능/캐시 (Advanced Settings - Performance/Cache) — REQ-ADMIN2-158
// ---------------------------------------------------------------------------

const AdvancedPerformanceSchema = z.object({
  sessionDbUse: z.boolean().default(false),
  sessionDelayStart: z.boolean().default(false),
  templateCacheDelay: z.boolean().default(false),
  thumbnailTarget: z.enum(['attached', 'all', 'none']).default('attached'),
  thumbnailMethod: z.enum(['gd', 'imagick', 'none']).default('gd'),
  cacheEnabled: z.boolean().default(true),
  cacheDefaultTtl: z.number().int().min(0).max(86400).default(3600),
  cacheDeleteMethod: z.enum(['folder', 'content']).default('folder'),
  cacheControlOptions: z.array(z.enum(['no-cache', 'no-store', 'must-revalidate'])).default([]),
  adminLayout: z.enum(['module', 'admin']).default('admin'),
  jsCompressionPolicy: z.enum(['none', 'common', 'all']).default('none'),
  jsMergePolicy: z.enum(['none', 'css', 'js', 'both']).default('none'),
  cssCompressionPolicy: z.enum(['none', 'common', 'all']).default('none'),
  cssMergePolicy: z.enum(['none', 'css', 'js', 'both']).default('none'),
  jqueryVersion: z.enum(['2.2.4', '3.7.1']).default('3.7.1'),
});

export interface AdvancedPerformanceSettings {
  sessionDbUse: boolean;
  sessionDelayStart: boolean;
  templateCacheDelay: boolean;
  thumbnailTarget: 'attached' | 'all' | 'none';
  thumbnailMethod: 'gd' | 'imagick' | 'none';
  cacheEnabled: boolean;
  cacheDefaultTtl: number;
  cacheDeleteMethod: 'folder' | 'content';
  cacheControlOptions: string[];
  adminLayout: 'module' | 'admin';
  jsCompressionPolicy: 'none' | 'common' | 'all';
  jsMergePolicy: 'none' | 'css' | 'js' | 'both';
  cssCompressionPolicy: 'none' | 'common' | 'all';
  cssMergePolicy: 'none' | 'css' | 'js' | 'both';
  jqueryVersion: '2.2.4' | '3.7.1';
}

/**
 * 고급 설정(성능/캐시)를 조회한다.
 *
 * REQ-ADMIN2-158: 세션, 썸네일, 캐시, HTTP Cache-Control, JS/CSS, jQuery.
 *
 * @MX:WARN [AUTO]: JS/CSS 압축·병합 정책은 UI에만 노출되며 실제 빌드 타임 번들링과의
 * 양립 여부는 Open Question Q5 미결 상태임. 실제 적용 로직 없이 값만 영속.
 */
export async function getAdvancedPerformanceSettings(
  ctx: { prisma: PrismaClient },
): Promise<AdvancedPerformanceSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'advanced.performance');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    sessionDbUse: (value.sessionDbUse as boolean) ?? false,
    sessionDelayStart: (value.sessionDelayStart as boolean) ?? false,
    templateCacheDelay: (value.templateCacheDelay as boolean) ?? false,
    thumbnailTarget: (value.thumbnailTarget as AdvancedPerformanceSettings['thumbnailTarget']) || 'attached',
    thumbnailMethod: (value.thumbnailMethod as AdvancedPerformanceSettings['thumbnailMethod']) || 'gd',
    cacheEnabled: (value.cacheEnabled as boolean) ?? true,
    cacheDefaultTtl: (value.cacheDefaultTtl as number) || 3600,
    cacheDeleteMethod: (value.cacheDeleteMethod as AdvancedPerformanceSettings['cacheDeleteMethod']) || 'folder',
    cacheControlOptions: (value.cacheControlOptions as string[]) || [],
    adminLayout: (value.adminLayout as AdvancedPerformanceSettings['adminLayout']) || 'admin',
    jsCompressionPolicy: (value.jsCompressionPolicy as AdvancedPerformanceSettings['jsCompressionPolicy']) || 'none',
    jsMergePolicy: (value.jsMergePolicy as AdvancedPerformanceSettings['jsMergePolicy']) || 'none',
    cssCompressionPolicy: (value.cssCompressionPolicy as AdvancedPerformanceSettings['cssCompressionPolicy']) || 'none',
    cssMergePolicy: (value.cssMergePolicy as AdvancedPerformanceSettings['cssMergePolicy']) || 'none',
    jqueryVersion: (value.jqueryVersion as AdvancedPerformanceSettings['jqueryVersion']) || '3.7.1',
  };
}

/**
 * 고급 설정(성능/캐시)를 업데이트한다.
 */
export async function updateAdvancedPerformanceSettings(
  input: AdvancedPerformanceSettings,
  ctx: { prisma: PrismaClient },
): Promise<AdvancedPerformanceSettings> {
  // Zod 검증
  const validated = AdvancedPerformanceSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'advanced.performance', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 비동기 작업 설정 (Async Task Settings) — REQ-ADMIN2-154
// ---------------------------------------------------------------------------

/**
 * 웹크론 인증키를 자동 생성한다.
 *
 * @returns 32자 hex 문자열 (암호적으로 안전한 무작위성)
 */
function generateWebcronKey(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const AsyncSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  driver: z.enum(['none', 'db']).default('none'),
  webcronKey: z.string().length(32).optional(),
  webcronShowError: z.boolean().default(false),
  intervalMinutes: z.number().int().min(1).max(1440).default(5), // 1분 ~ 1440분(24시간)
  processCount: z.number().int().min(1).max(10).default(1),
});

export interface AsyncSettings {
  enabled: boolean;
  driver: 'none' | 'db';
  webcronKey?: string;
  webcronShowError: boolean;
  intervalMinutes: number;
  processCount: number;
}

/**
 * 비동기 작업 설정을 조회한다.
 *
 * REQ-ADMIN2-154: 사용 여부, 드라이버, 웹크론 설정, 호출 간격, 프로세스 갯수.
 */
export async function getAsyncSettings(
  ctx: { prisma: PrismaClient },
): Promise<AsyncSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'async');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    enabled: (value.enabled as boolean) ?? false,
    driver: (value.driver as AsyncSettings['driver']) || 'none',
    webcronKey: (value.webcronKey as string) || undefined,
    webcronShowError: (value.webcronShowError as boolean) ?? false,
    intervalMinutes: (value.intervalMinutes as number) || 5,
    processCount: (value.processCount as number) || 1,
  };
}

/**
 * 비동기 작업 설정을 업데이트한다.
 *
 * 웹크론 인증키가 비어있으면 자동 생성한다.
 */
export async function updateAsyncSettings(
  input: AsyncSettings,
  ctx: { prisma: PrismaClient },
): Promise<AsyncSettings> {
  // 웹크론 인증키 자동 생성
  const toPersist = {
    ...input,
    webcronKey: input.webcronKey || generateWebcronKey(),
  };

  // Zod 검증
  const validated = AsyncSettingsSchema.parse(toPersist);

  await updateSiteSetting(ctx.prisma, 'async', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 사이트 잠금 설정 (Site Lock Settings) — REQ-ADMIN2-155
// ---------------------------------------------------------------------------

const SitelockSettingsSchema = z.object({
  locked: z.boolean().default(false),
  message: z.string().max(1000).optional(),
  allowedIpList: z.array(z.string()).default([]),
});

export interface SitelockSettings {
  locked: boolean;
  message?: string;
  allowedIpList: string[];
}

/**
 * 사이트 잠금 설정을 조회한다.
 *
 * REQ-ADMIN2-155: 사이트 잠금 토글, 허용 IP 목록 런타임 관리.
 */
export async function getSitelockSettings(
  ctx: { prisma: PrismaClient },
): Promise<SitelockSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'sitelock');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    locked: (value.locked as boolean) || false,
    message: (value.message as string) || '',
    allowedIpList: (value.allowedIpList as string[]) || [],
  };
}

/**
 * Sitelock 입력값을 검증하고 자가 잠금 방지 로직을 적용한 안전한 값으로 변환한다 (영속 없음).
 *
 * REQ-ADMIN2-155 자가 잠금 방지:
 * 1. SitelockSettingsSchema 로 재검증한다.
 * 2. allowedIpList 의 각 항목을 parseIpFilter 로 검증한다. 잘못된 형식이 하나라도 있으면
 *    InvalidSitelockIpError 를 던진다 (호출자가 BAD_REQUEST 로 매핑).
 * 3. locked=true 이고 현재 관리자 IP 가 목록에 없으면 자동으로 포함시킨다.
 *
 * 이 함수는 부수효과(DB 쓰기)가 없는 순수 함수이므로 router 와
 * updateSitelockSettings 양쪽에서 재사용된다.
 *
 * @MX:ANCHOR [AUTO]: Sitelock 자가 잠금 방지 단일 진입점.
 * @MX:REASON: fan_in >= 2 (tRPC updateSitelock, updateSitelockSettings).
 *             이 로직을 우회하면 관리자가 자신을 잠금 대상에서 제외하지 못해
 *             영구적으로 사이트에서 차단될 수 있음.
 */
export function resolveSitelockUpdate(
  input: SitelockSettings,
  currentIp?: string,
): SitelockSettings {
  // 1. Zod 재검증
  const validated = SitelockSettingsSchema.parse(input);

  // 2. allowedIpList 의 각 IP/CIDR 형식 검증
  for (const entry of validated.allowedIpList) {
    const parsed = parseIpFilter(entry);
    if ('error' in parsed) {
      throw new InvalidSitelockIpError(entry, parsed.error);
    }
  }

  // 3. REQ-ADMIN2-155: Sitelock 활성화 시 현재 관리자 IP 자동 포함
  let finalIpList = validated.allowedIpList;
  if (validated.locked && currentIp && !finalIpList.includes(currentIp)) {
    finalIpList = [...finalIpList, currentIp];
  }

  return {
    ...validated,
    allowedIpList: finalIpList,
  };
}

/**
 * 사이트 잠금 설정을 업데이트한다.
 *
 * @MX:ANCHOR [AUTO]: 사이트 잠금 설정 업데이트 — 자가 잠금 방지 로직 포함.
 * @MX:REASON: fan_in >= 2 (tRPC, 향후 잠금 해제 CLI 등).
 * @MX:WARN: Sitelock 활성화 시 현재 관리자 IP가 자동 포함되어야 함.
 */
export async function updateSitelockSettings(
  input: SitelockSettings,
  ctx: { prisma: PrismaClient; currentIp?: string },
): Promise<SitelockSettings> {
  // 검증 + 자가 잠금 방지 (resolveSitelockUpdate 재사용)
  const toPersist = resolveSitelockUpdate(input, ctx.currentIp);

  await updateSiteSetting(
    ctx.prisma,
    'sitelock',
    toPersist as unknown as Record<string, unknown>,
  );

  return toPersist;
}

// ---------------------------------------------------------------------------
// 설문 전역 설정 (Poll Config) — SPEC-ADMIN-002 Slice 3A, REQ-ADMIN2-086
// ---------------------------------------------------------------------------

const PollConfigSchema = z.object({
  // 비회원 투표 허용 여부 (설문 생성 시 기본값으로 사용)
  allowGuestVote: z.boolean().default(false),
  // 중복 투표 방지 방식 기본값
  duplicateVotePolicy: z.enum(['by-member', 'by-ip', 'by-cookie']).default('by-member'),
});

export interface PollConfig {
  allowGuestVote: boolean;
  duplicateVotePolicy: 'by-member' | 'by-ip' | 'by-cookie';
}

/**
 * 설문 전역 설정(비회원 투표 허용, 중복 투표 방지 방식)을 조회한다.
 *
 * REQ-ADMIN2-086: 신규 설문 생성 시 이 값이 기본값으로 적용된다.
 */
export async function getPollConfig(ctx: { prisma: PrismaClient }): Promise<PollConfig> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'pollConfig');

  const value = setting.value as Record<string, unknown>;
  return {
    allowGuestVote: (value.allowGuestVote as boolean) ?? false,
    duplicateVotePolicy:
      (value.duplicateVotePolicy as PollConfig['duplicateVotePolicy']) || 'by-member',
  };
}

/**
 * 설문 전역 설정을 업데이트한다.
 */
export async function updatePollConfig(
  input: PollConfig,
  ctx: { prisma: PrismaClient },
): Promise<PollConfig> {
  const validated = PollConfigSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'pollConfig', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 파일 기타 설정 (File Other Settings) — SPEC-ADMIN-002 Slice 3E, REQ-ADMIN2-082
// ---------------------------------------------------------------------------

const FileOtherSettingsSchema = z.object({
  // 썸네일 생성 방식: on_demand(요청 시 생성), eager(업로드 시 즉시 생성)
  thumbnailGenerationStrategy: z.enum(['on_demand', 'eager']).default('on_demand'),
  // 저장 경로 전략: flat(단일 디렉토리), date_sharded(날짜별 하위 디렉토리)
  storagePathStrategy: z.enum(['flat', 'date_sharded']).default('flat'),
});

export interface FileOtherSettings {
  thumbnailGenerationStrategy: 'on_demand' | 'eager';
  storagePathStrategy: 'flat' | 'date_sharded';
}

/**
 * 파일 기타 설정(썸네일 생성 방식, 저장 경로 전략)을 조회한다.
 *
 * REQ-ADMIN2-082: 기타 설정 (썸네일 생성 방식, 저장 경로 전략).
 */
export async function getFileOtherSettings(
  ctx: { prisma: PrismaClient },
): Promise<FileOtherSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'fileOther');

  // 기본값 반환
  const value = setting.value as Record<string, unknown>;
  return {
    thumbnailGenerationStrategy:
      (value.thumbnailGenerationStrategy as FileOtherSettings['thumbnailGenerationStrategy']) || 'on_demand',
    storagePathStrategy: (value.storagePathStrategy as FileOtherSettings['storagePathStrategy']) || 'flat',
  };
}

/**
 * 파일 기타 설정을 업데이트한다.
 */
export async function updateFileOtherSettings(
  input: FileOtherSettings,
  ctx: { prisma: PrismaClient },
): Promise<FileOtherSettings> {
  // Zod 검증
  const validated = FileOtherSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'fileOther', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 태그 설정 (Tag Settings) — SPEC-ADMIN-002 Slice 3B, REQ-ADMIN2-087/156
// ---------------------------------------------------------------------------

/** 태그 구분 방법. 복수 선택 가능 (예: 쉼표 + 공백 동시 지원). */
const TAG_DELIMITERS = ['comma', 'hash', 'space'] as const;

const TagSettingsSchema = z.object({
  // 태그 클라우드에 노출할 최대 태그 개수 (REQ-ADMIN2-087)
  cloudDisplayCount: z.number().int().min(1).max(500).default(50),
  // 태그 클라우드 정렬 기준 (REQ-ADMIN2-087)
  sortBy: z.enum(['frequency', 'name', 'recent']).default('frequency'),
  // 문서 저장 시 태그 입력 문자열을 파싱하는 구분자 방식. 1개 이상 선택 필수 (REQ-ADMIN2-156)
  delimiters: z.array(z.enum(TAG_DELIMITERS)).min(1).default(['comma']),
});

export type TagDelimiter = (typeof TAG_DELIMITERS)[number];

export interface TagSettings {
  cloudDisplayCount: number;
  sortBy: 'frequency' | 'name' | 'recent';
  delimiters: TagDelimiter[];
}

/**
 * 태그 설정(클라우드 노출 개수/정렬 기준/구분 방법)을 조회한다.
 *
 * REQ-ADMIN2-087: 태그 클라우드 노출 개수, 정렬 기준.
 * REQ-ADMIN2-156: 문서 저장 시 태그 입력 파싱에 사용하는 구분자(쉼표/해시/공백, 복수 선택).
 */
export async function getTagSettings(ctx: { prisma: PrismaClient }): Promise<TagSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'tagSettings');

  const value = setting.value as Record<string, unknown>;
  return {
    cloudDisplayCount: (value.cloudDisplayCount as number) || 50,
    sortBy: (value.sortBy as TagSettings['sortBy']) || 'frequency',
    delimiters:
      Array.isArray(value.delimiters) && value.delimiters.length > 0
        ? (value.delimiters as TagDelimiter[])
        : ['comma'],
  };
}

/**
 * 태그 설정을 업데이트한다.
 */
export async function updateTagSettings(
  input: TagSettings,
  ctx: { prisma: PrismaClient },
): Promise<TagSettings> {
  const validated = TagSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'tagSettings', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 쪽지 설정 (Communication Settings) — SPEC-ADMIN-002 Slice 3E, REQ-ADMIN2-143
// ---------------------------------------------------------------------------

const CommunicationSettingsSchema = z.object({
  // 쪽지 기능 활성화 여부
  enabled: z.boolean().default(false),
  // 회원별 쪽지함 최대 저장 개수
  inboxLimit: z.number().int().min(1).max(10000).default(100),
});

export interface CommunicationSettings {
  enabled: boolean;
  inboxLimit: number;
}

/**
 * 쪽지 설정(활성화 여부 + 수신함 제한)을 조회한다.
 *
 * REQ-ADMIN2-143: 쪽지 기능 토글, 회원별 수신함 최대 개수 제한.
 */
export async function getCommunicationSettings(
  ctx: { prisma: PrismaClient },
): Promise<CommunicationSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'communication');

  const value = setting.value as Record<string, unknown>;
  return {
    enabled: (value.enabled as boolean) ?? false,
    inboxLimit: (value.inboxLimit as number) || 100,
  };
}

/**
 * 쪽지 설정을 업데이트한다.
 */
export async function updateCommunicationSettings(
  input: CommunicationSettings,
  ctx: { prisma: PrismaClient },
): Promise<CommunicationSettings> {
  const validated = CommunicationSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'communication', validated);

  return validated;
}

// ---------------------------------------------------------------------------
// 디버그 설정 (Debug Settings) — SPEC-ADMIN-002 Slice 3E, REQ-ADMIN2-117/159/160
// ---------------------------------------------------------------------------

/**
 * 디버그 표시 대상 (REQ-ADMIN2-117).
 */
const DEBUG_DISPLAY_TARGETS = ['admin_only', 'allowed_ips', 'all'] as const;

/**
 * 디버그 정보 표시 방법 (REQ-ADMIN2-159).
 */
const DEBUG_DISPLAY_METHODS = ['html_comment', 'screen_panel', 'file_log'] as const;

/**
 * 디버그 정보 표시 내용 (REQ-ADMIN2-159).
 */
const DEBUG_CONTENT_TYPES = [
  'request_response',
  'debug_message',
  'error',
  'query',
  'slow_query',
  'slow_trigger',
  'slow_widget',
  'slow_external',
] as const;

/**
 * 에러 로그 기록 수준 (REQ-ADMIN2-160).
 */
const ERROR_LOG_LEVELS = ['all_errors_warnings', 'critical_only'] as const;

const DebugSettingsSchema = z.object({
  // REQ-ADMIN2-117: 디버그 기능 활성화 여부
  enabled: z.boolean().default(false),
  // REQ-ADMIN2-159: 느린 작업 임계값 (초 단위)
  slowQueryThreshold: z.number().nonnegative().default(1.0),
  slowTriggerThreshold: z.number().nonnegative().default(1.0),
  slowWidgetThreshold: z.number().nonnegative().default(1.0),
  slowExternalThreshold: z.number().nonnegative().default(1.0),
  // REQ-ADMIN2-159: 디버그 정보 표시 방법 (복수 선택)
  displayMethods: z.array(z.enum(DEBUG_DISPLAY_METHODS)).min(1).default(['html_comment']),
  // REQ-ADMIN2-159: 디버그 정보 표시 내용 (복수 선택)
  contentTypes: z.array(z.enum(DEBUG_CONTENT_TYPES)).default([
    'error',
    'slow_query',
    'slow_trigger',
  ]),
  // REQ-ADMIN2-159: 디버그 로그 파일 경로
  logFilePath: z.string().optional(),
  // REQ-ADMIN2-117/159: 디버그 정보 표시 대상
  displayTarget: z.enum(DEBUG_DISPLAY_TARGETS).default('admin_only'),
  // REQ-ADMIN2-159: 디버그 허용 IP 목록
  allowedIps: z.array(z.string()).default([]),
  // REQ-ADMIN2-160: 쿼리에 주석(쿼리명+IP) 추가 여부
  addQueryComment: z.boolean().default(false),
  // REQ-ADMIN2-160: 쿼리 콜 스택 전체 표시 여부
  showFullCallStack: z.boolean().default(false),
  // REQ-ADMIN2-160: 동일 위치 반복 오류/쿼리 중복 정리 여부
  deduplicateErrors: z.boolean().default(true),
  // REQ-ADMIN2-160: 에러 로그 기록 수준
  errorLogLevel: z.enum(ERROR_LOG_LEVELS).default('critical_only'),
});

export type DebugDisplayTarget = (typeof DEBUG_DISPLAY_TARGETS)[number];
export type DebugDisplayMethod = (typeof DEBUG_DISPLAY_METHODS)[number];
export type DebugContentType = (typeof DEBUG_CONTENT_TYPES)[number];
export type ErrorLogLevel = (typeof ERROR_LOG_LEVELS)[number];

export interface DebugSettings {
  enabled: boolean;
  slowQueryThreshold: number;
  slowTriggerThreshold: number;
  slowWidgetThreshold: number;
  slowExternalThreshold: number;
  displayMethods: DebugDisplayMethod[];
  contentTypes: DebugContentType[];
  logFilePath?: string;
  displayTarget: DebugDisplayTarget;
  allowedIps: string[];
  addQueryComment: boolean;
  showFullCallStack: boolean;
  deduplicateErrors: boolean;
  errorLogLevel: ErrorLogLevel;
}

/**
 * 디버그 설정을 조회한다.
 *
 * REQ-ADMIN2-117: 디버그 기능 활성화 여부, 표시 대상.
 * REQ-ADMIN2-159: 느린 작업 임계값, 표시 방법/내용, 로그 파일 경로, 허용 IP 목록.
 * REQ-ADMIN2-160: 쿼리 진단 옵션(주석/콜스택/중복제거), 에러 로그 수준.
 */
export async function getDebugSettings(
  ctx: { prisma: PrismaClient },
): Promise<DebugSettings> {
  const setting = await getOrCreateSiteSetting(ctx.prisma, 'debug');

  const value = setting.value as Record<string, unknown>;
  return {
    enabled: (value.enabled as boolean) ?? false,
    slowQueryThreshold: (value.slowQueryThreshold as number) || 1.0,
    slowTriggerThreshold: (value.slowTriggerThreshold as number) || 1.0,
    slowWidgetThreshold: (value.slowWidgetThreshold as number) || 1.0,
    slowExternalThreshold: (value.slowExternalThreshold as number) || 1.0,
    displayMethods:
      (Array.isArray(value.displayMethods) && value.displayMethods.length > 0
        ? (value.displayMethods as DebugDisplayMethod[])
        : ['html_comment']) || ['html_comment'],
    contentTypes: (value.contentTypes as DebugContentType[]) || [
      'error',
      'slow_query',
      'slow_trigger',
    ],
    logFilePath: (value.logFilePath as string) || '',
    displayTarget: (value.displayTarget as DebugDisplayTarget) || 'admin_only',
    allowedIps: (value.allowedIps as string[]) || [],
    addQueryComment: (value.addQueryComment as boolean) ?? false,
    showFullCallStack: (value.showFullCallStack as boolean) ?? false,
    deduplicateErrors: (value.deduplicateErrors as boolean) ?? true,
    errorLogLevel: (value.errorLogLevel as ErrorLogLevel) || 'critical_only',
  };
}

/**
 * 디버그 설정을 업데이트한다.
 */
export async function updateDebugSettings(
  input: DebugSettings,
  ctx: { prisma: PrismaClient },
): Promise<DebugSettings> {
  const validated = DebugSettingsSchema.parse(input);

  await updateSiteSetting(ctx.prisma, 'debug', validated);

  return validated;
}
