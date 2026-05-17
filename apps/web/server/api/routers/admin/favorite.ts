/**
 * admin.favorite tRPC 라우터 — SPEC-ADMIN-001 Slice H-3.
 *
 * 관리자 즐겨찾기(AdminFavorite) CRUD + 정렬.
 * list / add / remove / reorder — 4개 procedure.
 *
 * @MX:NOTE: [AUTO] reorder 는 배열 형태의 $transaction 을 사용한다.
 *           callback 형태 대신 prisma Promise 배열을 전달하므로
 *           items 가 빈 배열이면 $transaction 을 호출하지 않고 { updated: 0 } 반환.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-090~093
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminFavoriteRouter = router({
  /**
   * 즐겨찾기 목록 조회 — 현재 로그인 관리자 기준, listOrder ASC (REQ-ADMIN-090).
   */
  list: protectedAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.adminFavorite.findMany({
      where: { memberId: ctx.session.user.id },
      orderBy: { listOrder: 'asc' },
    });
  }),

  /**
   * 즐겨찾기 추가 (REQ-ADMIN-091).
   */
  add: protectedAdminProcedure
    .input(
      z.object({
        label: z.string().min(1),
        href: z.string().min(1),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 현재 최대 listOrder + 1 로 추가
      const last = await ctx.prisma.adminFavorite.findMany({
        where: { memberId: ctx.session.user.id },
        orderBy: { listOrder: 'desc' },
        take: 1,
      });
      const nextOrder = last.length > 0 ? (last[0]!.listOrder ?? 0) + 1 : 0;

      return ctx.prisma.adminFavorite.create({
        data: {
          memberId: ctx.session.user.id,
          label: input.label,
          href: input.href,
          ...(input.icon ? { icon: input.icon } : {}),
          listOrder: nextOrder,
        },
      });
    }),

  /**
   * 즐겨찾기 삭제 (REQ-ADMIN-092).
   */
  remove: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.adminFavorite.delete({ where: { id: input.id } });
    }),

  /**
   * 즐겨찾기 순서 변경 (REQ-ADMIN-093).
   * items 배열 형태의 $transaction 으로 처리.
   * items 가 비어 있으면 $transaction 호출 없이 { updated: 0 } 반환.
   */
  reorder: protectedAdminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.number().int().positive(),
            listOrder: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.items.length === 0) {
        return { updated: 0 };
      }

      const updates = input.items.map((item) =>
        ctx.prisma.adminFavorite.update({
          where: { id: item.id },
          data: { listOrder: item.listOrder },
        }),
      );

      await ctx.prisma.$transaction(updates);

      return { updated: input.items.length };
    }),
});
