import { z } from 'zod'

// Installation status enum
export const InstallationStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const

export type InstallationStatusType =
  (typeof InstallationStatus)[keyof typeof InstallationStatus]

// Installation step enum (1-5)
export const InstallationStep = {
  WELCOME: 1,
  SUPABASE: 2,
  ADMIN: 3,
  CONFIG: 4,
  COMPLETE: 5,
} as const

export type InstallationStepType =
  (typeof InstallationStep)[keyof typeof InstallationStep]

// Installation status from database
export interface InstallationStatusRecord {
  id: string
  status: InstallationStatusType
  current_step: InstallationStepType
  site_name: string | null
  admin_email: string | null
  admin_user_id: string | null
  timezone: string
  language: string
  supabase_url: string | null
  supabase_anon_key: string | null
  created_at: string
  updated_at: string
}

// Supabase configuration validation
export const supabaseConfigSchema = z.object({
  supabaseUrl: z
    .string()
    .min(1, 'Supabase URL is required')
    .url('Invalid URL format')
    .refine(
      (url) => {
        // Allow local development URLs (localhost, 127.0.0.1)
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1')
        // Allow production Supabase URLs
        const isSupabase = url.includes('supabase.co')
        return isLocalhost || isSupabase
      },
      'URL must be a valid Supabase URL or local development URL (localhost/127.0.0.1)'
    ),
  supabaseAnonKey: z
    .string()
    .min(1, 'Supabase Anon Key is required')
    .min(20, 'Anon Key appears to be too short'),
})

export type SupabaseConfigFormData = z.infer<typeof supabaseConfigSchema>

// Admin account validation (reuses auth patterns)
export const adminAccountSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be at most 100 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
    nickname: z
      .string()
      .min(2, 'Nickname must be at least 2 characters')
      .max(20, 'Nickname must be at most 20 characters'),
    user_id: z
      .string()
      .min(3, 'User ID must be at least 3 characters')
      .max(20, 'User ID must be at most 20 characters')
      .regex(/^[a-z0-9_]+$/, 'User ID can only contain lowercase letters, numbers, and underscores'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type AdminAccountFormData = z.infer<typeof adminAccountSchema>

// Site configuration validation
export const siteConfigSchema = z.object({
  siteName: z
    .string()
    .min(1, 'Site name is required')
    .min(2, 'Site name must be at least 2 characters')
    .max(50, 'Site name must be at most 50 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.enum(['ko', 'en'], {
    required_error: 'Language is required',
  }),
})

export type SiteConfigFormData = z.infer<typeof siteConfigSchema>

// Step labels and descriptions
export const stepLabels: Record<InstallationStepType, string> = {
  1: 'Welcome',
  2: 'Database Setup',
  3: 'Admin Account',
  4: 'Site Configuration',
  5: 'Complete',
}

export const stepDescriptions: Record<InstallationStepType, string> = {
  1: 'Get started with Rhymix TS installation',
  2: 'Configure your Supabase database connection',
  3: 'Create your administrator account',
  4: 'Configure your site settings',
  5: 'Installation complete!',
}

// Available timezones
export const availableTimezones = [
  { value: 'Asia/Seoul', label: 'Seoul (UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'UTC', label: 'UTC' },
]

// Available languages
export const availableLanguages = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
]
