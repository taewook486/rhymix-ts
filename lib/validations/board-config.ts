import { z } from 'zod'

/**
 * Board Configuration Zod Schemas
 * Validates board settings for WHW-020 (Basic), WHW-021 (Content), WHW-022 (Comments)
 * Extends existing BoardConfig interface from types/board.ts
 */

// =====================================================
// WHW-020: Board Basic Settings
// =====================================================

export const boardBasicSettingsSchema = z.object({
  // Module and layout configuration
  module_category: z.string().max(100).optional(),
  layout_srl: z.string().uuid().nullable().optional(),
  skin_srl: z.string().uuid().nullable().optional(),

  // Mobile settings
  use_mobile: z.boolean().optional(),
  mobile_layout_srl: z.string().uuid().nullable().optional(),
  mobile_skin_srl: z.string().uuid().nullable().optional(),

  // Content areas
  description: z.string().max(1000).nullable().optional(),
  header_content: z.string().max(5000).nullable().optional(),
  footer_content: z.string().max(5000).nullable().optional(),
})

// =====================================================
// WHW-021: Board Content Settings
// =====================================================

export const boardContentSettingsSchema = z.object({
  // History and version control
  history_tracking: z.enum(['none', 'update', 'history']).optional(),

  // Voting system
  use_vote_up: z.boolean().optional(),
  use_vote_down: z.boolean().optional(),
  vote_up_level: z.enum(['public', 'member', 'disabled']).optional(),
  vote_down_level: z.enum(['public', 'member', 'disabled']).optional(),
  allow_vote_same_ip: z.boolean().optional(),
  cancel_vote: z.boolean().optional(),
  allow_vote_guest: z.boolean().optional(),

  // Reporting system
  use_report: z.boolean().optional(),
  report_target: z.enum(['admin', 'all']).optional(),
})

// =====================================================
// WHW-022: Comment Settings
// =====================================================

export const commentSettingsSchema = z.object({
  // Pagination
  comment_count: z
    .number()
    .int('Comment count must be an integer')
    .min(5, 'Minimum 5 comments per page')
    .max(100, 'Maximum 100 comments per page')
    .optional(),
  comment_page_count: z
    .number()
    .int('Comment page count must be an integer')
    .min(5, 'Minimum 5 pages')
    .max(50, 'Maximum 50 pages')
    .optional(),

  // Threading
  comment_max_depth: z
    .number()
    .int('Comment max depth must be an integer')
    .min(0, 'Minimum depth is 0 (flat comments)')
    .max(10, 'Maximum depth is 10')
    .optional(),

  // Display
  comment_default_page: z.enum(['first', 'last']).optional(),
})

// =====================================================
// Existing Board Settings (from types/board.ts)
// Preserved for backward compatibility
// =====================================================

export const existingBoardSettingsSchema = z.object({
  // Permission settings
  post_permission: z.enum(['all', 'member', 'admin']).optional(),
  comment_permission: z.enum(['all', 'member', 'admin']).optional(),

  // List and pagination
  list_count: z.number().int().min(1).max(200).optional(),
  search_list_count: z.number().int().min(1).max(200).optional(),
  page_count: z.number().int().min(1).max(50).optional(),

  // Feature toggles
  anonymous: z.boolean().optional(),
  use_category: z.boolean().optional(),
  use_tags: z.boolean().optional(),
  use_editor: z.boolean().optional(),
  use_file: z.boolean().optional(),

  // File upload settings
  max_file_size: z.number().int().min(0).max(104857600).optional(), // Max 100MB
  allowed_file_extensions: z.array(z.string()).optional(),
  max_file_count: z.number().int().min(0).max(100).optional(),

  // Thumbnail settings
  thumbnail_type: z.string().max(50).optional(),
  thumbnail_width: z.number().int().min(0).max(4096).optional(),
  thumbnail_height: z.number().int().min(0).max(4096).optional(),

  // Security and protection
  allow_captcha: z.boolean().optional(),
  allow_anonymous: z.boolean().optional(),
  allow_signup: z.boolean().optional(),
  hide_category: z.boolean().optional(),
  list_categories: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  protect_comment: z.boolean().optional(),
  protect_view_count: z.boolean().optional(),
  protect_voted_count: z.boolean().optional(),
  protect_blamed_count: z.boolean().optional(),
  protect_noticed: z.boolean().optional(),
  protect_secret: z.boolean().optional(),
  protect_document_category: z.boolean().optional(),
  non_login_vote: z.boolean().optional(),
  only_image: z.boolean().optional(),
  only_image_extension: z.array(z.string()).optional(),
  disable_copy: z.boolean().optional(),
})

// =====================================================
// Combined Board Config Schema
// =====================================================

/**
 * Complete board configuration schema combining all settings
 * Includes existing fields for backward compatibility
 */
export const boardConfigSchema = existingBoardSettingsSchema
  .merge(boardBasicSettingsSchema)
  .merge(boardContentSettingsSchema)
  .merge(commentSettingsSchema)

/**
 * Schema for partial updates (all fields optional)
 * Used when updating specific board settings
 */
export const boardConfigUpdateSchema = boardConfigSchema.partial()

// =====================================================
// Type Exports
// =====================================================

/**
 * Complete board configuration type inferred from schema
 */
export type BoardConfigFormData = z.infer<typeof boardConfigUpdateSchema>

/**
 * Full board configuration (all fields required for creation)
 */
export type BoardConfigData = z.infer<typeof boardConfigSchema>

/**
 * Basic settings only (WHW-020)
 */
export type BoardBasicSettings = z.infer<typeof boardBasicSettingsSchema>

/**
 * Content settings only (WHW-021)
 */
export type BoardContentSettings = z.infer<typeof boardContentSettingsSchema>

/**
 * Comment settings only (WHW-022)
 */
export type CommentSettings = z.infer<typeof commentSettingsSchema>

/**
 * API Response type for board configuration operations
 */
export interface BoardConfigResponse {
  success: boolean
  data?: BoardConfigFormData
  error?: string
  message?: string
}

// =====================================================
// Validation Helpers
// =====================================================

/**
 * Validates board basic settings (WHW-020)
 */
export function validateBasicSettings(data: unknown) {
  return boardBasicSettingsSchema.safeParse(data)
}

/**
 * Validates board content settings (WHW-021)
 */
export function validateContentSettings(data: unknown) {
  return boardContentSettingsSchema.safeParse(data)
}

/**
 * Validates comment settings (WHW-022)
 */
export function validateCommentSettings(data: unknown) {
  return commentSettingsSchema.safeParse(data)
}

/**
 * Validates complete board configuration update
 */
export function validateBoardConfigUpdate(data: unknown) {
  return boardConfigUpdateSchema.safeParse(data)
}
