/**
 * Admin Favorites Validation — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * validateFavoriteHref — href 유효성 검증.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-FAV-001~002
 */

/**
 * FAVORITE_MAX_COUNT — 최대 즐겨찾기 개수
 */
export const FAVORITE_MAX_COUNT = 50;

/**
 * validateFavoriteHref — href 유효성 검증
 *
 * /admin/ 경로로 시작하는 path-only 형식만 허용.
 * 프로토콜/호스트 포함 불가.
 *
 * @param href - 검증할 href
 * @returns 유효하면 true
 */
export function validateFavoriteHref(href: string): boolean {
  if (!href || typeof href !== 'string') {
    return false;
  }

  // /admin 또는 /admin/으로 시작해야 함 (루트 어드민 페이지 포함)
  if (!/^\/admin(\/|$)/.test(href)) {
    return false;
  }

  // 프로토콜/호스트 포함 불가 (http://, https://, // 등)
  if (/^(https?:|\/\/)/i.test(href)) {
    return false;
  }

  return true;
}
