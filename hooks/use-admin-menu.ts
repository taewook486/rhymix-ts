/**
 * @MX:NOTE: Re-export useAdminMenu hook from provider for cleaner imports
 * SPEC: SPEC-ADMIN-MENU-001
 *
 * Usage:
 *   import { useAdminMenu } from '@/hooks/use-admin-menu'
 *
 * This hook provides access to:
 *   - visibleMenuItems: Menu items filtered by user permissions
 *   - activePath: Current active pathname
 *   - locale: Current locale from URL
 *   - localePrefix: Locale prefix for navigation
 *   - menuGroupStates: Menu group expansion states
 *   - toggleMenuGroup: Toggle a menu group's expansion
 *   - isActive: Check if a path is active
 *   - getTitle: Get title based on current locale
 *   - userPermissions: User permissions for menu filtering
 *   - isLoadingPermissions: Loading state for permissions
 */

export { useAdminMenu, type AdminMenuContextType } from '@/providers/AdminMenuProvider'
