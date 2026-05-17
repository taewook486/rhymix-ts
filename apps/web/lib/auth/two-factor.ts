/**
 * 2FA 강제 게이트 헬퍼 — SPEC-ADMIN-001 Slice I (REQ-ADMIN-023).
 *
 * 관리자 2FA 필요 여부 및 세션 검증 플래그를 확인한다.
 *
 * @MX:ANCHOR: [AUTO] REQ-ADMIN-023 의 2FA 게이트 단일 진입점.
 * @MX:REASON: isAdminTwoFactorRequired + isSessionTwoFactorVerified 두 함수가
 *             layout.tsx 와 tRPC 미들웨어 양쪽에서 호출됨 (fan_in >= 2).
 *             이 파일이 없으면 2FA 강제 기능 전체가 무력화됨.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-023
 *
 * NOTE: 실제 OTP 흐름(TOTP 시크릿 발급/검증)은 SPEC-AUTH-001 후속 슬라이스로 이월.
 *       본 슬라이스는 게이트 로직(SiteSetting 조회 + session 플래그 확인)만 도입한다.
 */
import type { PrismaClient } from '@rhymix-ts/db';

/**
 * SiteSetting.key='requireAdminTwoFactor' 의 boolean value 를 읽는다.
 * 키가 없으면 false (기본 비활성).
 */
export async function isAdminTwoFactorRequired(
  prisma: Pick<PrismaClient, 'siteSetting'>,
): Promise<boolean> {
  const setting = await prisma.siteSetting.findFirst({
    where: { key: 'requireAdminTwoFactor' },
  });
  if (!setting) return false;
  return setting.value === true;
}

/**
 * session 에 twoFactorVerified === true 가 있을 때만 통과.
 *
 * SPEC-AUTH-001 의 실제 OTP 흐름이 구현되면 이 플래그를 채운다.
 * 현재는 기본 false (플래그 없음 = 미인증).
 */
export function isSessionTwoFactorVerified(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== 'object') return false;
  return (user as Record<string, unknown>).twoFactorVerified === true;
}
