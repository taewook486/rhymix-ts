/**
 * Security Settings Types
 * WHW-050: Media Filter
 * WHW-051: Admin Access Control
 * WHW-052: Session Security
 */

export interface SecuritySettings {
  id: string
  // WHW-050: 미디어 필터 (Media Filter)
  mediafilter_whitelist: string
  mediafilter_classes: string
  robot_user_agents: string
  // WHW-051: 관리자 접근 제어 (Admin Access Control)
  admin_allowed_ip: string
  admin_denied_ip: string
  // WHW-052: 세션 보안 (Session Security)
  autologin_lifetime: number
  autologin_refresh: boolean
  use_session_ssl: boolean
  use_cookies_ssl: boolean
  check_csrf_token: boolean
  use_nofollow: boolean
  use_httponly: boolean
  use_samesite: 'Strict' | 'Lax' | 'None'
  x_frame_options: 'DENY' | 'SAMEORIGIN'
  x_content_type_options: 'nosniff'
  created_at: string
  updated_at: string
}

export type SecuritySettingsUpdate = Partial<
  Omit<SecuritySettings, 'id' | 'created_at' | 'updated_at'>
>

/**
 * Media Filter Types (WHW-050)
 */

export interface MediaFilterSettings {
  whitelist: string[]
  classes: string[]
}

/**
 * Access Control Types (WHW-051)
 */

export interface AccessControlSettings {
  allowed_ip: string[]
  denied_ip: string[]
  robot_user_agents: string[]
}

/**
 * Session Security Types (WHW-052)
 */

export interface SessionSecuritySettings {
  autologin_lifetime: number
  autologin_refresh: boolean
  use_session_ssl: boolean
  use_cookies_ssl: boolean
  check_csrf_token: boolean
  use_nofollow: boolean
  use_httponly: boolean
  use_samesite: 'Strict' | 'Lax' | 'None'
  x_frame_options: 'DENY' | 'SAMEORIGIN'
  x_content_type_options: 'nosniff'
}

/**
 * Security Settings Sections
 */

export type SecuritySettingsSection =
  | 'media'
  | 'access'
  | 'session'
