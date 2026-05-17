/**
 * admin.widget tRPC 라우터 — SPEC-ADMIN-001 Slice I (REQ-ADMIN-043).
 *
 * WidgetInstance DB 프리셋 관리: savePreset / listPresets / deletePreset.
 *
 * widgetName 은 packages/core/src/widgets/registry.ts 의 in-memory WidgetRegistry 와
 * 연결된다. 미등록 위젯 또는 props 스키마 불일치 시 BAD_REQUEST 를 반환한다.
 *
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-043
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@rhymix-ts/db';
import { router, protectedAdminProcedure } from '../../trpc';
import { getWidget } from '@rhymix-ts/core/widgets';

export const adminWidgetRouter = router({
  /**
   * 위젯 프리셋 저장 (REQ-ADMIN-043).
   *
   * 1. widgetName 이 WidgetRegistry 에 등록되어 있는지 확인 → 없으면 BAD_REQUEST.
   * 2. props 를 위젯의 propsSchema 로 검증 → 실패 시 BAD_REQUEST.
   * 3. WidgetInstance DB 레코드 생성.
   */
  savePreset: protectedAdminProcedure
    .input(
      z.object({
        widgetName: z.string().min(1),
        label: z.string().min(1),
        props: z.unknown(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. 위젯 등록 여부 확인
      const widgetDef = getWidget(input.widgetName);
      if (!widgetDef) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `위젯 '${input.widgetName}'이 등록되지 않았습니다.`,
        });
      }

      // 2. props 스키마 검증
      const parsed = widgetDef.propsSchema.safeParse(input.props);
      if (!parsed.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `위젯 props 검증 실패: ${parsed.error.message}`,
        });
      }

      // 3. DB 저장
      return ctx.prisma.widgetInstance.create({
        data: {
          widgetName: input.widgetName,
          label: input.label,
          props: parsed.data as Prisma.InputJsonValue,
        },
      });
    }),

  /**
   * 위젯 프리셋 목록 조회 (REQ-ADMIN-043).
   * widgetName 을 지정하면 해당 위젯의 프리셋만 반환.
   */
  listPresets: protectedAdminProcedure
    .input(
      z.object({
        widgetName: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const where = input.widgetName ? { widgetName: input.widgetName } : {};
      return ctx.prisma.widgetInstance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    }),

  /**
   * 위젯 프리셋 삭제 (REQ-ADMIN-043).
   */
  deletePreset: protectedAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.widgetInstance.delete({ where: { id: input.id } });
      return { deleted: true };
    }),
});
