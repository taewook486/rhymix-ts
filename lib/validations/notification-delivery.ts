/**
 * Notification Delivery Validation Schemas
 * Zod schemas for notification delivery settings and logs validation
 * WHW-070: SMTP 설정 (Email Delivery Settings)
 * WHW-071: SMS/Push 발송 설정 (SMS/Push Delivery Settings)
 * WHW-072: 발송 로그 (Delivery Logs)
 */

import { z } from 'zod'

/**
 * WHW-070: SMTP 설정 스키마
 */
export const smtpSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1, 'SMTP 호스트는 필수입니다').nullable().optional(),
  port: z
    .number()
    .int('정수여야 합니다')
    .min(1, '포트는 1 이상이어야 합니다')
    .max(65535, '포트는 65535 이하여야 합니다')
    .nullable()
    .optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  encryption: z.enum(['none', 'ssl', 'tls'], {
    errorMap: () => ({ message: '유효하지 않은 암호화 방식입니다' }),
  }),
  from_email: z
    .string()
    .email('유효한 이메일 주소여야 합니다')
    .nullable()
    .optional(),
  from_name: z.string().nullable().optional(),
  reply_to: z
    .string()
    .email('유효한 이메일 주소여야 합니다')
    .nullable()
    .optional(),
  max_recipients: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1 이상이어야 합니다')
    .max(1000, '최대 1000 이하여야 합니다')
    .nullable()
    .optional(),
  timeout_seconds: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1초 이상이어야 합니다')
    .max(300, '최대 300초 이하여야 합니다')
    .nullable()
    .optional(),
})

/**
 * WHW-071: SMS 발송 설정 스키마
 */
export const smsSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['default', 'twilio', 'nexmo', 'alphasms', 'custom'], {
    errorMap: () => ({ message: '유효하지 않은 SMS 제공자입니다' }),
  }),
  api_key: z.string().nullable().optional(),
  api_secret: z.string().nullable().optional(),
  from_number: z.string().nullable().optional(),
  max_length: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1자 이상이어야 합니다')
    .max(1000, '최대 1000자 이하여야 합니다')
    .nullable()
    .optional(),
  encoding: z.enum(['utf8', 'euckr'], {
    errorMap: () => ({ message: '유효하지 않은 인코딩 방식입니다' }),
  }),
  timeout_seconds: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1초 이상이어야 합니다')
    .max(60, '최대 60초 이하여야 합니다')
    .nullable()
    .optional(),
})

/**
 * Push 알림 설정 스키마
 */
export const pushSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['fcm', 'apns', 'onesignal', 'custom'], {
    errorMap: () => ({ message: '유효하지 않은 Push 제공자입니다' }),
  }),
  api_key: z.string().nullable().optional(),
  apns_key_id: z.string().nullable().optional(),
  apns_team_id: z.string().nullable().optional(),
  apns_bundle_id: z.string().nullable().optional(),
  fcm_server_key: z.string().nullable().optional(),
  fcm_sender_id: z.string().nullable().optional(),
  ttl_seconds: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1초 이상이어야 합니다')
    .nullable()
    .optional(),
  sound: z.string().nullable().optional(),
})

/**
 * Web 알림 설정 스키마
 */
export const webSettingsSchema = z.object({
  enabled: z.boolean(),
  require_permission: z.boolean(),
  vapid_public_key: z.string().nullable().optional(),
  vapid_private_key: z.string().nullable().optional(),
  subject: z
    .string()
    .email('유효한 이메일 주소여야 합니다')
    .nullable()
    .optional(),
})

/**
 * 발송 제한 설정 스키마
 */
export const rateLimitSettingsSchema = z.object({
  enabled: z.boolean(),
  per_minute: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1 이상이어야 합니다')
    .nullable()
    .optional(),
  per_hour: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1 이상이어야 합니다')
    .nullable()
    .optional(),
  per_day: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1 이상이어야 합니다')
    .nullable()
    .optional(),
})

/**
 * 재시도 설정 스키마
 */
