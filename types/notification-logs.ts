/**
 * Notification Logs Types
 * WHW-070: SMTP 설정 (Email Delivery Settings)
 * WHW-071: SMS/Push 발송 설정 (SMS/Push Delivery Settings)
 * WHW-072: 발송 로그 (Delivery Logs)
 */

import type { NotificationChannel, NotificationType } from './notification-settings'

/**
 * 발송 상태 (Delivery Status)
 */
export type NotificationStatus =
  | 'pending' // 대기 중
  | 'sending' // 발송 중
  | 'sent' // 발송 완료
  | 'failed' // 발송 실패 (재시도 가능)
  | 'bounced' // 반송 (유효하지 않은 주소)
  | 'rejected' // 거부 (스팸 등)

/**
 * 알림 레퍼런스 타입 (Reference Type)
 */
export type NotificationReferenceType =
  | 'document' // 게시글
  | 'comment' // 댓글
  | 'message' // 쪽지
  | 'board' // 게시판
  | 'member' // 회원
  | 'system' // 시스템

/**
 * 알림 발송 설정 (Notification Delivery Settings)
 * WHW-070, WHW-071
 */
export interface NotificationDeliverySettings {
  id: string

  // WHW-070: SMTP 설정
  smtp_enabled: boolean
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password: string | null // Encrypted
  smtp_encryption: 'none' | 'ssl' | 'tls'
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_reply_to: string | null
  smtp_max_recipients: number // 1-1000
  smtp_timeout_seconds: number // 1-300

  // WHW-071: SMS 발송 설정
  sms_enabled: boolean
  sms_provider: 'default' | 'twilio' | 'nexmo' | 'alphasms' | 'custom'
  sms_api_key: string | null // Encrypted
  sms_api_secret: string | null // Encrypted
  sms_from_number: string | null
  sms_max_length: number // 1-1000
  sms_encoding: 'utf8' | 'euckr'
  sms_timeout_seconds: number // 1-60

  // Push 알림 설정
  push_enabled: boolean
  push_provider: 'fcm' | 'apns' | 'onesignal' | 'custom'
  push_api_key: string | null // Encrypted
  push_apns_key_id: string | null
  push_apns_team_id: string | null
  push_apns_bundle_id: string | null
  push_fcm_server_key: string | null // Encrypted
  push_fcm_sender_id: string | null
  push_ttl_seconds: number
  push_sound: string

  // Web 알림 설정
  web_enabled: boolean
  web_require_permission: boolean
  web_vapid_public_key: string | null
  web_vapid_private_key: string | null // Encrypted
  web_subject: string

  // 발송 제한 설정
  rate_limit_enabled: boolean
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  rate_limit_per_day: number

  // 발송 재시도 설정
  retry_enabled: boolean
  retry_max_attempts: number // 1-10
  retry_delay_seconds: number // >= 10
  retry_backoff_multiplier: number // 1.0-5.0

  created_at: string
  updated_at: string
}

export type NotificationDeliverySettingsUpdate = Partial<
  Omit<
    NotificationDeliverySettings,
    'id' | 'created_at' | 'updated_at'
  >
>

/**
 * 안전한 발송 설정 (비밀 정보 제외)
 */
export interface SafeNotificationDeliverySettings {
  id: string
  smtp_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  web_enabled: boolean
  rate_limit_enabled: boolean
  retry_enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * 알림 발송 로그 (Notification Log)
 * WHW-072
 */
export interface NotificationLog {
  id: string

  // 수신자 정보
  user_id: string | null
  recipient_address: string | null // Email, phone, device token

  // 알림 내용
  notification_type: NotificationType
  channel: NotificationChannel
  subject: string | null
  content: string | null

  // 발송 상태
  status: NotificationStatus
  error_message: string | null
  error_code: string | null

  // 발송 메타데이터
  external_id: string | null // External provider message ID
  template_id: string | null
  priority: number // 1-10 (1=highest)

  // 재시도 추적
  retry_count: number
  max_retries: number
  next_retry_at: string | null

  // 관련 컨텐츠 참조
  reference_type: NotificationReferenceType | null
  reference_id: string | null

  // 클라이언트 정보
  ip_address: string | null
  user_agent: string | null

  // 타임스탬프
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
}

export type NotificationLogCreate = Omit<
  NotificationLog,
  'id' | 'created_at' | 'sent_at' | 'delivered_at' | 'read_at' | 'retry_count'
>

/**
 * 일일 알림 통계 (Daily Notification Statistics)
 */
export interface NotificationDailyStats {
  date: string
  notification_type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  count: number
  unique_recipients: number
}

/**
 * 사용자 알림 통계 (User Notification Statistics)
 */
export interface UserNotificationStats {
  total_sent: number
  total_delivered: number
  total_failed: number
  delivery_rate: number // Percentage
  by_channel: Record<NotificationChannel, number>
  by_type: Record<NotificationType, number>
}

/**
 * 발송 상태 라벨 (한국어)
 */
export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: '대기 중',
  sending: '발송 중',
  sent: '발송 완료',
  failed: '발송 실패',
  bounced: '반송',
  rejected: '거부',
} as const

