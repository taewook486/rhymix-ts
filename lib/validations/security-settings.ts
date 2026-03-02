/**
 * Security Settings Validation Schemas
 * Zod schemas for security settings validation (WHW-050, WHW-051, WHW-052)
 */

import { z } from 'zod'

// IP address validation helper
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/\d{1,3})?$/

const ipAddressListSchema = z.string().refine(
  (val) => {
    if (!val.trim()) return true // Empty is valid
    const ips = val.split(',').map((ip) => ip.trim())
    return ips.every((ip) => ipv4Regex.test(ip) || ipv6Regex.test(ip))
  },
  { message: '유효하지 않은 IP 주소 형식입니다' }
)

export const securitySettingsSchema = z.object({
  // WHW-050: 미디어 필터 (Media Filter)
  mediafilter_whitelist: z.string().max(5000, '5000자 이하여야 합니다'),
  mediafilter_classes: z.string().max(5000, '5000자 이하여야 합니다'),
  robot_user_agents: z.string().max(5000, '5000자 이하여야 합니다'),

  // WHW-051: 관리자 접근 제어 (Admin Access Control)
  admin_allowed_ip: ipAddressListSchema,
  admin_denied_ip: ipAddressListSchema,

  // WHW-052: 세션 보안 (Session Security)
  autologin_lifetime: z
    .number()
    .int('정수여야 합니다')
    .min(0, '0 이상이어야 합니다')
    .max(31536000, '최대 1년(31536000초) 이하여야 합니다'),
  autologin_refresh: z.boolean(),
  use_session_ssl: z.boolean(),
  use_cookies_ssl: z.boolean(),
  check_csrf_token: z.boolean(),
  use_nofollow: z.boolean(),
  use_httponly: z.boolean(),
  use_samesite: z.enum(['Strict', 'Lax', 'None'], {
    errorMap: () => ({ message: '유효하지 않은 SameSite 값입니다' }),
  }),
  x_frame_options: z.enum(['DENY', 'SAMEORIGIN'], {
    errorMap: () => ({ message: '유효하지 않은 X-Frame-Options 값입니다' }),
  }),
  x_content_type_options: z.literal('nosniff', {
    errorMap: () => ({ message: '유효하지 않은 X-Content-Type-Options 값입니다' }),
  }),
})

export const securitySettingsUpdateSchema = securitySettingsSchema.partial()

/**
 * Form Data Types
 */

export type SecuritySettingsFormData = z.infer<typeof securitySettingsSchema>

/**
 * Section-Specific Schemas
 */

// WHW-050: Media Filter
export const mediaFilterSettingsSchema = z.object({
  mediafilter_whitelist: z.string().max(5000),
  mediafilter_classes: z.string().max(5000),
  robot_user_agents: z.string().max(5000),
})

export type MediaFilterSettingsFormData = z.infer<typeof mediaFilterSettingsSchema>

// WHW-051: Admin Access Control
export const accessControlSettingsSchema = z.object({
  admin_allowed_ip: ipAddressListSchema,
  admin_denied_ip: ipAddressListSchema,
})

export type AccessControlSettingsFormData = z.infer<typeof accessControlSettingsSchema>

// WHW-052: Session Security
export const sessionSecuritySettingsSchema = z.object({
  autologin_lifetime: z.number().int().min(0).max(31536000),
  autologin_refresh: z.boolean(),
  use_session_ssl: z.boolean(),
  use_cookies_ssl: z.boolean(),
  check_csrf_token: z.boolean(),
  use_nofollow: z.boolean(),
  use_httponly: z.boolean(),
  use_samesite: z.enum(['Strict', 'Lax', 'None']),
  x_frame_options: z.enum(['DENY', 'SAMEORIGIN']),
  x_content_type_options: z.literal('nosniff'),
})

export type SessionSecuritySettingsFormData = z.infer<typeof sessionSecuritySettingsSchema>