export const retrySettingsSchema = z.object({
  enabled: z.boolean(),
  max_attempts: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1회 이상이어야 합니다')
    .max(10, '최대 10회 이하여야 합니다')
    .nullable()
    .optional(),
  delay_seconds: z
    .number()
    .int('정수여야 합니다')
    .min(10, '최소 10초 이상이어야 합니다')
    .nullable()
    .optional(),
  backoff_multiplier: z
    .number()
    .min(1.0, '최소 1.0 이상이어야 합니다')
    .max(5.0, '최대 5.0 이하여야 합니다')
    .nullable()
    .optional(),
})

/**
 * WHW-070, WHW-071: 전체 발송 설정 스키마
 */
export const notificationDeliverySettingsSchema = z.object({
  // SMTP 설정
  smtp_enabled: z.boolean(),
  smtp_host: z.string().nullable().optional(),
  smtp_port: z.number().int().min(1).max(65535).nullable().optional(),
  smtp_username: z.string().nullable().optional(),
  smtp_password: z.string().nullable().optional(),
  smtp_encryption: z.enum(['none', 'ssl', 'tls']),
  smtp_from_email: z.string().email().nullable().optional(),
  smtp_from_name: z.string().nullable().optional(),
  smtp_reply_to: z.string().email().nullable().optional(),
  smtp_max_recipients: z.number().int().min(1).max(1000),
  smtp_timeout_seconds: z.number().int().min(1).max(300),

  // SMS 설정
  sms_enabled: z.boolean(),
  sms_provider: z.enum(['default', 'twilio', 'nexmo', 'alphasms', 'custom']),
  sms_api_key: z.string().nullable().optional(),
  sms_api_secret: z.string().nullable().optional(),
  sms_from_number: z.string().nullable().optional(),
  sms_max_length: z.number().int().min(1).max(1000),
  sms_encoding: z.enum(['utf8', 'euckr']),
  sms_timeout_seconds: z.number().int().min(1).max(60),

  // Push 설정
  push_enabled: z.boolean(),
  push_provider: z.enum(['fcm', 'apns', 'onesignal', 'custom']),
  push_api_key: z.string().nullable().optional(),
  push_apns_key_id: z.string().nullable().optional(),
  push_apns_team_id: z.string().nullable().optional(),
  push_apns_bundle_id: z.string().nullable().optional(),
  push_fcm_server_key: z.string().nullable().optional(),
  push_fcm_sender_id: z.string().nullable().optional(),
  push_ttl_seconds: z.number().int().min(1),
  push_sound: z.string(),

  // Web 설정
  web_enabled: z.boolean(),
  web_require_permission: z.boolean(),
  web_vapid_public_key: z.string().nullable().optional(),
  web_vapid_private_key: z.string().nullable().optional(),
  web_subject: z.string().email(),

  // 발송 제한
  rate_limit_enabled: z.boolean(),
  rate_limit_per_minute: z.number().int().min(1),
  rate_limit_per_hour: z.number().int().min(1),
  rate_limit_per_day: z.number().int().min(1),

  // 재시도 설정
  retry_enabled: z.boolean(),
  retry_max_attempts: z.number().int().min(1).max(10),
  retry_delay_seconds: z.number().int().min(10),
  retry_backoff_multiplier: z.number().min(1.0).max(5.0),
}).refine(
  (data) => {
    // 최소 하나의 발송 채널이 활성화되어야 함
    return data.smtp_enabled || data.sms_enabled || data.push_enabled || data.web_enabled
  },
  {
    message: '최소 하나 이상의 발송 채널을 활성화해야 합니다',
    path: ['smtp_enabled'],
  }
)

export const notificationDeliverySettingsUpdateSchema =
  notificationDeliverySettingsSchema.partial()

/**
 * WHW-072: 알림 발송 로그 스키마
 */
