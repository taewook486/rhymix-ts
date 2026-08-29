// SPEC-NOTIFICATION-001 알림 시스템 설정

// 알림 시스템의 전역 설정은 현재 없음.
// 향후 알림 보류 시간, 일일 최대 발송 수 등이 추가될 수 있음.
// 향후 설정 항목이 들어올 자리라 일부러 비워 둔다. 지금 Record<string, never> 로
// 바꾸면 항목이 생길 때 되돌려야 하므로 인터페이스 형태를 유지한다.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NotificationConfig {
  // 예: maxNotificationsPerDay: number;
  // 예: cooldownSeconds: number;
}

export const defaultNotificationConfig: NotificationConfig = {};
