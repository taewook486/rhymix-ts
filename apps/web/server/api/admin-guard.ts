/**
 * 관리자 접근 가드 — tRPC(protectedAdminProcedure)와 관리자 Server Action 이 공유한다.
 *
 * 판정 로직을 한 곳에 두어 두 경로의 결과가 어긋나지 않게 한다 (D-7).
 *   1. isAdminSession            — 관리자 세션 (user.isAdmin 또는 관리자 그룹)
 *   2. enforceAdminAccessControl — 관리자 IP 제어 + 사이트 잠금 (REQ-ADMIN2-115/155)
 *   3. enforceAdmin2FA           — 2FA 정책 (REQ-ADMIN-023)
 *
 * 거부는 모두 TRPCError(FORBIDDEN) 로 던진다.
 */
import { TRPCError } from '@trpc/server';
import { isAdminSession } from '@/lib/auth/admin-middleware';
import { checkIpAccess } from '@rhymix-ts/admin';
import type { PrismaClient } from '@prisma/client';
import type { Context } from './context';

// ---------------------------------------------------------------------------
// Admin IP/Sitelock enforcement cache — SPEC-ADMIN-002 REQ-ADMIN2-115/155
// ---------------------------------------------------------------------------

interface AdminSecuritySnapshot {
  ipControlEnabled: boolean;
  sitelockLocked: boolean;
  sitelockAllowedIpList: string[];
}

/**
 * 짧은 TTL 캐시. requireAdmin 미들웨어가 모든 admin tRPC 호출마다 ipControl/sitelock 설정을
 * DB 에서 읽지 않도록 siteId 별로 캐싱한다.
 *
 * @MX:WARN: [AUTO] 모듈 레벨 가변 캐시 — 설정 변경 반영이 최대 TTL 만큼 지연됨.
 * @MX:REASON: 모든 admin 요청마다 ipControl/sitelock 설정을 DB 에서 추가 조회하면 핫패스
 *             비용이 큼. 5초 TTL 로 정확성과 비용을 절충한다.
 */
const SECURITY_SETTINGS_TTL_MS = 5000;
const securitySnapshotCache = new Map<
  number,
  { value: AdminSecuritySnapshot; expiresAt: number }
>();

/**
 * ipControl / sitelock SiteSetting 을 가벼운 findFirst 단일 조회로 읽는다.
 * getOrCreateSiteSetting(findUnique + create) 핫패스를 피해 row 를 생성하지 않으며,
 * 키가 없으면 기본값(비활성/잠금 해제)으로 처리한다.
 *
 * siteId 가 미해석(undefined)이면 추가 site.findFirst 없이 key 만으로 조회한다
 * (isAdminTwoFactorRequired 와 동일 패턴). 캐시 키는 siteId ?? 0 을 사용한다.
 */
