/**
 * config.ts — SPEC-CONTENT-001 Slice A
 *
 * BoardConfig Zod 스키마 및 기본값.
 * Board 테이블의 정형 컬럼과 1:1 매핑; 권한 매트릭스 (permissions Json) 는 제외.
 */
import { z } from 'zod';

export const BoardConfigSchema = z.object({
  skin: z.string().nullable().default(null),
  layoutId: z.number().int().nullable().default(null),
  mobileSkin: z.string().nullable().default(null),
  mobileLayoutId: z.number().int().nullable().default(null),
  listCount: z.number().int().min(1).max(200).default(20),
  pageCount: z.number().int().min(1).max(50).default(10),
  orderTarget: z.enum(['list_order', 'update_order']).default('list_order'),
  exceptNotice: z.boolean().default(false),
  consultation: z.boolean().default(false),
  useAnonymous: z.boolean().default(false),
  updateLog: z.boolean().default(false),
  trashUse: z.boolean().default(true),
  useCategory: z.boolean().default(false),
  documentLengthLimit: z.number().int().min(1024).default(1_048_576),
  commentLengthLimit: z.number().int().min(256).default(131_072),
});

export type BoardConfig = z.infer<typeof BoardConfigSchema>;

export const defaultBoardConfig: BoardConfig = BoardConfigSchema.parse({});
