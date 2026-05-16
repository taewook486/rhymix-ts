/**
 * admin.menuItem tRPC 라우터 — SPEC-ADMIN-001 Slice D + Slice E.
 *
 * MenuItem 단위 CRUD: list / create / update / delete / reorder.
 *
 * @MX:ANCHOR: [AUTO] admin.menuItem.reorder — DnD 순서 갱신 단일 진입점.
 * @MX:REASON: 모든 MenuItem 순서 갱신은 이 프로시저를 통해 단일 $transaction 으로 처리돼야
 *             부분 적용(partial update)을 방지할 수 있음. fan_in >= 3 (DnD UI, tests, admin page).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 *
 * @MX:NOTE: [AUTO] admin.menuItem.update 의 $transaction 패턴.
 *           parentId + listOrder 를 단일 transaction 으로 갱신 (REQ-ADMIN-031 transactional 부분).
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030, REQ-ADMIN-031, REQ-ADMIN-032, REQ-ADMIN-033
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

/**
 * MenuItem 공통 입력 스키마 (REQ-ADMIN-032, REQ-ADMIN-033).
 */
const MenuItemInput = z.object({
  title: z.string().min(1).max(200),
  url: z.string().optional(),
  icon: z.string().optional(),
  cssClass: z.string().optional(),
  description: z.string().optional(),
  groupIds: z.array(z.number().int().positive()).default([]),
  openInNewWindow: z.boolean().default(false),
  expand: z.boolean().default(false),
  listOrder: z.number().int().default(0),
  normalBtn: z.unknown().optional(),    // raw JSON (REQ-ADMIN-033)
  hoverBtn: z.unknown().optional(),
  activeBtn: z.unknown().optional(),
});

export const adminMenuItemRouter = router({
  /**
   * parentId 기준 MenuItem lazy load (REQ-ADMIN-030).
   * parentId=null 이면 최상위 항목 반환.
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        menuId: z.number().int().positive(),
        parentId: z.number().int().nullable().default(null),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.menuItem.findMany({
        where: { menuId: input.menuId, parentId: input.parentId },
        orderBy: { listOrder: 'asc' },
      }),
    ),

  /**
   * MenuItem 생성 (REQ-ADMIN-030, REQ-ADMIN-032, REQ-ADMIN-033).
   */
  create: protectedAdminProcedure
    .input(
      MenuItemInput.extend({
        menuId: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().default(null),
      }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mutation(({ ctx, input }) => ctx.prisma.menuItem.create({ data: input as any })),

  /**
   * MenuItem 수정 — parentId + listOrder 를 단일 $transaction 으로 갱신 (REQ-ADMIN-031 transactional).
   */
  update: protectedAdminProcedure
    .input(
      MenuItemInput.partial().extend({
        id: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      return ctx.prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tx.menuItem.update({ where: { id }, data: patch as any });
      });
    }),

  /**
   * MenuItem 삭제 (REQ-ADMIN-030).
   * children 은 onDelete: Cascade 로 자동 삭제됨.
   */
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.menuItem.delete({ where: { id: input.id } }),
    ),

  /**
   * MenuItem 배치 reorder — DnD 드래그 완료 시 호출 (REQ-ADMIN-031).
   * 단일 $transaction 으로 모든 items 의 listOrder / parentId 를 원자적으로 갱신한다.
   */
  reorder: protectedAdminProcedure
    .input(
      z.object({
        menuId: z.number().int().positive(),
        items: z.array(
          z.object({
            id: z.number().int().positive(),
            parentId: z.number().int().nullable(),
            listOrder: z.number().int(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. menuId 존재 확인
      const menu = await ctx.prisma.menu.findUnique({ where: { id: input.menuId } });
      if (!menu) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'menu not found' });
      }

      // 2. 빈 items → no-op
      if (input.items.length === 0) {
        return { updated: 0 };
      }

      // 3. 단일 트랜잭션으로 일괄 갱신
      await ctx.prisma.$transaction(
        input.items.map((item) =>
          ctx.prisma.menuItem.update({
            where: { id: item.id },
            data: { parentId: item.parentId, listOrder: item.listOrder },
          }),
        ),
      );

      return { updated: input.items.length };
    }),
});
