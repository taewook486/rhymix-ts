/**
 * admin.menu tRPC 라우터 — SPEC-ADMIN-001 Slice D.
 *
 * Menu 단위 CRUD: create / list / get / delete.
 * MenuItem 은 adminMenuItemRouter 가 별도 담당.
 *
 * @MX:NOTE: [AUTO] admin.menu.get 의 1-depth include 한계 — lazy load 패턴.
 *           menu.get 은 parentId=null 인 1-depth MenuItem 만 포함.
 *           children 은 admin.menuItem.list({ menuId, parentId }) 로 lazy load.
 *           Slice E 의 dnd-kit 도입과 함께 트리 전체 펼침 UX 정식 도입.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminMenuRouter = router({
  /**
   * 메뉴 생성 (REQ-ADMIN-030).
   */
  create: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        title: z.string().min(1).max(80),
        isAdminMenu: z.boolean().default(false),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.menu.create({
        data: {
          siteId: input.siteId,
          title: input.title,
          isAdminMenu: input.isAdminMenu,
          listOrder: 0,
        },
      }),
    ),

  /**
   * 사이트별 메뉴 목록 (REQ-ADMIN-030).
   */
  list: protectedAdminProcedure
    .input(z.object({ siteId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.prisma.menu.findMany({
        where: { siteId: input.siteId },
        orderBy: [{ listOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ),

  /**
   * 메뉴 단건 조회 + 1-depth MenuItem 포함 (REQ-ADMIN-030).
   * 없으면 NOT_FOUND.
   */
  get: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const menu = await ctx.prisma.menu.findUnique({
        where: { id: input.id },
        include: {
          // 1-depth 만 포함 — 나머지는 admin.menuItem.list 로 lazy load
          items: {
            where: { parentId: null },
            orderBy: { listOrder: 'asc' },
          },
        },
      });
      if (!menu) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '메뉴를 찾을 수 없습니다.' });
      }
      return menu;
    }),

  /**
   * 메뉴 삭제 (REQ-ADMIN-030).
   * MenuItem 은 onDelete: Cascade 로 자동 삭제됨 (schema.prisma).
   */
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menu.delete({ where: { id: input.id } }),
    ),
});
