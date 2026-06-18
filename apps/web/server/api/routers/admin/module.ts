/**
 * admin.module tRPC 라우터 — SPEC-ADMIN-001 Slice B.
 *
 * Slice A 의 도메인 서비스(createModuleInstance / deleteModuleInstance /
 * getModuleInstanceByMid)를 tRPC 엔드포인트로 노출한다.
 *
 * create / list / get / delete — 4개 procedure.
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  createModuleInstance,
  deleteModuleInstance,
  getModuleInstanceByMid,
  MidConflictError,
  MidReservedError,
  MidInvalidError,
  MidLengthError,
  IndexModuleProtectedError,
  ModuleNotRegisteredError,
} from '@rhymix-ts/core/modules';

export const adminModuleRouter = router({
  /**
   * 모듈 인스턴스 생성 (REQ-ADMIN-020).
   */
  create: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        moduleCode: z.string().min(1),
        mid: z.string().min(1).max(80),
        name: z.string().min(1),
        config: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = {
        memberId: ctx.session.user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      };
      try {
        return await createModuleInstance({ ...input, actor }, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof MidConflictError) {
          throw new TRPCError({ code: 'CONFLICT', message: err.message });
        }
        if (err instanceof MidReservedError) {
          throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: err.message });
        }
        if (err instanceof MidInvalidError || err instanceof MidLengthError) {
          throw new TRPCError({ code: 'UNPROCESSABLE_CONTENT', message: err.message });
        }
        if (err instanceof ModuleNotRegisteredError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
        }
        throw err;
      }
    }),

  /**
   * 모듈 인스턴스 목록 조회 (REQ-ADMIN-020).
   */
  list: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        moduleCode: z.string().optional(),
        q: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      ctx.prisma.moduleInstance.findMany({
        where: {
          siteId: input.siteId,
          ...(input.moduleCode ? { moduleCode: input.moduleCode } : {}),
          ...(input.q
            ? {
                OR: [
                  { mid: { contains: input.q, mode: 'insensitive' } },
                  { name: { contains: input.q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    ),

  /**
   * 특정 mid 의 모듈 인스턴스 조회 (REQ-ADMIN-020).
   */
  get: protectedAdminProcedure
    .input(
      z.object({
        siteId: z.number().int().positive(),
        mid: z.string(),
      }),
    )
    .query(({ ctx, input }) =>
      getModuleInstanceByMid(input.siteId, input.mid, { prisma: ctx.prisma }),
    ),

  /**
   * 모듈 인스턴스 수정 — 페이지 설정 (REQ-ADMIN2-027).
   *
   * title, browserTitle, layoutId, grant 등의 기본 설정을 수정한다.
   * config 필드에 추가 JSON 데이터를 저장할 수 있다.
   */
  update: protectedAdminProcedure
    .input(
      z.object({
        instanceId: z.number().int().positive(),
        title: z.string().min(1).optional(),
        browserTitle: z.string().optional(),
        layoutId: z.string().nullable().optional(),
        mobileLayoutId: z.string().nullable().optional(),
        skin: z.string().nullable().optional(),
        mobileSkin: z.string().nullable().optional(),
        menuId: z.number().int().positive().nullable().optional(),
        grant: z.unknown().optional(), // { permission, groupIds }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { instanceId, grant, ...patch } = input;

      // grant 정보는 config 필드에 병합 저장
      const data: Record<string, unknown> = { ...patch };
      if (grant !== undefined) {
        const existing = await ctx.prisma.moduleInstance.findUnique({
          where: { id: instanceId },
          select: { config: true },
        });
        const currentConfig = (existing?.config as Record<string, unknown>) || {};
        data.config = { ...currentConfig, grant };
      }

      return ctx.prisma.moduleInstance.update({
        where: { id: instanceId },
        data,
      });
    }),

  /**
   * 모듈 인스턴스 삭제 (REQ-ADMIN-020, REQ-ADMIN-006 라우터 표면).
   */
  delete: protectedAdminProcedure
    .input(
      z.object({
        instanceId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = {
        memberId: ctx.session.user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      };
      try {
        return await deleteModuleInstance(input.instanceId, actor, { prisma: ctx.prisma });
      } catch (err) {
        if (err instanceof IndexModuleProtectedError) {
          throw new TRPCError({ code: 'CONFLICT', message: err.message });
        }
        throw err;
      }
    }),

  /**
   * 모듈 인스턴스 일괄 작업 — SPEC-ADMIN-EXTRAS-001 Slice B.
   *
   * enable/disable/delete 일괄 처리.
   * delete 시 indexModuleInstanceId 체크.
   *
   * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-MODULE-001~003
   */
  bulk: protectedAdminProcedure
    .input(
      z.object({
        action: z.enum(['enable', 'disable', 'delete']),
        instanceIds: z.array(z.number().int().positive()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // delete 전 체크: 도메인의 인덱스 모듈로 사용 중인 경우 reject
      if (input.action === 'delete') {
        const domain = await ctx.prisma.domain.findFirst({
          where: {
            indexModuleInstanceId: { in: input.instanceIds },
          },
          select: { id: true, hostname: true, indexModuleInstanceId: true },
        });

        if (domain) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Cannot delete index module instance ${domain.indexModuleInstanceId} (used by domain "${domain.hostname}")`,
          });
        }
      }

      // 단일 트랜잭션: 모든 인스턴스에 action 적용
      await ctx.prisma.$transaction(
        input.instanceIds.map((instanceId) => {
          if (input.action === 'delete') {
            return ctx.prisma.moduleInstance.delete({
              where: { id: instanceId },
            });
          }
          // enable/disable: rssEnabled 토글
          return ctx.prisma.moduleInstance.update({
            where: { id: instanceId },
            data: {
              rssEnabled: input.action === 'enable',
            },
          });
        }),
      );

      // AdminLog 기록 (action: module.bulk.{action})
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: `module.bulk.${input.action}`,
          target: `instances:${input.instanceIds.length}`,
          diff: { instanceIds: input.instanceIds },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return { updated: input.instanceIds.length };
    }),
});
