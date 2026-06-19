/**
 * IP Control — SPEC-ADMIN-002 Slice 2G (REQ-ADMIN2-115)
 *
 * Admin-area IP access control using allow/deny lists.
 * Reuses parseIpFilter from SPEC-ADMIN-EXTRAS-001.
 *
 * @MX:ANCHOR [AUTO]: checkIpAccess — 인증 우회 방지 invariant.
 * @MX:REASON: Admin area IP filtering is the first defense against unauthorized access.
 *             fan_in >= 2 (admin middleware, future per-module filtering).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-115
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { parseIpFilter, matchesIpFilter, type ParsedIpFilter } from '../logs/ip-filter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IpControlSettings {
  enabled: boolean;
  allowList: string[];
  denyList: string[];
}

export interface IpAccessResult {
  allowed: boolean;
  reason: 'IP_CONTROL_DISABLED' | 'ALLOWED' | 'NOT_IN_ALLOW_LIST' | 'IN_DENY_LIST' | 'INVALID_IP_FORMAT';
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const IpControlSettingsSchema = z.object({
  enabled: z.boolean(),
  allowList: z.array(z.string()).default([]),
  denyList: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Validate all IPs in a list using parseIpFilter.
 * Throws if any IP is invalid.
 */
function validateIpList(list: string[]): void {
  for (const ip of list) {
    const parsed = parseIpFilter(ip);
    if ('error' in parsed) {
      throw new Error(`Invalid IP address format: ${ip} - ${parsed.error}`);
    }
  }
}

/**
 * Check if an IP matches any filter in a list.
 */
function matchesAnyFilter(ip: string, filters: ParsedIpFilter[]): boolean {
  for (const filter of filters) {
    if (matchesIpFilter(ip, filter)) {
      return true;
    }
  }
  return false;
}

/**
 * Get or create the IP control SiteSetting.
 */
async function getOrCreateIpControlSetting(
  prisma: PrismaClient,
): Promise<{ key: string; value: Record<string, unknown> }> {
  const site = await prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new Error('Site not found');
  }

  let setting = await prisma.siteSetting.findUnique({
    where: { siteId_key: { siteId: site.id, key: 'ipControl' } },
  });

  if (!setting) {
    setting = await prisma.siteSetting.create({
      data: {
        siteId: site.id,
        key: 'ipControl',
        value: { enabled: false, allowList: [], denyList: [] },
      },
    });
  }

  return { key: setting.key, value: setting.value as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get IP control settings.
 */
export async function getIpControlSettings(ctx: {
  prisma: PrismaClient;
}): Promise<IpControlSettings> {
  const setting = await getOrCreateIpControlSetting(ctx.prisma);
  const value = setting.value;

  return {
    enabled: (value.enabled as boolean) ?? false,
    allowList: (value.allowList as string[]) ?? [],
    denyList: (value.denyList as string[]) ?? [],
  };
}

/**
 * Update IP control settings.
 *
 * Validates all IP/CIDR formats using parseIpFilter before persisting.
 */
export async function updateIpControlSettings(
  input: IpControlSettings,
  ctx: { prisma: PrismaClient },
): Promise<IpControlSettings> {
  // Validate input schema
  const validated = IpControlSettingsSchema.parse(input);

  // Validate all IP/CIDR formats
  validateIpList(validated.allowList);
  validateIpList(validated.denyList);

  // Persist to SiteSetting
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new Error('Site not found');
  }

  const jsonValue = validated as unknown as Prisma.InputJsonValue;
  await ctx.prisma.siteSetting.upsert({
    where: { siteId_key: { siteId: site.id, key: 'ipControl' } },
    create: {
      siteId: site.id,
      key: 'ipControl',
      value: jsonValue,
    },
    update: {
      value: jsonValue,
    },
  });

  return validated;
}

/**
 * Check if an IP address is allowed to access the admin area.
 *
 * @MX:ANCHOR [AUTO]: 이 함수는 관리자 영역 인증의 첫 번째 방어선입니다.
 * @MX:REASON: IP 필터링 우회 시 인증 서클릿을 완전히 우회할 수 있습니다.
 *             fan_in >= 2 (admin 미들웨어, 향후 모듈별 필터링).
 *
 * Priority order:
 * 1. Validate IP format → deny if invalid
 * 2. If disabled → allow
 * 3. If in deny list → deny (highest priority)
 * 4. If allow list is empty → allow (allow-all when enabled)
 * 5. If in allow list → allow
 * 6. Otherwise → deny
 */
export async function checkIpAccess(
  ip: string,
  ctx: { prisma: PrismaClient },
): Promise<IpAccessResult> {
  // First, validate IP format
  const testParse = parseIpFilter(ip);
  if ('error' in testParse) {
    return { allowed: false, reason: 'INVALID_IP_FORMAT' };
  }

  const settings = await getIpControlSettings(ctx);

  // Disabled → allow all
  if (!settings.enabled) {
    return { allowed: true, reason: 'IP_CONTROL_DISABLED' };
  }

  // Parse deny list (highest priority)
  const denyFilters = settings.denyList.map(parseIpFilter);
  if (matchesAnyFilter(ip, denyFilters)) {
    return { allowed: false, reason: 'IN_DENY_LIST' };
  }

  // Parse allow list
  const allowFilters = settings.allowList.map(parseIpFilter);

  // Empty allow list → allow all (when enabled but not restricted)
  if (allowFilters.length === 0) {
    return { allowed: true, reason: 'ALLOWED' };
  }

  // Check if IP is in allow list
  if (matchesAnyFilter(ip, allowFilters)) {
    return { allowed: true, reason: 'ALLOWED' };
  }

  // Not in allow list
  return { allowed: false, reason: 'NOT_IN_ALLOW_LIST' };
}
