/**
 * Install gate 순수 함수 — REQ-INSTALL-001, REQ-INSTALL-020.
 *
 * middleware.ts 에서 import 하여 사용하며, 미들웨어 본체와 분리된
 * 단위 테스트 가능한 순수 함수를 제공합니다.
 *
 * @MX:ANCHOR: [AUTO] install-gate 진입 여부 판단의 단일 진실 원천 (middleware, MW 테스트에서 호출).
 * @MX:REASON: REQ-INSTALL-001/020 — 모든 비설치 상태 라우팅이 이 함수에서 결정된다.
 * @MX:SPEC: SPEC-INSTALL-001 REQ-INSTALL-001, REQ-INSTALL-020
 */

/**
 * install gate 통과를 허용하는 경로 접두사 목록.
 *
 * REQ-INSTALL-001: /_next/, /favicon.ico, /api/install/* 는 install 리다이렉트 제외.
 * 추가로 /install/* 자체도 제외 (설치 중 루프 방지).
 */
export const INSTALL_BYPASS_PREFIXES = [
  '/_next/',
  '/favicon.ico',
  '/api/install/',
  '/install',
] as const;

/**
 * 주어진 pathname 이 install gate bypass 대상인지 판단.
 *
 * @param pathname — URL의 pathname (예: '/dashboard', '/_next/static/chunk.js')
 * @returns true 이면 install redirect 를 건너뜁니다.
 */
export function isInstallBypassPath(pathname: string): boolean {
  return INSTALL_BYPASS_PREFIXES.some((prefix) => {
    if (prefix === '/favicon.ico') return pathname === prefix;
    return pathname.startsWith(prefix);
  });
}

/**
 * 사이트 설치 완료 여부를 판단하는 인터페이스 (의존성 주입용).
 */
export interface InstallStatusChecker {
  isInstalled: () => Promise<boolean>;
}

/**
 * 요청을 /install 로 리다이렉트해야 하는지 판단.
 *
 * - bypass 경로이면 false (통과)
 * - Site.installedAt IS NOT NULL 이면 false (통과)
 * - 그 외이면 true (리다이렉트 필요)
 *
 * @param pathname — 현재 요청 pathname
 * @param checker  — 설치 여부를 확인하는 함수 (Prisma 직접 호출 또는 캐시)
 */
export async function shouldRedirectToInstall(
  pathname: string,
  checker: InstallStatusChecker,
): Promise<boolean> {
  if (isInstallBypassPath(pathname)) return false;
  const installed = await checker.isInstalled();
  return !installed;
}
