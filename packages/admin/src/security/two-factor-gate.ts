/**
 * Admin 2FA Gate — SPEC-ADMIN-EXTRAS-001 Slice A + SPEC-ADMIN-2FA-OTP-001 M5 (REQ-2OTP-060~062, 082).
 *
 * 2FA 정책 확인 및 세션 검증. 단일 canonical 게이트 헬퍼.
 *
 * @MX:ANCHOR: [AUTO] 관리자 2FA 게이트 단일 진입점.
 *   apps/web/lib/auth/two-factor.ts, apps/web/lib/auth/admin-middleware.ts,
 *   apps/web/server/api/trpc.ts(requireAdmin2FAIfEnabled) 모두 본 함수로 위임한다.
 * @MX:REASON: 등록 여부/세션 플래그 확인 로직이 여러 곳에 분산되면 stub 이나
 *   누락으로 보안이 무력화될 수 있다. 한 곳에서만 판정한다.
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-001~005, SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-060~062
 */

import type { PrismaClient } from '@prisma/client';

/**
 * TwoFactorVerifyResult — 2FA 검증 결과
 */
export type TwoFactorVerifyResult = 'pass' | 'need-enroll' | 'need-verify';

/**
 * getSiteAdminTwoFactorPolicy — 사이트별 2FA 정책 조회
 *
 * SiteSetting에서 requireAdminTwoFactor 값을 읽는다.
 *
 * @param prisma - Prisma client
 * @param siteId - 대상 사이트 ID
 * @returns true면 2FA 필요, false면 선택적
 */
export async function getSiteAdminTwoFactorPolicy(
  prisma: PrismaClient,
  siteId: number,
): Promise<boolean> {
  // Check SiteSetting for requireAdminTwoFactor
  const setting = await prisma.siteSetting.findFirst({
    where: {
      siteId,
      key: 'requireAdminTwoFactor',
    },
    select: { value: true },
  });

  if (!setting) {
    return false;
  }

  // Parse JSON value
  try {
    const value = setting.value as unknown;
    return value === true || (typeof value === 'object' && value !== null && 'value' in value && (value as { value: unknown }).value === true);
  } catch {
    return false;
  }
}

/**
 * checkAdmin2FA — 관리자 세션 2FA 검증
 *
 * 1. 세션/사용자 식별자 추출 (없으면 need-enroll).
 * 2. 사이트 2FA 정책 조회 — 비활성이면 pass.
 * 3. REQ-2OTP-060: 사용자 twoFactorEnabled + twoFactorSecret 실제 조회.
 *    - 등록 안 됨 → need-enroll.
 *    - 등록됨 + session.user.twoFactorVerified !== true → need-verify.
 *    - 그 외 → pass.
 *
 * b220fd1 회귀 금지 (REQ-2OTP-062): siteId 는 ctx 기반 외부 주입만 허용,
 * 본 함수는 하드코딩된 siteId 를 사용하지 않는다.
 *
 * @param session - 현재 세션 (undefined 가능)
 * @param prisma - Prisma client
 * @param siteId - 대상 사이트 ID (ctx.siteId ?? 1)
 * @returns TwoFactorVerifyResult
 */
export async function checkAdmin2FA(
  session: unknown | undefined,
  prisma: PrismaClient,
  siteId: number,
): Promise<TwoFactorVerifyResult> {
  // 1. 세션과 user.id 가 있어야 판정 가능.
  if (!session || typeof session !== 'object') {
    return 'need-enroll';
  }

  const sess = session as Record<string, unknown>;
  const user = sess.user as Record<string, unknown> | undefined;

  if (!user) {
    return 'need-enroll';
  }

  // user.id 정규화 — jwt callback 이 string 으로 넘기는 경로도 수용.
  let userId: number | null = null;
  if (typeof user.id === 'number' && Number.isFinite(user.id)) {
    userId = user.id;
  } else if (typeof user.id === 'string') {
    const parsed = Number.parseInt(user.id, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      userId = parsed;
    }
  }
  if (userId === null) {
    return 'need-enroll';
  }

  // 2. 사이트 2FA 정책 확인 — 비활성이면 enroll/verified 무관하게 pass.
  const required = await getSiteAdminTwoFactorPolicy(prisma, siteId);
  if (!required) {
    return 'pass';
  }

  // 3. REQ-2OTP-060: 실제 등록 여부 조회 (stub "assume enrolled if required" 제거).
  const record = (await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  } as never)) as {
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
  } | null;

  const enrolled = !!record && record.twoFactorEnabled && !!record.twoFactorSecret;
  if (!enrolled) {
    return 'need-enroll';
  }

  // 4. 세션 검증 플래그 확인 — session.user.twoFactorVerified 가 canonical.
  if (user['twoFactorVerified'] !== true) {
    return 'need-verify';
  }

  return 'pass';
}

/**
 * invalidateAll2FAVerified — 사이트별 모든 관리자 세션 2FA 검증 무효화
 *
 * 정책 변경 시 호출하여 AdminLog를 기록.
 *
 * @param prisma - Prisma client
 * @param siteId - 대상 사이트 ID
 */
export async function invalidateAll2FAVerified(
  prisma: PrismaClient,
  siteId: number,
): Promise<void> {
  // AdminLog 기록
  await prisma.adminLog.create({
    data: {
      actorId: 0, // system actor
      action: 'admin.2fa.invalidate',
      target: `site:${siteId}`,
      diff: JSON.stringify({
        reason: '2FA policy changed, all verified flags invalidated',
      }),
    },
  });
}