export const notificationLogSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  recipient_address: z.string().nullable().optional(),
  notification_type: z.enum(['signup', 'login', 'document', 'comment', 'vote', 'scrap', 'mention', 'message', 'system']),
  channel: z.enum(['email', 'sms', 'push', 'web']),
  subject: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  status: z.enum(['pending', 'sending', 'sent', 'failed', 'bounced', 'rejected']),
  error_message: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  retry_count: z.number().int().min(0).optional(),
  max_retries: z.number().int().min(1).optional(),
  next_retry_at: z.string().datetime().nullable().optional(),
  reference_type: z.enum(['document', 'comment', 'message', 'board', 'member', 'system']).nullable().optional(),
  reference_id: z.string().uuid().nullable().optional(),
  ip_address: z.string().ip().nullable().optional(),
  user_agent: z.string().nullable().optional(),
})

export const notificationLogCreateSchema = notificationLogSchema

/**
 * 알림 발송 요청 스키마 (API용)
 */
export const sendNotificationSchema = z.object({
  user_id: z.string().uuid('유효한 사용자 ID여야 합니다'),
  notification_type: z.enum(['signup', 'login', 'document', 'comment', 'vote', 'scrap', 'mention', 'message', 'system']),
  channels: z.array(z.enum(['email', 'sms', 'push', 'web'])).min(1, '최소 하나 이상의 채널을 선택해야 합니다'),
  subject: z.string().min(1, '제목은 필수입니다').max(200, '제목은 200자 이하여야 합니다'),
  content: z.string().min(1, '내용은 필수입니다'),
  priority: z.number().int().min(1).max(10).optional().default(5),
  reference_type: z.enum(['document', 'comment', 'message', 'board', 'member', 'system']).nullable().optional(),
  reference_id: z.string().uuid().nullable().optional(),
})

/**
 * 대량 알림 발송 스키마
 */
export const bulkSendNotificationSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, '최소 한 명 이상의 수신자를 지정해야 합니다').max(1000, '최대 1000명까지 가능합니다'),
  notification_type: z.enum(['signup', 'login', 'document', 'comment', 'vote', 'scrap', 'mention', 'message', 'system']),
  channels: z.array(z.enum(['email', 'sms', 'push', 'web'])).min(1, '최소 하나 이상의 채널을 선택해야 합니다'),
  subject: z.string().min(1, '제목은 필수입니다').max(200, '제목은 200자 이하여야 합니다'),
  content: z.string().min(1, '내용은 필수입니다'),
  priority: z.number().int().min(1).max(10).optional().default(5),
  reference_type: z.enum(['document', 'comment', 'message', 'board', 'member', 'system']).nullable().optional(),
  reference_id: z.string().uuid().nullable().optional(),
})

/**
 * 발송 로그 필터 스키마
 */
export const notificationLogFilterSchema = z.object({
  user_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'sending', 'sent', 'failed', 'bounced', 'rejected']).optional(),
  notification_type: z.enum(['signup', 'login', 'document', 'comment', 'vote', 'scrap', 'mention', 'message', 'system']).optional(),
  channel: z.enum(['email', 'sms', 'push', 'web']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
})

/**
 * Form Data Types
 */
export type SmtpSettingsFormData = z.infer<typeof smtpSettingsSchema>
export type SmsSettingsFormData = z.infer<typeof smsSettingsSchema>
export type PushSettingsFormData = z.infer<typeof pushSettingsSchema>
export type WebSettingsFormData = z.infer<typeof webSettingsSchema>
export type RateLimitSettingsFormData = z.infer<typeof rateLimitSettingsSchema>
export type RetrySettingsFormData = z.infer<typeof retrySettingsSchema>
export type NotificationDeliverySettingsFormData = z.infer<typeof notificationDeliverySettingsSchema>
export type NotificationLogFormData = z.infer<typeof notificationLogSchema>
export type SendNotificationFormData = z.infer<typeof sendNotificationSchema>
export type BulkSendNotificationFormData = z.infer<typeof bulkSendNotificationSchema>
export type NotificationLogFilterFormData = z.infer<typeof notificationLogFilterSchema>

/**
 * 커스텀 에러 메시지 (한국어)
 */
