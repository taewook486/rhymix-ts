// SPEC-NOTIFICATION-001 에러 클래스

export class NotificationRecipientNotFoundError extends Error {
  readonly code = 'NOTIFICATION_RECIPIENT_NOT_FOUND';
  constructor(recipientId: number) {
    super(`Recipient not found: ${recipientId}`);
  }
}

export class NotificationForbiddenError extends Error {
  readonly code = 'NOTIFICATION_FORBIDDEN';
  constructor(message: string = 'Access denied to notification') {
    super(message);
  }
}

export class NotificationPreferenceNotFoundError extends Error {
  readonly code = 'NOTIFICATION_PREFERENCE_NOT_FOUND';
  constructor(memberId: number, category: string) {
    super(`Preference not found: memberId=${memberId}, category=${category}`);
  }
}
