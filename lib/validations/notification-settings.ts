/**
 * Notification Settings Validation Schemas
 * Zod schemas for notification settings validation
 * WHW-060: 알림 유형 (Notification Types)
 * WHW-061: 알림 채널 (Notification Channels)
 * WHW-062: 알림 표시 설정 (Display Settings)
 */

import { z } from 'zod'

/**
 * WHW-060: 알림 유형 스키마
 */
export const notificationTypesSchema = z.object({
  signup: z.boolean(),
  login: z.boolean(),
  document: z.boolean(),
  comment: z.boolean(),
  vote: z.boolean(),
  scrap: z.boolean(),
  mention: z.boolean(),
  message: z.boolean(),
})

/**
 * WHW-061: 알림 채널 스키마
 */
export const notificationChannelsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  web: z.boolean(),
})

/**
 * WHW-062: 전역 알림 설정 스키마
 */
export const notificationSettingsSchema = z.object({
  enable_notification_types: notificationTypesSchema,
  enable_notification_channels: notificationChannelsSchema,

  notification_center_enabled: z.boolean(),
  notification_center_limit: z
    .number()
    .int('정수여야 합니다')
    .min(1, '최소 1 이상이어야 합니다')
    .max(100, '최대 100 이하여야 합니다'),
  notification_center_order: z.enum(['latest', 'oldest', 'type'], {
    errorMap: () => ({ message: '유효하지 않은 정렬 순서입니다' }),
  }),

  realtime_notification_enabled: z.boolean(),
  realtime_notification_sound: z.boolean(),
  realtime_notification_desktop: z.boolean(),

  notification_retention_days: z
    .number()
    .int('정수여야 합니다')
    .min(7, '최소 7일 이상이어야 합니다')
    .max(365, '최대 365일 이하여야 합니다'),
})

export const notificationSettingsUpdateSchema = notificationSettingsSchema.partial()

/**
 * 사용자별 알림 설정 스키마
 */
export const userNotificationSettingsSchema = z.object({
  notification_types: z
    .record(z.enum(['signup', 'login', 'document', 'comment', 'vote', 'scrap', 'mention', 'message']), z.boolean())
    .optional()
    .default({}),
  notification_channels: z
    .record(z.enum(['email', 'sms', 'push', 'web']), z.boolean())
    .optional()
    .default({}),

  mute_all: z.boolean(),
  do_not_disturb: z.boolean(),
  do_not_disturb_start: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식이어야 합니다'),
  do_not_disturb_end: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식이어야 합니다'),
})

export const userNotificationSettingsCreateSchema = userNotificationSettingsSchema
export const userNotificationSettingsUpdateSchema = userNotificationSettingsSchema.partial()

/**
 * 방해 금지 시간대 검증 스키마
 */
export const doNotDisturbSchema = z.object({
  enabled: z.boolean(),
  start_time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식이어야 합니다'),
  end_time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식이어야 합니다'),
}).refine(
  (data) => {
    // 방해 금지 시간대 유효성 검증
    if (!data.enabled) return true
    return data.start_time !== data.end_time
  },
  {
    message: '시작 시간과 종료 시간은 같을 수 없습니다',
    path: ['end_time'],
  }
)

/**
 * 알림 환경설정 업데이트 스키마 (사용자용)
 */
export const notificationPreferencesSchema = z.object({
  // 알림 유형별 활성화
  signup: z.boolean().optional(),
  login: z.boolean().optional(),
  document: z.boolean().optional(),
  comment: z.boolean().optional(),
  vote: z.boolean().optional(),
  scrap: z.boolean().optional(),
  mention: z.boolean().optional(),
  message: z.boolean().optional(),

  // 알림 채널별 활성화
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  web: z.boolean().optional(),

  // 추가 설정
  mute_all: z.boolean().optional(),
  do_not_disturb: z.boolean().optional(),
  do_not_disturb_start: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식이어야 합니다')
    .optional(),
  do_not_disturb_end: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:MM 형식이어야 합니다')
    .optional(),
})

/**
 * Form Data Types
 */
export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>
export type UserNotificationSettingsFormData = z.infer<typeof userNotificationSettingsSchema>
export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>
export type DoNotDisturbFormData = z.infer<typeof doNotDisturbSchema>

/**
 * 커스텀 에러 메시지 (한국어)
 */
export const notificationErrorMessages = {
  notification_center_limit: {
    min: '알림 센터 표시 개수는 최소 1개 이상이어야 합니다',
    max: '알림 센터 표시 개수는 최대 100개 이하여야 합니다',
  },
  notification_retention_days: {
    min: '알림 보관 기간은 최소 7일 이상이어야 합니다',
    max: '알림 보관 기간은 최대 365일 이하여야 합니다',
  },
  do_not_disturb_time: {
    invalid: 'HH:MM 형식으로 입력해주세요 (예: 22:00)',
  },
  time_format: 'HH:MM 형식으로 입력해주세요 (예: 22:00)',
} as const

/**
 * 알림 환경설정 기본값
 */
export const defaultNotificationPreferences: NotificationPreferencesFormData = {
  signup: undefined,
  login: undefined,
  document: undefined,
  comment: undefined,
  vote: undefined,
  scrap: undefined,
  mention: undefined,
  message: undefined,
  email: undefined,
  sms: undefined,
  push: undefined,
  web: undefined,
  mute_all: false,
  do_not_disturb: false,
  do_not_disturb_start: '22:00',
  do_not_disturb_end: '08:00',
}

/**
 * 유효성 검증 헬퍼 함수
 */

/**
 * 방해 금지 시간대가 유효한지 확인
 */
export function validateDoNotDisturbPeriod(
  startTime: string,
  endTime: string
): { valid: boolean; error?: string } {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

  if (!timeRegex.test(startTime)) {
    return { valid: false, error: '시작 시간 형식이 올바르지 않습니다' }
  }

  if (!timeRegex.test(endTime)) {
    return { valid: false, error: '종료 시간 형식이 올바르지 않습니다' }
  }

  if (startTime === endTime) {
    return { valid: false, error: '시작 시간과 종료 시간은 같을 수 없습니다' }
  }

  return { valid: true }
}

/**
 * 알림 센터 제한이 유효한지 확인
 */
export function validateNotificationCenterLimit(limit: number): boolean {
  return limit >= 1 && limit <= 100
}

/**
 * 알림 보관 기간이 유효한지 확인
 */
export function validateRetentionDays(days: number): boolean {
  return days >= 7 && days <= 365
}
