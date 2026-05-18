/**
 * admin.board tRPC 라우터 — SPEC-CONTENT-001 Slice B (T-009).
 *
 * board 모듈의 관리자 라우터.
 * 현재 슬라이스는 list / get 두 read-only procedure 만 제공한다.
 * 생성/삭제는 admin.module.create + onInstallBoard 가 담당 (모듈 생명 주기와 결합).
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminBoardRouter = router({
  /**
   * 사이트의 모든 board 를 module-instance 와 함께 조회.
   */
  list: protectedAdminProcedure.query(async ({ ctx }) =>
    ctx.prisma.board.findMany({
      include: { moduleInstance: true },
      orderBy: { id: 'desc' },
    }),
  ),

  /**
   * 단일 board 를 module-instance 와 함께 조회.
   */
  get: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      ctx.prisma.board.findUnique({
        where: { id: input.id },
        include: { moduleInstance: true },
      }),
    ),
});
