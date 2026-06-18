/**
 * admin.group tRPC 라우터 — SPEC-ADMIN-002 Slice 1C (REQ-ADMIN2-040~042).
 *
 * 회원 그룹 관리: list / create / update / delete.
 *
 * @MX:ANCHOR: [AUTO] admin.group.delete — 그룹 삭제 시 회원 재배정 단일 진입점.
 * @MX:REASON: 회원 재배정 + 기본 그룹 유지 보장 + AdminLog 기록을 원자적으로 처리한다.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-042
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';

export const adminGroupRouter = router({
  /**
   * 회원 그룹 목록 조회 (REQ-ADMIN2-040).
   * title, member count, default-group flag 반환.
   */
  list: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const groups = await ctx.prisma.memberGroup.findMany({
        orderBy: { listOrder: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          isDefault: true,
          isAdmin: true,
          listOrder: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      return groups.map((group) => ({
        id: group.id,
        title: group.title,
        description: group.description,
        isDefault: group.isDefault,
        isAdmin: group.isAdmin,
        listOrder: group.listOrder,
        memberCount: group._count.members,
      }));
    }),

  /**
   * 단일 회원 그룹 조회.
   */
  get: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.memberGroup.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          description: true,
          isDefault: true,
          isAdmin: true,
          listOrder: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      });
    }),

  /**
   * 회원 그룹 생성 (REQ-ADMIN2-041).
   * title, description, autoAssign(신규 가입자 자동 배정 플래그).
   * isDefault=true인 경우 기존 default 그룹의 isDefault를 false로 변경.
   *
   * @MX:NOTE [AUTO]: isAdmin은 입력 스키마에서 의도적으로 제외했다 (보안 수정).
   * 클라이언트가 그룹을 isAdmin=true로 생성/수정할 수 있으면, 해당 그룹에 멤버를
   * 배정하는 것만으로 임의 계정에 관리자 권한을 부여하는 권한 상승 경로가 생긴다.
   * 그룹은 항상 isAdmin=false로 생성되며, 관리자 권한 부여 그룹 지정은 별도의
   * 전용 플로우(차후 SPEC)에서 다뤄야 한다.
   */
  create: protectedAdminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(80),
        description: z.string().max(1000).optional(),
        isDefault: z.boolean().default(false),
        listOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 기본 그룹은 단 하나만 존재해야 함 (REQ-ADMIN2-041)
      if (input.isDefault) {
        await ctx.prisma.memberGroup.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const group = await ctx.prisma.memberGroup.create({
        data: {
          title: input.title,
          description: input.description,
          isDefault: input.isDefault,
          isAdmin: false,
          listOrder: input.listOrder,
        },
      });

      // AdminLog는 auditLogger 미들웨어가 자동 기록한다 (trpc.ts).
      return group;
    }),

  /**
   * 회원 그룹 수정 (REQ-ADMIN2-041).
   * title, description, isDefault, listOrder 수정 가능.
   * isAdmin은 클라이언트 입력에서 제외 (위 create 참고 — 권한 상승 방지).
   */
  update: protectedAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(80).optional(),
        description: z.string().max(1000).optional(),
        isDefault: z.boolean().optional(),
        listOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const before = await ctx.prisma.memberGroup.findUnique({
        where: { id },
      });

      if (!before) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // 기본 그룹은 단 하나만 존재해야 함 (REQ-ADMIN2-041)
      if (updateData.isDefault && !before.isDefault) {
        await ctx.prisma.memberGroup.updateMany({
          where: {
            AND: [{ isDefault: true }, { id: { not: id } }],
          },
          data: { isDefault: false },
        });
      }

      const after = await ctx.prisma.memberGroup.update({
        where: { id },
        data: updateData,
      });

      // AdminLog는 auditLogger 미들웨어가 자동 기록한다 (trpc.ts).
      return after;
    }),

  /**
   * 회원 그룹 삭제 (REQ-ADMIN2-042).
   * 회원이 있는 경우 기본 그룹으로 재배정 후 삭제.
   * AdminLog 기록.
   */
  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.memberGroup.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { members: true },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // 최소 1개 그룹 유지 요구
      const totalGroups = await ctx.prisma.memberGroup.count();
      if (totalGroups <= 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete the last remaining group',
        });
      }

      // 기본 그룹 삭제 방지 (다른 기본 그룹이 없는 경우)
      if (group.isDefault) {
        const otherDefault = await ctx.prisma.memberGroup.findFirst({
          where: { id: { not: input.id }, isDefault: true },
        });
        if (!otherDefault) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete the default group without another default group',
          });
        }
      }

      // 회원이 있는 경우 기본 그룹으로 재배정
      if (group._count.members > 0) {
        const defaultGroup = await ctx.prisma.memberGroup.findFirst({
          where: { isDefault: true },
        });

        if (!defaultGroup) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No default group found for member reassignment',
          });
        }

        await ctx.prisma.memberGroupMember.updateMany({
          where: { groupId: input.id },
          data: { groupId: defaultGroup.id },
        });
      }

      // 그룹 삭제 (cascade로 members도 삭제됨)
      await ctx.prisma.memberGroup.delete({
        where: { id: input.id },
      });

      // AdminLog는 auditLogger 미들웨어가 자동 기록한다 (trpc.ts).
      return { success: true };
    }),
});