async function loadAdminSecuritySnapshot(
  prisma: PrismaClient,
  siteId: number | undefined,
): Promise<AdminSecuritySnapshot> {
  const cacheKey = siteId ?? 0;
  const now = Date.now();
  const cached = securitySnapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const ipControlWhere =
    siteId !== undefined ? { siteId, key: 'ipControl' } : { key: 'ipControl' };
  const sitelockWhere =
    siteId !== undefined ? { siteId, key: 'sitelock' } : { key: 'sitelock' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const siteSetting = (prisma as any).siteSetting;
  const [ipControlRow, sitelockRow] = await Promise.all([
    siteSetting.findFirst({ where: ipControlWhere }),
    siteSetting.findFirst({ where: sitelockWhere }),
  ]);

  const ipControlValue = (ipControlRow?.value ?? {}) as Record<string, unknown>;
  const sitelockValue = (sitelockRow?.value ?? {}) as Record<string, unknown>;

  const value: AdminSecuritySnapshot = {
    ipControlEnabled: ipControlValue.enabled === true,
    sitelockLocked: sitelockValue.locked === true,
    sitelockAllowedIpList: Array.isArray(sitelockValue.allowedIpList)
      ? (sitelockValue.allowedIpList as string[])
      : [],
  };

  securitySnapshotCache.set(cacheKey, {
    value,
    expiresAt: now + SECURITY_SETTINGS_TTL_MS,
  });
  return value;
}

/** 테스트/잠금 해제 후 캐시를 강제로 비운다. */
export function clearAdminSecurityCache(): void {
  securitySnapshotCache.clear();
}

/**
 * IP 접근 제어 + 사이트 잠금을 강제한다 (REQ-ADMIN2-115, REQ-ADMIN2-155).
 *
 * - IP 제어가 활성화되어 있고 현재 IP 가 거부되면 FORBIDDEN.
 * - 사이트가 잠겨 있고 현재 IP 가 allowedIpList 에 없으면 FORBIDDEN (관리자도 차단).
 *
 * 비활성/잠금 해제(기본값) 상태에서는 무거운 checkIpAccess 조회를 아예 수행하지 않아
 * 기존 admin 흐름과 동작/쿼리 시퀀스에 영향을 주지 않는다.
 * 설정 조회 자체가 실패하면(예: DB 미가용) fail-open 한다.
 */
export async function enforceAdminAccessControl(ctx: Context): Promise<void> {
  let snapshot: AdminSecuritySnapshot;
  try {
    // siteId 가 미해석이어도 key 기반 조회로 처리 (추가 site.findFirst 없음).
    snapshot = await loadAdminSecuritySnapshot(ctx.prisma, ctx.siteId);
  } catch {
    return; // 설정 조회 실패 → fail-open
  }

  // 둘 다 기본값(비활성/잠금 해제)이면 추가 비용 없이 통과.
  if (!snapshot.ipControlEnabled && !snapshot.sitelockLocked) {
    return;
  }

  const ip = ctx.ip;

  // 1. IP 접근 제어 (활성화된 경우에만 정밀 평가).
  if (snapshot.ipControlEnabled && ip) {
    let ipDenied = false;
    try {
      const access = await checkIpAccess(ip, { prisma: ctx.prisma });
      ipDenied =
        !access.allowed &&
        (access.reason === 'IN_DENY_LIST' || access.reason === 'NOT_IN_ALLOW_LIST');
    } catch {
      ipDenied = false; // 조회 실패 → fail-open
    }
    if (ipDenied) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '허용되지 않은 IP입니다.' });
    }
  }

  // 2. 사이트 잠금: allowedIpList 에 포함된 IP 만 통과 (관리자도 예외 없음).
  // 현재 관리자 IP 는 Fix 1 의 자가 잠금 방지로 목록에 포함되어 있어야 한다.
  if (snapshot.sitelockLocked) {
    const sitelockDenied = !ip || !snapshot.sitelockAllowedIpList.includes(ip);
    if (sitelockDenied) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '허용되지 않은 IP입니다.' });
    }
  }
}

/** isAdmin 세션 검증 (tRPC requireAdmin 의 첫 단계). */
export function assertAdminSession(ctx: Pick<Context, 'session'>): void {
  if (!isAdminSession(ctx.session)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' });
  }
}

/**
 * 2FA 강제 — SPEC-ADMIN-001 Slice I (REQ-ADMIN-023) + SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * checkAdmin2FA() 가 사이트별 2FA 정책 확인 + 세션 검증을 모두 수행한다.
 * 정책이 비활성이면 'pass', 활성인데 미인증이면 'need-enroll'/'need-verify' → FORBIDDEN.
 * siteId 미해석(undefined)이면 단일사이트 기본값 1 로 폴백한다.
 */
export async function enforceAdmin2FA(ctx: Pick<Context, 'session' | 'prisma' | 'siteId'>): Promise<void> {
  const { checkAdmin2FA } = await import('@rhymix-ts/admin/security');
  const result = await checkAdmin2FA(ctx.session, ctx.prisma, ctx.siteId ?? 1);
  if (result === 'need-enroll') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '2FA 등록이 필요합니다.' });
  }
  if (result === 'need-verify') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '2FA 인증이 필요합니다.' });
  }
}

/**
 * 관리자 Server Action 용 전체 가드: 세션 → IP/사이트 잠금 → 2FA.
 * protectedAdminProcedure 가 통과시키는 조건과 같다.
 */
export async function assertAdminAccess(ctx: Context): Promise<void> {
  assertAdminSession(ctx);
  await enforceAdminAccessControl(ctx);
  await enforceAdmin2FA(ctx);
}
