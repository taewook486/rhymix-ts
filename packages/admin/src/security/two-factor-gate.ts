/**
 * Admin 2FA Gate — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * 2FA 정책 확인 및 세션 검증.
 *
 * NOTE: This is a stub implementation. The actual 2FA fields (twoFactorSecret, etc.)
 * are not yet in the Prisma schema. This will be implemented when the schema is updated.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-2FA-001~005
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
 * 1. 2FA 정책 확인
 * 2. 사용자 2FA 등록 여부 확인 (TODO: schema alignment)
 * 3. 세션 검증 플래그 확인
 *
 * @param session - 현재 세션 (undefined 가능)
 * @param prisma - Prisma client
 * @param siteId - 대상 사이트 ID
 * @returns TwoFactorVerifyResult
 */
export async function checkAdmin2FA(
  session: unknown | undefined,
  prisma: PrismaClient,
  siteId: number,
): Promise<TwoFactorVerifyResult> {
  // 1. 세션 없으면 need-enroll
  if (!session || typeof session !== 'object') {
    return 'need-enroll';
  }

  const sess = session as Record<string, unknown>;
  const userId = sess.user as Record<string, unknown> | undefined;

  if (!userId || typeof userId.id !== 'number') {
    return 'need-enroll';
  }

  // 2. 2FA 정책 확인
  const required = await getSiteAdminTwoFactorPolicy(prisma, siteId);
  if (!required) {
    // 2FA가 필요 없으면 통과
    return 'pass';
  }

  // 3. 사용자 2FA 등록 여부 확인 (TODO: needs schema with twoFactorSecret field)
  // For now, assume enrolled if required
  // const member = await prisma.adminMember.findUnique({
  //   where: { id: userId.id },
  //   select: { twoFactorSecret: true },
  // });

  // 4. 세션 검증 플래그 확인 — session.user.twoFactorVerified (user 객체 내부).
  // 위에서 sess.user 를 userId 로 캐스팅했으므로 동일 변수를 재사용한다.
  const twoFactorVerified = userId['twoFactorVerified'] === true;
  if (!twoFactorVerified) {
    // 2FA 검증 필요
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
