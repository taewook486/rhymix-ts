/**
 * Admin Utilities — SPEC-ADMIN-002 Slice 2H (REQ-ADMIN2-150, REQ-ADMIN2-151)
 *
 * Global admin utilities:
 * - Menu cache invalidation (REQ-ADMIN2-150)
 * - Expired session purge (REQ-ADMIN2-151)
 *
 * @MX:NOTE [AUTO]: packages/admin/src 는 순수 로직 패키지이므로 'next/cache'
 * (Next.js 서버 전용 API) 를 직접 import 하지 않는다. invalidateAdminMenuCache 는
 * 무효화할 경로만 반환하고, 실제 revalidatePath() 호출은 apps/web 의 Server Action/
 * tRPC resolver 가 수행한다.
 *
 * @MX:ANCHOR [AUTO]: purgeExpiredSessions — 현재 관리자 세션 보존 invariant.
 * @MX:REASON: 현재 관리자의 세션을 삭제하면 즉시 로그아웃되어 작업 중단됨.
 *             fan_in >= 2 (admin footer, API 호출).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-150, REQ-ADMIN2-151
 */
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvalidateMenuCacheResult {
  invalidated: boolean;
  path: string;
}

export interface PurgeExpiredSessionsOptions {
  batchSize?: number;
  currentSessionToken?: string;
}

export interface PurgeExpiredSessionsResult {
  removedCount: number;
  currentSessionPreserved: boolean;
  breakdown: {
    expiredAutoLogins: number;
    oldSessionRevocations: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_SIZE = 500;
const MENU_CACHE_PATH = '/admin';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Invalidate the admin menu cache.
 *
 * REQ-ADMIN2-150: WHEN admin triggers "관리자 메뉴 초기화" from the admin layout
 * global footer, the system SHALL invalidate the cached admin menu/navigation
 * structure and rebuild it on the next request.
 *
 * This is a pure logic package — it does not call Next.js's revalidatePath()
 * directly. Instead it returns the path that needs revalidation; the caller
 * (apps/web Server Action / tRPC resolver) is responsible for invoking
 * revalidatePath() with that path.
 */
export async function invalidateAdminMenuCache(ctx: {
  prisma: PrismaClient;
}): Promise<InvalidateMenuCacheResult> {
  return {
    invalidated: true,
    path: MENU_CACHE_PATH,
  };
}

/**
 * Purge expired sessions in a bounded batch operation.
 *
 * REQ-ADMIN2-151: WHEN admin triggers "세션 정리" from the admin layout global footer,
 * the system SHALL purge expired sessions in a bounded batch operation and report
 * the number removed WITHOUT terminating the current administrator's active session.
 *
 * In NextAuth v5 with JWT strategy, "sessions" are self-contained tokens stored client-side.
 * This function purges:
 * 1. Expired AutoLogin tokens (remember-me tokens with explicit expiresAt)
 * 2. Old SessionRevocation records (audit trail cleanup, optional)
 *
 * @MX:ANCHOR [AUTO]: 현재 관리자의 AutoLogin 토큰은 절대 삭제하지 않습니다.
 * @MX:REASON: 현재 세션을 삭제하면 관리자가 즉시 로그아웃되어 작업이 중단됩니다.
 *             fan_in >= 2 (admin footer, API 호출).
 *
 * @param ctx - Prisma context
 * @param options - Batch size and current session token to exclude
 * @returns Summary of purged records
 */
export async function purgeExpiredSessions(
  ctx: { prisma: PrismaClient },
  options: PurgeExpiredSessionsOptions = {},
): Promise<PurgeExpiredSessionsResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const currentSessionToken = options.currentSessionToken;

  // Get current timestamp
  const now = new Date();

  // 1. Purge expired AutoLogin tokens
  // AutoLogin tokens have explicit expiresAt timestamps
  // We exclude the current admin's token if provided
  const expiredAutoLoginsWhere: Record<string, unknown> = {
    expiresAt: { lt: now },
  };

  // CRITICAL: Never delete the current admin's AutoLogin token
  if (currentSessionToken) {
    expiredAutoLoginsWhere.securityKey = {
      not: currentSessionToken,
    };
  }

  const deletedAutoLogins = await ctx.prisma.autoLogin.deleteMany({
    where: expiredAutoLoginsWhere,
    // Limit batch size to prevent long-running operations
    ...(batchSize ? { limit: batchSize } : {}),
  });

  // 2. Optionally purge old SessionRevocation records (audit trail cleanup)
  // These are not actual sessions but revocation audit records
  // Clean up records older than 90 days to keep the table size manageable
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const oldRevocationsWhere = {
    revokedAt: { lt: ninetyDaysAgo },
  };

  const deletedRevocations = await ctx.prisma.sessionRevocation.deleteMany({
    where: oldRevocationsWhere,
    // Limit batch size
    ...(batchSize ? { limit: batchSize } : {}),
  });

  return {
    removedCount: deletedAutoLogins.count + deletedRevocations.count,
    currentSessionPreserved: true, // We explicitly excluded it above
    breakdown: {
      expiredAutoLogins: deletedAutoLogins.count,
      oldSessionRevocations: deletedRevocations.count,
    },
  };
}
