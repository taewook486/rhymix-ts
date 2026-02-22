/**
 * Widget Types
 *
 * Type definitions for the widget system
 */

import { ReactNode } from 'react'

/**
 * Base widget props
 */
export interface WidgetBaseProps {
  /** Widget title */
  title: string
  /** Optional description */
  description?: string
  /** Show "More" link */
  showMoreLink?: boolean
  /** URL for "More" link */
  moreLink?: string
  /** Additional CSS classes */
  className?: string
  /** Custom action button */
  action?: ReactNode
}

/**
 * Post data for widgets
 */
export interface WidgetPost {
  id: string
  title: string
  excerpt?: string | null
  thumbnail_url?: string | null
  created_at: string
  view_count: number
  comment_count: number
  board_id: string
  board_slug?: string
  is_notice?: boolean
  author?: {
    display_name: string | null
  } | null
  category?: {
    id: string
    name: string
    slug: string
  } | null
}

/**
 * Recent posts widget props
 */
export interface RecentPostsWidgetProps extends WidgetBaseProps {
  /** Board slug to fetch posts from */
  boardSlug?: string
  /** Board ID to fetch posts from */
  boardId?: string
  /** Pre-fetched posts (for server-side rendering) */
  posts?: WidgetPost[]
  /** Number of posts to show */
  limit?: number
  /** Show thumbnails */
  showThumbnail?: boolean
  /** Show excerpt */
  showExcerpt?: boolean
}

/**
 * Notice widget props
 */
export interface NoticeWidgetProps extends Omit<WidgetBaseProps, 'title'> {
  /** Custom title (defaults to "Notice") */
  title?: string
  /** Board slug to fetch notices from */
  boardSlug?: string
  /** Pre-fetched notices (for server-side rendering) */
  notices?: WidgetPost[]
  /** Number of notices to show */
  limit?: number
}

/**
 * Widget container props
 */
export interface WidgetContainerProps {
  /** Widget children */
  children: React.ReactNode
  /** Widget title */
  title: string
  /** Optional description */
  description?: string
  /** Show "More" link */
  showMoreLink?: boolean
  /** URL for "More" link */
  moreLink?: string
  /** Additional CSS classes */
  className?: string
  /** Custom action element */
  action?: ReactNode
  /** Use highlighted style (for notices) */
  highlighted?: boolean
}
