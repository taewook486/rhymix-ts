/**
 * @MX:ANCHOR: Admin menu type definitions
 * @MX:REASON: Central type definitions for admin navigation system
 * SPEC: SPEC-ADMIN-MENU-001
 */

import type { LucideIcon } from 'lucide-react'

/**
 * Child navigation item in admin menu
 * Represents a sub-menu item under a parent category
 */
export interface NavChildItem {
  /** English title for the menu item */
  title: string
  /** Korean title for the menu item */
  titleKo: string
  /** Navigation path (without locale prefix) */
  href: string
  /** Permission required to view this item */
  permission: string
}

/**
 * Parent navigation item in admin menu
 * Represents a top-level menu category with optional children
 */
export interface NavItem {
  /** English title for the menu category */
  title: string
  /** Korean title for the menu category */
  titleKo: string
  /** Navigation path (without locale prefix) */
  href: string
  /** Icon component from lucide-react */
  icon: LucideIcon
  /** Permission required to view this category */
  permission: string
  /** Optional child menu items */
  children?: NavChildItem[]
}

/**
 * Array type for admin menu items
 */
export type AdminMenuItems = NavItem[]

/**
 * Supported locale codes for admin navigation
 */
export type AdminLocale = 'ko' | 'en' | 'ja' | 'zh'

/**
 * User permission information for menu filtering
 */
export interface AdminUserPermissions {
  /** User's role (e.g., 'admin', 'super_admin') */
  role: string
  /** List of permission strings the user has */
  permissions: string[]
}

/**
 * Menu group expansion state
 * Maps menu href to its expanded/collapsed state
 */
export type MenuGroupStates = Record<string, boolean>
