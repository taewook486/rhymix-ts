// SPEC-NOTIFICATION-001 알림 시스템 설정

// 알림 시스템의 전역 설정은 현재 없음.
// 향후 알림 보류 시간, 일일 최대 발송 수 등이 추가될 수 있음.
export interface NotificationConfig {
  // 예: maxNotificationsPerDay: number;
  // 예: cooldownSeconds: number;
}

export const defaultNotificationConfig: NotificationConfig = {};
