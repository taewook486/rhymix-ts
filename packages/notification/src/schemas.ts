import { z } from 'zod';

// SPEC-NOTIFICATION-001 REQ-NOTIF-031: NotificationCategory enum
export const NotificationCategorySchema = z.enum([
  'COMMENT',
  'COMMENT_REPLY',
  'MENTION',
  'MESSAGE',
]);

export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

// SPEC-NOTIFICATION-001 REQ-NOTIF-006: NotificationSourceType enum
export const NotificationSourceTypeSchema = z.enum([
  'COMMENT',
  'MENTION',
  'MESSAGE',
]);

export type NotificationSourceType = z.infer<typeof NotificationSourceTypeSchema>;

// 알림 생성 입력 스키마
export const NotificationCreateInputSchema = z.object({
  recipientId: z.number().int().positive(),
  category: NotificationCategorySchema,
  sourceType: NotificationSourceTypeSchema,
  sourceId: z.number().int().positive(),
  actorId: z.number().int().positive().nullable(),
  actorNickname: z.string().max(100),
});

export type NotificationCreateInput = z.infer<typeof NotificationCreateInputSchema>;

// 알림 목록 조회 스키마
export const NotificationListInputSchema = z.object({
  recipientId: z.number().int().positive(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type NotificationListInput = z.infer<typeof NotificationListInputSchema>;

// 단일 알림 읽음 처리 스키마
export const NotificationMarkReadInputSchema = z.object({
  notificationId: z.number().int().positive(),
  actorMemberId: z.number().int().positive(), // 본인 확인용
});

export type NotificationMarkReadInput = z.infer<typeof NotificationMarkReadInputSchema>;

// 전체 읽음 처리 스키마
export const NotificationMarkAllReadInputSchema = z.object({
  recipientId: z.number().int().positive(),
});

export type NotificationMarkAllReadInput = z.infer<typeof NotificationMarkAllReadInputSchema>;

// 미읽음 카운트 조회 스키마
export const NotificationCountUnreadInputSchema = z.object({
  recipientId: z.number().int().positive(),
});

export type NotificationCountUnreadInput = z.infer<typeof NotificationCountUnreadInputSchema>;

// 알림 설정 upsert 스키마
export const NotificationPreferenceUpsertInputSchema = z.object({
  memberId: z.number().int().positive(),
  preferences: z.array(
    z.object({
      category: NotificationCategorySchema,
      enabled: z.boolean(),
    }),
  ),
});

export type NotificationPreferenceUpsertInput = z.infer<typeof NotificationPreferenceUpsertInputSchema>;