export const notificationDeliveryErrorMessages = {
  smtp: {
    host: 'SMTP 호스트를 입력해주세요',
    port: '포트는 1-65535 사이의 숫자여야 합니다',
    from_email: '발신자 이메일 형식이 올바르지 않습니다',
    reply_to: '회신 이메일 형식이 올바르지 않습니다',
  },
  sms: {
    api_key: 'SMS API 키를 입력해주세요',
    from_number: '발신자 번호를 입력해주세요',
    max_length: 'SMS 최대 길이는 1-1000자 사이여야 합니다',
  },
  push: {
    fcm_server_key: 'FCM 서버 키를 입력해주세요',
    fcm_sender_id: 'FCM 발신자 ID를 입력해주세요',
  },
  rate_limit: {
    per_minute: '분당 발송 제한은 1 이상이어야 합니다',
    per_hour: '시간당 발송 제한은 1 이상이어야 합니다',
    per_day: '일일 발송 제한은 1 이상이어야 합니다',
  },
  retry: {
    max_attempts: '최대 재시도 횟수는 1-10회 사이여야 합니다',
    delay_seconds: '재시도 지연 시간은 최소 10초 이상이어야 합니다',
    backoff_multiplier: '지연 배수는 1.0-5.0 사이여야 합니다',
  },
  at_least_one_channel: '최소 하나 이상의 발송 채널을 활성화해야 합니다',
} as const

/**
 * 유효성 검증 헬퍼 함수
 */

/**
 * SMTP 연결 정보 유효성 검증
 */
export function validateSmtpConnection(settings: SmtpSettingsFormData): {
  valid: boolean
  error?: string
} {
  if (settings.enabled) {
    if (!settings.host) {
      return { valid: false, error: 'SMTP 호스트는 필수입니다' }
    }
    if (!settings.port) {
      return { valid: false, error: 'SMTP 포트는 필수입니다' }
    }
  }
  return { valid: true }
}

/**
 * SMS 연결 정보 유효성 검증
 */
export function validateSmsConnection(settings: SmsSettingsFormData): {
  valid: boolean
  error?: string
} {
  if (settings.enabled) {
    if (!settings.api_key) {
      return { valid: false, error: 'SMS API 키는 필수입니다' }
    }
    if (settings.provider !== 'default' && !settings.from_number) {
      return { valid: false, error: '발신자 번호는 필수입니다' }
    }
  }
  return { valid: true }
}

/**
 * Push 연결 정보 유효성 검증
 */
export function validatePushConnection(settings: PushSettingsFormData): {
  valid: boolean
  error?: string
} {
  if (settings.enabled) {
    if (settings.provider === 'fcm' && !settings.fcm_server_key) {
      return { valid: false, error: 'FCM 서버 키는 필수입니다' }
    }
    if (settings.provider === 'apns' && !settings.apns_key_id) {
      return { valid: false, error: 'APNS 키 ID는 필수입니다' }
    }
  }
  return { valid: true }
}

/**
 * 발송 제한 설정 유효성 검증
 */
export function validateRateLimits(settings: RateLimitSettingsFormData): {
  valid: boolean
  error?: string
} {
  if (settings.enabled) {
    const perMinute = settings.per_minute ?? 60
    const perHour = settings.per_hour ?? 1000
    const perDay = settings.per_day ?? 10000

    if (perMinute > perHour) {
      return { valid: false, error: '분당 제한은 시간당 제한보다 작거나 같아야 합니다' }
    }
    if (perHour > perDay) {
      return { valid: false, error: '시간당 제한은 일일 제한보다 작거나 같아야 합니다' }
    }
  }
  return { valid: true }
}

/**
 * 기본 발송 설정
 */
export const defaultDeliverySettings: Partial<NotificationDeliverySettingsFormData> = {
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
  smtp_encryption: 'tls',
  smtp_max_recipients: 100,
  smtp_timeout_seconds: 30,
  sms_provider: 'default',
  sms_max_length: 90,
  sms_encoding: 'utf8',
  sms_timeout_seconds: 10,
  push_provider: 'fcm',
  push_ttl_seconds: 86400,
  push_sound: 'default',
  web_require_permission: true,
  web_subject: 'mailto:admin@example.com',
}
