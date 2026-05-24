/**
 * admin.contentExtraKey tRPC 라우터 — SPEC-CONTENT-001 Slice F.
 *
 * DocumentExtraKey CRUD 를 관리자 전용 엔드포인트로 노출.
 *   - list   (admin) → 게시판의 extra key 목록 조회
 *   - create (admin) → extra key 생성
 *   - update (admin) → extra key 수정
 *   - delete (admin) → extra key 삭제
 *   - reorder (admin) → extra key 순서 변경
 *
 * 도메인 에러 매핑:
 *   ExtraKeyDuplicateNameError → CONFLICT
 *   ExtraKeyOptionsRequiredError → BAD_REQUEST
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listExtraKeys,
  createExtraKey,
  updateExtraKey,
  deleteExtraKey,
  reorderExtraKeys,
  ExtraKeyDuplicateNameError,
  ExtraKeyOptionsRequiredError,
} from '@rhymix-ts/board';

/**
 * 도메인 예외를 TRPCError 로 변환한다.
 */
function mapDomainError(err: unknown): never {
  if (err instanceof ExtraKeyDuplicateNameError) {
    throw new TRPCError({ code: 'CONFLICT', message: err.message });
  }
  if (err instanceof ExtraKeyOptionsRequiredError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  throw err;
}

const VAR_TYPES = ['text', 'textarea', 'number', 'select', 'checkbox', 'date', 'email', 'url'] as const;

const ExtraKeyOptionsSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  defaultValue: z.string().nullable().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(z.object({
    value: z.string().min(1).max(80),
    label: z.string().min(1).max(80),
  })).optional(),
  placeholder: z.string().max(200).optional(),
}).strict();

export const adminContentExtraKeyRouter = router({
  /**
   * 게시판의 extra key 목록 조회.
   */
  list: protectedAdminProcedure
    .input(z.object({
      boardId: z.number().int().positive(),
      langCode: z.string().optional(),
    }))
    .query(async ({ ctx, input }) =>
      listExtraKeys({ boardId: input.boardId, langCode: input.langCode }, { prisma: ctx.prisma }),
    ),

  /**
   * extra key 생성.
   */
  create: protectedAdminProcedure
    .input(z.object({
      boardId: z.number().int().positive(),
      varName: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
      varType: z.enum(VAR_TYPES),
      varIsRequired: z.boolean().optional(),
      varSearch: z.boolean().optional(),
      varSort: z.boolean().optional(),
      varOptions: ExtraKeyOptionsSchema.nullable().optional(),
      langCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createExtraKey(input, { prisma: ctx.prisma });
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * extra key 수정.
   */
  update: protectedAdminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      varName: z.string().min(1).max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).optional(),
      varType: z.enum(VAR_TYPES).optional(),
      varIsRequired: z.boolean().optional(),
      varSearch: z.boolean().optional(),
      varSort: z.boolean().optional(),
      varOptions: ExtraKeyOptionsSchema.nullable().optional(),
      langCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateExtraKey(input, { prisma: ctx.prisma });
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * extra key 삭제.
   */
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteExtraKey(input, { prisma: ctx.prisma });
      } catch (err) {
        mapDomainError(err);
      }
    }),

  /**
   * extra key 순서 재정렬 (varIdx 재할당).
   */
  reorder: protectedAdminProcedure
    .input(z.object({
      boardId: z.number().int().positive(),
      idsInOrder: z.array(z.number().int().positive()),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reorderExtraKeys(input, { prisma: ctx.prisma });
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