/**
 * 발송 상태별 색상 (UI용)
 */
export const NOTIFICATION_STATUS_COLORS: Record<NotificationStatus, string> = {
  pending: 'gray',
  sending: 'blue',
  sent: 'green',
  failed: 'red',
  bounced: 'orange',
  rejected: 'red',
} as const

/**
 * 레퍼런스 타입 라벨 (한국어)
 */
export const REFERENCE_TYPE_LABELS: Record<NotificationReferenceType, string> = {
  document: '게시글',
  comment: '댓글',
  message: '쪽지',
  board: '게시판',
  member: '회원',
  system: '시스템',
} as const

/**
 * SMYP 제공자 라벨
 */
export const SMS_PROVIDER_LABELS: Record<
  NotificationDeliverySettings['sms_provider'],
  string
> = {
  default: '기본',
  twilio: 'Twilio',
  nexmo: 'Nexmo (Vonage)',
  alphasms: 'AlphaSMS',
  custom: '사용자 정의',
} as const

/**
 * Push 제공자 라벨
 */
export const PUSH_PROVIDER_LABELS: Record<
  NotificationDeliverySettings['push_provider'],
  string
> = {
  fcm: 'Firebase Cloud Messaging',
  apns: 'Apple Push Notification Service',
  onesignal: 'OneSignal',
  custom: '사용자 정의',
} as const

/**
 * SMTP 암호화 방식 라벨
 */
export const SMTP_ENCRYPTION_LABELS: Record<
  NotificationDeliverySettings['smtp_encryption'],
  string
> = {
  none: '사용 안 함',
  ssl: 'SSL',
  tls: 'TLS',
} as const

/**
 * 유효성 검증 헬퍼 함수들
 */

/**
 * 발송이 성공했는지 확인
 */
export function isDeliverySuccess(status: NotificationStatus): boolean {
  return status === 'sent'
}

/**
 * 발송이 실패했는지 확인
 */
export function isDeliveryFailure(status: NotificationStatus): boolean {
  return ['failed', 'bounced', 'rejected'].includes(status)
}

/**
 * 재시도 가능한 상태인지 확인
 */
export function canRetryDelivery(
  log: NotificationLog,
  retryEnabled: boolean
): boolean {
  if (!retryEnabled) {
    return false
  }
  if (log.status !== 'failed') {
    return false
  }
  return log.retry_count < log.max_retries
}

/**
 * 발송 성공률 계산
 */
export function calculateDeliveryRate(
  stats: Pick<UserNotificationStats, 'total_sent' | 'total_delivered'>
): number {
  if (stats.total_sent === 0) {
    return 0
  }
  return (stats.total_delivered / stats.total_sent) * 100
}

/**
 * 다음 재시도 시간 계산
 */
export function calculateNextRetryAt(
  currentRetry: number,
  delaySeconds: number,
  multiplier: number
): Date {
  const delay = delaySeconds * Math.pow(multiplier, currentRetry)
  return new Date(Date.now() + delay * 1000)
}

/**
 * 기본 발송 설정
 */
export const DEFAULT_DELIVERY_SETTINGS: Partial<NotificationDeliverySettings> = {
  smtp_enabled: false,
  sms_enabled: false,
  push_enabled: false,
  web_enabled: true,
  rate_limit_enabled: true,
  rate_limit_per_minute: 60,
  rate_limit_per_hour: 1000,
  rate_limit_per_day: 10000,
  retry_enabled: true,
  retry_max_attempts: 3,
  retry_delay_seconds: 60,
  retry_backoff_multiplier: 2.0,
} as const

/**
 * 기본 SMTP 설정
 */
export const DEFAULT_SMTP_SETTINGS: Partial<
  Pick<NotificationDeliverySettings,
    'smtp_encryption' | 'smtp_max_recipients' | 'smtp_timeout_seconds'
  >
> = {
  smtp_encryption: 'tls',
  smtp_max_recipients: 100,
  smtp_timeout_seconds: 30,
} as const

/**
 * 기본 SMS 설정
 */
export const DEFAULT_SMS_SETTINGS: Partial<
  Pick<NotificationDeliverySettings,
    'sms_provider' | 'sms_max_length' | 'sms_encoding' | 'sms_timeout_seconds'
  >
> = {
  sms_provider: 'default',
  sms_max_length: 90,
  sms_encoding: 'utf8',
  sms_timeout_seconds: 10,
} as const

/**
 * 기본 Push 설정
 */
export const DEFAULT_PUSH_SETTINGS: Partial<
  Pick<NotificationDeliverySettings,
    'push_provider' | 'push_ttl_seconds' | 'push_sound'
  >
> = {
  push_provider: 'fcm',
  push_ttl_seconds: 86400, // 24 hours
  push_sound: 'default',
} as const
