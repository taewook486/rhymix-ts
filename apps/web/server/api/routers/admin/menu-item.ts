/**
 * admin.menuItem tRPC 라우터 — SPEC-ADMIN-001 Slice D.
 *
 * MenuItem 단위 CRUD: list / create / update / delete.
 *
 * @MX:NOTE: [AUTO] admin.menuItem.update 의 $transaction 패턴.
 *           parentId + listOrder 를 단일 transaction 으로 갱신 (REQ-ADMIN-031 transactional 부분).
 *           배치 reorder (다수 MenuItem 동시 갱신) 는 Slice E 의 dnd-kit 도입 시 admin.menuItem.reorder 로 추가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030, REQ-ADMIN-031, REQ-ADMIN-032, REQ-ADMIN-033
 *
 * @MX:TODO: [AUTO] Slice E 에서 드래그앤드롭 reorder (admin.menuItem.reorder) 도입.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-031
 * @MX:PRIORITY: P1
 */
import { z } from 'zod';
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
});
