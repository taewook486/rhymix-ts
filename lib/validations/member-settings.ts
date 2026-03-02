import { z } from 'zod'

// Member Settings Zod Schema (matching DB schema from migration 020_member_settings.sql)

export const memberSettingsSchema = z.object({
  // Registration settings
  enable_join: z.boolean(),
  enable_join_key: z.string().optional().nullable(),
  enable_confirm: z.boolean(),
  authmail_expires: z
    .number()
    .int()
    .min(60, 'Must be at least 60 seconds (1 minute)')
    .max(604800, 'Must be at most 604800 seconds (7 days)')
    .default(86400), // 24 hours

  // Profile settings
  member_profile_view: z.enum(['everyone', 'member', 'admin']).default('member'),
  allow_nickname_change: z.boolean(),
  update_nickname_log: z.boolean(),
  nickname_symbols: z.boolean(),
  nickname_spaces: z.boolean(),
  allow_duplicate_nickname: z.boolean(),

  // Password settings
  password_strength: z.enum(['weak', 'normal', 'strong']).default('normal'),
  password_hashing_algorithm: z.enum(['bcrypt', 'argon2']).default('bcrypt'),
  password_hashing_work_factor: z
    .number()
    .int()
    .min(4, 'Work factor must be at least 4')
    .max(15, 'Work factor must be at most 15')
    .default(10),
  password_hashing_auto_upgrade: z.boolean(),
  password_change_invalidate_other_sessions: z.boolean(),
  password_reset_method: z.enum(['email', 'question', 'admin']).default('email'),
})

export type MemberSettings = z.infer<typeof memberSettingsSchema>

// API Response types
export interface MemberSettingsResponse {
  success: boolean
  data?: MemberSettings
  error?: string
  message?: string
}

// Form data type (matches MemberSettings but with optional fields for partial updates)
export type MemberSettingsFormData = Partial<MemberSettings>

// Validation schema for form updates (all fields optional)
export const memberSettingsUpdateSchema = memberSettingsSchema.partial()
