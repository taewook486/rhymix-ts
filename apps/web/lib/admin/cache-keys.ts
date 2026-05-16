/**
 * Admin 메뉴 캐시 키 — SPEC-ADMIN-001 Slice D.
 *
 * admin / public 메뉴 캐시 키의 single source of truth.
 * 실제 unstable_cache 적용은 캐시 슬라이스에서 수행.
 *
 * @MX:NOTE: [AUTO] REQ-ADMIN-034 admin/public 캐시 키 분리.
 *           admin 메뉴는 isAdminMenu=true 만 포함, public 은 isAdminMenu=false.
 *           실제 cache 적용은 캐시 슬라이스 (REQ-ADMIN-060~063) 에서 수행.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-034
 */

export type MenuCacheScope = 'admin' | 'public'

/**
 * siteId + scope 기반 메뉴 캐시 태그.
 * 예: menuCacheKey(1, 'admin') → 'menu:admin:1'
 *     menuCacheKey(1, 'public') → 'menu:public:1'
 */
export function menuCacheKey(siteId: number, scope: MenuCacheScope): string {
  return `menu:${scope}:${siteId}`
}
