/**
 * admin.document tRPC 라우터 — SPEC-ADMIN-002 Slice 1E
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-153)
 *                     SPEC-ADMIN-002 Slice 2C (REQ-ADMIN2-074)
 *
 * Cross-board document management:
 * - listAcrossAllBoards: 전체 문서 목록 조회
 * - bulkUpdate: 일괄 처리 (삭제/휴지통 이동/이동/상태 변경)
 * - recoverTemp: 임시 문서 복구
 * - deleteTemp: 임시 문서 영구 삭제
 * - getConfig: 문서 설정 조회
 * - updateConfig: 문서 설정 업데이트
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-074
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedAdminProcedure } from '../../trpc';
import {
  listDocumentsAcrossAllBoards,
  bulkUpdateDocuments,
  BulkOperationFailedError,
  restoreDocument,
  purgeDocument,
} from '@rhymix-ts/document';

// ---------------------------------------------------------------------------
// Helper functions (local, copied from settings.ts)
// ---------------------------------------------------------------------------

/**
 * ctx.siteId가 없을 때(hostname→domain 재해석 실패 등) 첫 번째 Site로 대체 해석한다.
 * packages/admin/src/settings.ts의 동일 패턴과 일치시킨다.
 */
async function resolveSiteId(ctx: { prisma: any; siteId?: number }): Promise<number> {
  if (ctx.siteId !== undefined) {
    return ctx.siteId;
  }
  const site = await ctx.prisma.site.findFirst({ orderBy: { id: 'asc' } });
  if (!site) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Site not found',
    });
  }
  return site.id;
}

/**
 * SiteSetting에서 값을 가져옴. 없으면 기본값 반환.
 */
async function getSiteSetting(
  ctx: { prisma: any; siteId?: number },
  key: string,
  defaultValue: any = null,
): Promise<any> {
  const siteId = await resolveSiteId(ctx);
  const setting = await ctx.prisma.siteSetting.findUnique({
    where: {
      siteId_key: {
        siteId,
        key,
      },
    },
  });

  return setting ? setting.value : defaultValue;
}

/**
 * SiteSetting에 값을 저장. AdminLog 기록.
 *
 * `ctx.prisma`로 Prisma 트랜잭션 클라이언트(tx)를 전달하면 호출자가 여러 키를
 * 하나의 트랜잭션으로 묶어 원자적으로 적용할 수 있다 (REQ-ADMIN2-110/113/114).
 */
