/**
 * content.extraKeys tRPC 라우터 — SPEC-CONTENT-001 Slice F.
 *
 * 게시판 extra key 목록을 공개 엔드포인트로 노출 (글 작성 폼 렌더용).
 *   - list (public) → 게시판의 extra key 목록 조회 (langCode 기본값 'ko')
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { listExtraKeys } from '@rhymix-ts/board';

export const contentExtraKeysRouter = router({
  /**
   * 게시판 extra key 목록 — 누구나 호출 가능.
   */
  list: publicProcedure
    .input(z.object({
      boardId: z.number().int().positive(),
      langCode: z.string().optional(),
    }))
    .query(async ({ ctx, input }) =>
      listExtraKeys({ boardId: input.boardId, langCode: input.langCode }, { prisma: ctx.prisma }),
    ),
});
