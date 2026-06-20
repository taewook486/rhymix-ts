export { NotificationService, createNotificationService } from './service';
export { notificationHooks } from './hooks';
export {
  NotificationRecipientNotFoundError,
  NotificationForbiddenError,
  NotificationPreferenceNotFoundError,
} from './errors';
export {
  NotificationCategorySchema,
  NotificationSourceTypeSchema,
  NotificationCreateInputSchema,
  NotificationListInputSchema,
  NotificationMarkReadInputSchema,
  NotificationMarkAllReadInputSchema,
  NotificationCountUnreadInputSchema,
  NotificationPreferenceUpsertInputSchema,
} from './schemas';
export type {
  NotificationCategory,
  NotificationSourceType,
  NotificationCreateInput,
  NotificationListInput,
  NotificationMarkReadInput,
  NotificationMarkAllReadInput,
  NotificationCountUnreadInput,
  NotificationPreferenceUpsertInput,
} from './schemas';
export { defaultNotificationConfig } from './config';
export type { NotificationConfig } from './config';