async function setSiteSetting(
  ctx: { prisma: any; siteId?: number; ip?: string; userAgent?: string },
  key: string,
  value: any,
  actorId: number,
): Promise<void> {
  const siteId = await resolveSiteId(ctx);
  const before = await getSiteSetting(ctx, key);

  await ctx.prisma.siteSetting.upsert({
    where: {
      siteId_key: {
        siteId,
        key,
      },
    },
    create: {
      siteId,
      key,
      value,
    },
    update: {
      value,
    },
  });

  // AdminLog 기록
  await ctx.prisma.adminLog.create({
    data: {
      actorId,
      action: 'configure',
      target: `site_setting:${key}`,
      diff: { before, after: value },
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
}

function buildAdminActor(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userId: number; userGroupSrl: number; isAdmin: boolean } {
  const groupId =
    Array.isArray(session.user.groups) && session.user.groups.length > 0
      ? session.user.groups[0]?.id ?? 1
      : 1;
  return {
    userId: session.user.id,
    userGroupSrl: groupId,
    isAdmin: session.user.isAdmin,
  };
}

// ---------------------------------------------------------------------------
// Document Configuration Schema (REQ-ADMIN2-074)
// ---------------------------------------------------------------------------

const DocumentConfigSchema = z.object({
  sortOrder: z.enum(['latest', 'popular', 'comment_count']).default('latest'),
  pageSize: z.number().int().min(1).max(100).default(20),
  allowGuestWrite: z.boolean().default(false),
});

export const adminDocumentRouter = router({
  /**
   * 전체 문서 목록 조회 (admin 전용).
   */
  listAcrossAllBoards: protectedAdminProcedure
    .input(
      z.object({
        moduleInstanceId: z.number().int().positive().optional(),
        authorId: z.number().int().positive().optional(),
        status: z.enum(['PUBLIC', 'SECRET', 'TEMP', 'DECLARED']).optional(),
        search: z.string().min(1).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      listDocumentsAcrossAllBoards(
        { ...input, actor: buildAdminActor(ctx.session) },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 문서 일괄 처리 (admin 전용).
   */
  bulkUpdate: protectedAdminProcedure
    .input(
      z.object({
        documentIds: z.array(z.number().int().positive()).min(1).max(100),
        action: z.enum(['delete', 'trash', 'move', 'status']),
        targetBoardId: z.number().int().positive().optional(),
        targetStatus: z.enum(['PUBLIC', 'SECRET', 'TEMP']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await bulkUpdateDocuments(
          {
            documentIds: input.documentIds,
            action: input.action,
            targetBoardId: input.targetBoardId,
            targetStatus: input.targetStatus,
            actor: buildAdminActor(ctx.session),
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        if (err instanceof BulkOperationFailedError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: err.message,
            cause: err,
          });
        }
        throw err;
      }
    }),

  /**
   * 임시 문서 복구 (REQ-ADMIN2-153).
   *
   * TEMP 상태의 문서를 PUBLIC 상태로 복구한다.
   */
  recoverTemp: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const actor = buildAdminActor(ctx.session);

        // 먼저 문서가 TEMP 상태인지 확인
        const doc = await ctx.prisma.document.findUnique({
          where: { id: input.documentId },
          select: { id: true, status: true },
        });

        if (!doc) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '문서를 찾을 수 없습니다.',
          });
        }

        if (doc.status !== 'TEMP') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '임시 문서만 복구할 수 있습니다.',
          });
        }

        // 문서 상태를 PUBLIC로 변경
        const updated = await ctx.prisma.document.update({
          where: { id: input.documentId },
          data: { status: 'PUBLIC' },
        });

        return { success: true, document: updated };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '문서 복구 중 오류가 발생했습니다.',
          cause: err,
        });
      }
    }),

  /**
   * 임시 문서 영구 삭제 (REQ-ADMIN2-153).
   *
   * TEMP 상태의 문서를 영구 삭제한다.
   */
  deleteTemp: protectedAdminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const actor = buildAdminActor(ctx.session);

        // 먼저 문서가 TEMP 상태인지 확인
        const doc = await ctx.prisma.document.findUnique({
          where: { id: input.documentId },
          select: { id: true, status: true },
        });

        if (!doc) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '문서를 찾을 수 없습니다.',
          });
        }

        if (doc.status !== 'TEMP') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '임시 문서만 영구 삭제할 수 있습니다.',
          });
        }

        // purgeDocument 사용 (영구 삭제)
        await purgeDocument({ documentId: input.documentId, actor }, { prisma: ctx.prisma });

        return { success: true, documentId: input.documentId };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '문서 삭제 중 오류가 발생했습니다.',
          cause: err,
        });
      }
    }),

  // ==========================================================================
  // Document Configuration (REQ-ADMIN2-074)
  // ==========================================================================

  /**
   * 문서 설정 조회 (REQ-ADMIN2-074).
   */
  getConfig: protectedAdminProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const settings = {
        sortOrder: await getSiteSetting(ctx, 'document.config.sortOrder', 'latest'),
        pageSize: await getSiteSetting(ctx, 'document.config.pageSize', 20),
        allowGuestWrite: await getSiteSetting(ctx, 'document.config.allowGuestWrite', false),
      };

      return DocumentConfigSchema.parse(settings);
    }),

  /**
   * 문서 설정 업데이트 (REQ-ADMIN2-074).
   *
   * 여러 SiteSetting 키를 하나의 트랜잭션으로 묶어 원자적으로 적용한다.
   */
  updateConfig: protectedAdminProcedure
    .input(DocumentConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const actorId = Number(ctx.session.user.id);

      await ctx.prisma.$transaction(async (tx) => {
        const txCtx = { ...ctx, prisma: tx };

        await setSiteSetting(txCtx, 'document.config.sortOrder', input.sortOrder, actorId);
        await setSiteSetting(txCtx, 'document.config.pageSize', input.pageSize, actorId);
        await setSiteSetting(txCtx, 'document.config.allowGuestWrite', input.allowGuestWrite, actorId);
      });

      return { success: true };
    }),
});
