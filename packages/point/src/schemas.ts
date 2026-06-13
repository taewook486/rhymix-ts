import { z } from 'zod';

export const PointSiteConfigSchema = z.object({
  signupBonus: z.number().int().min(0).default(0),
  clampToZero: z.boolean().default(true),
  allowNegativeBalance: z.boolean().default(false),
  defaultLevel: z.number().int().min(1).default(1),
});

export type PointSiteConfig = z.infer<typeof PointSiteConfigSchema>;

export const PointAddInputSchema = z.object({
  memberId: z.number().int().positive(),
  amount: z.number().int(),
  reason: z.string().max(200),
  sourceType: z.enum(['DOCUMENT','COMMENT','VOTE','DOWNLOAD','FILE_UPLOAD','SIGNUP','MANUAL','SYSTEM','PURCHASE','REFERRAL']),
  sourceId: z.number().int().positive().optional(),
  boardId: z.number().int().positive().optional(),
});

export type PointAddInput = z.infer<typeof PointAddInputSchema>;

export const PointHistoryQuerySchema = z.object({
  memberId: z.number().int().positive(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  sourceType: z.enum(['DOCUMENT','COMMENT','VOTE','DOWNLOAD','FILE_UPLOAD','SIGNUP','MANUAL','SYSTEM','PURCHASE','REFERRAL']).optional(),
});

export type PointHistoryQuery = z.infer<typeof PointHistoryQuerySchema>;
