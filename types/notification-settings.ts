/**
 * Notification Settings Types
 * WHW-060: 알림 유형 (Notification Types)
 * WHW-061: 알림 채널 (Notification Channels)
 * WHW-062: 알림 표시 설정 (Display Settings)
 */

/**
 * 알림 유형 (Notification Types)
 * 8가지 알림 유형 정의
 */
export type NotificationType =
  | 'signup' // 회원가입 알림
  | 'login' // 로그인 알림
  | 'document' // 게시글 알림
  | 'comment' // 댓글 알림
  | 'vote' // 추천 알림
  | 'scrap' // 스크랩 알림
  | 'mention' // 멘션 알림 (@mention)
  | 'message' // 쪽지 알림

/**
 * 알림 채널 (Notification Channels)
 * 4가지 알림 채널 정의
 */
export type NotificationChannel =
  | 'email' // 이메일 알림
  | 'sms' // SMS 알림
  | 'push' // 푸시 알림 (모바일 앱)
  | 'web' // 웹 알림 (브라우저)

/**
 * 알림 유형별 활성화 상태
 */
export interface NotificationTypes {
  signup: boolean
  login: boolean
  document: boolean
  comment: boolean
  vote: boolean
  scrap: boolean
  mention: boolean
  message: boolean
}

/**
 * 알림 채널별 활성화 상태
 */
export interface NotificationChannels {
  email: boolean
  sms: boolean
  push: boolean
  web: boolean
}

/**
 * 전역 알림 설정 (Global Notification Settings)
 * WHW-060, WHW-061, WHW-062
 */
export interface NotificationSettings {
  id: string

  // WHW-060: 알림 유형 설정
  enable_notification_types: NotificationTypes

  // WHW-061: 알림 채널 설정
  enable_notification_channels: NotificationChannels

  // WHW-062: 알림 센터 표시 설정
  notification_center_enabled: boolean
  notification_center_limit: number // 1-100
  notification_center_order: 'latest' | 'oldest' | 'type'

  // 실시간 알림 설정
  realtime_notification_enabled: boolean
  realtime_notification_sound: boolean
  realtime_notification_desktop: boolean

  // 알림 보관 기간 (일)
  notification_retention_days: number // 7-365

  created_at: string
  updated_at: string
}

export type NotificationSettingsUpdate = Partial<
  Omit<
    NotificationSettings,
    'id' | 'created_at' | 'updated_at'
  >
>

/**
 * 사용자별 알림 설정 (User Notification Settings)
 * 전역 설정을 개별 사용자가 오버라이드
 */
export interface UserNotificationSettings {
  id: string
  user_id: string

  // 사용자별 알림 유형 설정 (전역 설정 오버라이드)
  notification_types: Partial<NotificationTypes>

  // 사용자별 알림 채널 설정 (전역 설정 오버라이드)
  notification_channels: Partial<NotificationChannels>

  // 추가 사용자 설정
  mute_all: boolean // 모든 알림 끄기
  do_not_disturb: boolean // 방해 금지 모드
  do_not_disturb_start: string // HH:MM format
  do_not_disturb_end: string // HH:MM format

  created_at: string
  updated_at: string
}

export type UserNotificationSettingsCreate = Omit<
  UserNotificationSettings,
  'id' | 'created_at' | 'updated_at'
>
export type UserNotificationSettingsUpdate = Partial<
  Omit<
    UserNotificationSettingsCreate,
    'user_id'
  >
>

/**
 * 알림 표시 순서 옵션
 */
export const NOTIFICATION_ORDER_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'type', label: '유형별' },
] as const

/**
 * 알림 유형 라벨 (한국어)
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  signup: '회원가입',
  login: '로그인',
  document: '게시글',
  comment: '댓글',
  vote: '추천',
  scrap: '스크랩',
  mention: '멘션',
  message: '쪽지',
} as const

/**
 * 알림 채널 라벨 (한국어)
 */
export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: '이메일',
  sms: 'SMS',
  push: '푸시 알림',
  web: '웹 알림',
} as const

/**
 * 알림 유형 아이콘 (아이콘 라이브러리 매핑)
 */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  signup: 'user-plus',
  login: 'log-in',
  document: 'file-text',
  comment: 'message-square',
  vote: 'thumbs-up',
  scrap: 'bookmark',
  mention: 'at-sign',
  message: 'mail',
} as const

/**
 * 유효성 검증 헬퍼 함수들
 */

/**
 * 알림 유형이 유효한지 확인
 */
export function isValidNotificationType(type: string): type is NotificationType {
  return [
    'signup',
    'login',
    'document',
    'comment',
    'vote',
    'scrap',
    'mention',
    'message',
  ].includes(type)
}

/**
 * 알림 채널이 유효한지 확인
 */
export function isValidNotificationChannel(channel: string): channel is NotificationChannel {
  return ['email', 'sms', 'push', 'web'].includes(channel)
}

/**
 * 방해 금지 시간대 확인
 */
export function isInDoNotDisturbPeriod(
  settings: UserNotificationSettings
): boolean {
  if (!settings.do_not_disturb) {
    return false
  }

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const startTime = settings.do_not_disturb_start
  const endTime = settings.do_not_disturb_end

  // 시간대 계산 (자정을 넘어가는 경우 처리)
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime
  } else {
    // 예: 22:00 ~ 08:00
    return currentTime >= startTime || currentTime <= endTime
  }
}

/**
 * 사용자에게 알림을 보낼 수 있는지 확인
 */
export function canSendNotificationToUser(
  userSettings: UserNotificationSettings,
  globalSettings: NotificationSettings,
  type: NotificationType,
  channel: NotificationChannel
): boolean {
  // 전역 알림 차단 확인
  if (userSettings.mute_all) {
    return false
  }

  // 방해 금지 모드 확인
  if (isInDoNotDisturbPeriod(userSettings)) {
    return false
  }

  // 알림 유형 활성화 확인
  const typeEnabled = userSettings.notification_types[type] ??
    globalSettings.enable_notification_types[type]
  if (!typeEnabled) {
    return false
  }

  // 알림 채널 활성화 확인
  const channelEnabled = userSettings.notification_channels[channel] ??
    globalSettings.enable_notification_channels[channel]
  if (!channelEnabled) {
    return false
  }

  return true
}

/**
 * 기본 알림 유형 설정
 */
export const DEFAULT_NOTIFICATION_TYPES: NotificationTypes = {
  signup: true,
  login: false,
  document: true,
  comment: true,
  vote: true,
  scrap: true,
  mention: true,
  message: true,
} as const

/**
 * 기본 알림 채널 설정
 */
export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannels = {
  email: true,
  sms: false,
  push: true,
  web: true,
} as const
