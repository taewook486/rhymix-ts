/**
 * admin.menu tRPC 라우터 — SPEC-ADMIN-001 Slice D + SPEC-MENU-001 Slice C.
 *
 * Menu 단위 CRUD: create / list / get / delete.
 * MenuItem 은 adminMenuItemRouter 가 별도 담당.
 * Slot assignment: assignSlot / listSlots / createSiteMenu.
 *
 * @MX:NOTE: [AUTO] admin.menu.get 의 1-depth include 한계 — lazy load 패턴.
 *           menu.get 은 parentId=null 인 1-depth MenuItem 만 포함.
 *           children 은 admin.menuItem.list({ menuId, parentId }) 로 lazy load.
 *           Slice E 의 dnd-kit 도입과 함께 트리 전체 펼침 UX 정식 도입.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-030 + SPEC-MENU-001 REQ-MENU-020~025
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

  /**
   * 메뉴 항목 재정렬 — SPEC-ADMIN-EXTRAS-001 Slice B.
   *
   * cycle detection O(depth), depth violation check.
   * menuMaxDepth = 6.
   *
   * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-MENU-001~004
   */
  'items.reorder': protectedAdminProcedure
    .input(
      z.object({
        menuId: z.number().int().positive(),
        ops: z.array(
          z.object({
            itemId: z.number().int().positive(),
            newParentId: z.number().int().positive().nullable(),
            newListOrder: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const menuMaxDepth = 6;

      // 1. 전체 메뉴 트리 로드 (순환 탐지용)
      const allItems = await ctx.prisma.menuItem.findMany({
        where: { menuId: input.menuId },
        select: { id: true, parentId: true },
      });

      // 자식 → 부분 맵 빌드 (순회용)
      const childrenMap = new Map<number, number[]>();
      for (const item of allItems) {
        if (!childrenMap.has(item.parentId ?? 0)) {
          childrenMap.set(item.parentId ?? 0, []);
        }
        childrenMap.get(item.parentId ?? 0)!.push(item.id);
      }

      // 깊이 계산 함수
      const getDepth = (itemId: number, visited = new Set<number>()): number => {
        if (visited.has(itemId)) {
          return Infinity; // cycle detected
        }
        visited.add(itemId);

        const parent = allItems.find((i) => i.id === itemId);
        if (!parent || parent.parentId === null) {
          return 0;
        }
        return 1 + getDepth(parent.parentId, visited);
      };

      // 서브트리 깊이 계산 함수
      const getSubtreeDepth = (itemId: number): number => {
        let maxChildDepth = 0;
        const children = childrenMap.get(itemId) ?? [];
        for (const childId of children) {
          const childDepth = getSubtreeDepth(childId);
          if (childDepth === Infinity) {
            return Infinity; // cycle in subtree
          }
          maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
        return maxChildDepth + 1;
      };

      // 2. 각 op 검증
      for (const op of input.ops) {
        const item = allItems.find((i) => i.id === op.itemId);
        if (!item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `MenuItem ${op.itemId} not found`,
          });
        }

        // 순환 탐지: newParentId가 itemId의 자손이면 안 됨
        if (op.newParentId !== null) {
          const isDescendant = (parentId: number, targetId: number): boolean => {
            if (parentId === targetId) {
              return true;
            }
            const children = childrenMap.get(parentId) ?? [];
            for (const childId of children) {
              if (isDescendant(childId, targetId)) {
                return true;
              }
            }
            return false;
          };

          if (isDescendant(op.itemId, op.newParentId)) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: `Cycle detected: ${op.newParentId} is a descendant of ${op.itemId}`,
            });
          }

          // newParentId 깊이 계산
          const newParentDepth = getDepth(op.newParentId);
          const subtreeDepth = getSubtreeDepth(op.itemId);

          // depth violation check
          if (newParentDepth + subtreeDepth > menuMaxDepth) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: `Depth violation: would exceed max depth of ${menuMaxDepth}`,
            });
          }
        }
      }

      // 3. 단일 트랜잭션: 모든 itemId 업데이트
      await ctx.prisma.$transaction(
        input.ops.map((op) =>
          ctx.prisma.menuItem.update({
            where: { id: op.itemId },
            data: {
              parentId: op.newParentId,
              listOrder: op.newListOrder,
            },
          }),
        ),
      );

      // 4. 캐시 무효화 (menu:{menuId})
      // TODO: cache tag invalidation 구현

      // 5. AdminLog 기록 (action: menu.reorder)
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'menu.reorder',
          target: `menu:${input.menuId}`,
          diff: { ops: input.ops },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return { updated: input.ops.length };
    }),

  /**
   * 슬롯에 메뉴 할당 (REQ-MENU-024).
   * upsert 패턴 — (domainId, slot) 쌍이 존재하면 갱신, 없으면 생성.
   */
  assignSlot: protectedAdminProcedure
    .input(
      z.object({
        domainId: z.number().int().positive(),
        slot: z.enum(['HEADER_PRIMARY', 'FOOTER', 'UTILITY']),
        menuId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 메뉴 존재 검증
      const menu = await ctx.prisma.menu.findUnique({
        where: { id: input.menuId },
      });
      if (!menu) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '메뉴를 찾을 수 없습니다.',
        });
      }

      // 도메인 존재 검증
      const domain = await ctx.prisma.domain.findUnique({
        where: { id: input.domainId },
      });
      if (!domain) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '도메인을 찾을 수 없습니다.',
        });
      }

      // upsert: slot이 있으면 update, 없으면 create
      const assignment = await ctx.prisma.menuSlotAssignment.upsert({
        where: {
          domainId_slot: {
            domainId: input.domainId,
            slot: input.slot,
          },
        },
        create: {
          domainId: input.domainId,
          slot: input.slot,
          menuId: input.menuId,
        },
        update: {
          menuId: input.menuId,
        },
      });

      // AdminLog 기록 (action: menu.slot.assign)
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'menu.slot.assign',
          target: `domain:${input.domainId}`,
          diff: { slot: input.slot, menuId: input.menuId },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return assignment;
    }),

  /**
   * 슬롯 배정 해제 — assignSlot의 역연산 (REQ-MENU-020~025).
   * menuId 가 not-null 컬럼이라 배정 해제는 MenuSlotAssignment 행 삭제로 구현.
   * 이미 배정이 없으면 idempotent no-op.
   */
  unassignSlot: protectedAdminProcedure
    .input(
      z.object({
        domainId: z.number().int().positive(),
        slot: z.enum(['HEADER_PRIMARY', 'FOOTER', 'UTILITY']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.menuSlotAssignment.deleteMany({
        where: { domainId: input.domainId, slot: input.slot },
      });

      if (result.count > 0) {
        await ctx.prisma.adminLog.create({
          data: {
            actorId: ctx.session.user.id,
            action: 'menu.slot.unassign',
            target: `domain:${input.domainId}`,
            diff: { slot: input.slot },
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
        });
      }

      return { unassigned: result.count > 0 };
    }),

  /**
   * 도메인별 슬롯 할당 목록 (REQ-MENU-025).
   */
  listSlotAssignments: protectedAdminProcedure
    .input(z.object({ domainId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const assignments = await ctx.prisma.menuSlotAssignment.findMany({
        where: { domainId: input.domainId },
        include: {
          menu: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ slot: 'asc' }],
      });

      return assignments;
    }),

  /**
   * 사이트용 메뉴 생성 (REQ-MENU-025 "메뉴 존 추가").
   * isAdminMenu=false 고정 — 사이트 공용 메뉴만 생성.
   */
  createSiteMenu: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        title: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      ctx.prisma.menu.create({
        data: {
          siteId: input.siteId,
          title: input.title,
          isAdminMenu: false, // 사이트 메뉴
          listOrder: 0,
        },
      }),
    ),
});
