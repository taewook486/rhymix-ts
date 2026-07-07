import { z } from 'zod';

/**
 * Zod schemas for message validation
 *
 * SPEC-MESSAGE-001 REQ-MSG-001: 쪽지 발송 입력 검증
 * - 제목: 최대 200자 (Prisma VarChar(200))
 * - 내용: 최대 2000자 (REQ-MSG-001 명시)
 * - 수신자: userId 필수 (시스템에서 검증)
 */

// @MX:NOTE: [AUTO] Subject max length from Prisma VarChar(200), content from REQ-MSG-001 spec
export const MessageSendInputSchema = z.object({
  receiverId: z.number().int().positive(),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
});

export const MessageListInputSchema = z.object({
  folder: z.enum(['inbox', 'sent']).default('inbox'),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.number().int().positive().optional(),
});

export const MessageReadInputSchema = z.object({
  id: z.number().int().positive(),
});

export const MessageDeleteInputSchema = z.object({
  id: z.number().int().positive(),
});

export const MessageCountUnreadInputSchema = z.object({});

export type MessageSendInput = z.infer<typeof MessageSendInputSchema>;
export type MessageListInput = z.infer<typeof MessageListInputSchema>;
export type MessageReadInput = z.infer<typeof MessageReadInputSchema>;
export type MessageDeleteInput = z.infer<typeof MessageDeleteInputSchema>;
export type MessageCountUnreadInput = z.infer<typeof MessageCountUnreadInputSchema>;
