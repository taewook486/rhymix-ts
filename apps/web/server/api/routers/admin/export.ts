/**
 * admin.export tRPC 라우터 — SPEC-ADMIN-EXTRAS-001 Slice A.
 *
 * export bundle 생성.
 *
 * @MX:SPEC: SPEC-ADMIN-EXTRAS-001 REQ-EXPORT-001~010
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  serializeBundle,
  exportRequestSchema,
} from '@rhymix-ts/admin/export';

export const adminExportRouter = router({
  /**
   * export bundle 생성 (REQ-EXPORT-001).
   *
   * serializeBundle을 호출하여 bundle JSON을 반환.
   * 프론트엔드에서 JSON.stringify + Blob 다운로드 처리.
   */
  create: protectedAdminProcedure
    .input(exportRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // 메타데이터 exportedBy 설정
      const member = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { nickName: true },
      });

      const bundle = await serializeBundle(ctx.prisma, input.siteId, input);

      // 메타데이터 exportedBy 업데이트
      bundle.metadata.exportedBy = {
        actorId: ctx.session.user.id,
        nickname: member?.nickName ?? '',
      };

      // AdminLog 기록 (action: export.create)
      await ctx.prisma.adminLog.create({
        data: {
          actorId: ctx.session.user.id,
          action: 'export.create',
          target: `site:${input.siteId}`,
          diff: {
            selection: input,
            bundleSizeBytes: bundle.metadata.bundleSizeBytes,
            entityCounts: bundle.metadata.entityCounts,
          },
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      return bundle;
    }),
});
