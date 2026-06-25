/**
 * 2FA 헬퍼 — thin wrapper (SPEC-ADMIN-2FA-OTP-001 M5 / REQ-2OTP-061).
 *
 * 본 파일의 두 함수는 packages/admin/src/security/two-factor-gate.ts 의
 * canonical 구현에 위임한다. 단일 진실 원천을 확보하기 위해 로직을 직접
 * 유지하지 않는다.
 *
 * NOTE: layout.tsx 및 기타 프로덕션 코드는 실제로 apps/web/lib/auth/admin-middleware.ts
 *       의 동일 이름 함수를 사용한다. 본 파일의 호출자는 현재 테스트 mock 뿉이므로
 *       위임으로 전환해도 프로덕션 동작은 변하지 않는다. 함수 시그니처는
 *       기존 호출처(테스트 포함)를 깨뜨리지 않도록 그대로 유지한다.
 *
 * @MX:ANCHOR: [AUTO] 2FA 게이트 헬퍼 — canonical 게이트로 위임.
 * @MX:REASON: 두 헬퍼(isAdminTwoFactorRequired/isSessionTwoFactorVerified)가
 *             packages/admin 의 canonical 구현과 병렬로 존재하면 stub 이나 누락으로
 *             보안이 무력화될 수 있다. 본 파일은 thin wrapper 로만 존재한다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-023, SPEC-ADMIN-2FA-OTP-001 REQ-2OTP-061
 */
import type { PrismaClient } from '@rhymix-ts/db';

/**
 * 사이트 2FA 정책 조회 — canonical getSiteAdminTwoFactorPolicy 로 위임.
 * 단일 사이트 기본값(siteId=1)을 사용한다 (기존 시그니처 유지).
 */
export async function isAdminTwoFactorRequired(
  prisma: Pick<PrismaClient, 'siteSetting'>,
): Promise<boolean> {
  const { getSiteAdminTwoFactorPolicy } = await import('@rhymix-ts/admin/security');
  // PrismaClient subset 을 넘기되, canonical 쪽에서 필요한 siteSetting 접근은
  // Pick<PrismaClient,'siteSetting'> 로도 동작한다.
  return getSiteAdminTwoFactorPolicy(prisma as PrismaClient, 1);
}

/**
 * session 에 twoFactorVerified === true 가 있을 때만 통과.
 * canonical 필드(session.user.twoFactorVerified)를 그대로 읽는다.
 */
export function isSessionTwoFactorVerified(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== 'object') return false;
  return (user as Record<string, unknown>).twoFactorVerified === true;
}
