/**
 * SPEC-SPAM-001: 스팸 필터 관리용 Admin tRPC Router
 *
 * @MX:SPEC: SPEC-SPAM-001 REQ-SPAM-005, REQ-SPAM-006
 */

import { z, ZodError } from 'zod';
import { TRPCError } from '@trpc/server';
import type {
  TRPCRouterRecord,
  AnyProcedure,
} from '@trpc/server';
import type { PrismaClient } from '@prisma/client';

/**
 * 도메인 예외를 TRPCError 로 변환하는 헬퍼
 */
function mapDomainError(err: unknown): never {
  if (err instanceof ZodError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message, cause: err });
  }
  if (err instanceof Error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
  }
  throw err;
}

/**
 * 공개 프로시저 컨텍스트 타입
 */

/**
 * 인증 필요 프로시저 컨텍스트 타입
 */
type ProCtx = {
  prisma: PrismaClient;
  session: { user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number }> } };
};

/**
 * tRPC 라우터 팩토리에 전달되는 빌딩 블록 타입
 */
export interface TrpcBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router: (record: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicProcedure: AnyProcedure | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protectedProcedure: AnyProcedure | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminProcedure: AnyProcedure | any;
}

/**
 * 스팸 필터 관리용 Admin 라우터 생성 함수
 *
 * 구현된 프로시저:
 * - getSettings() - 스팸 필터 설정 조회
 * - updateSettings() - 스팸 필터 설정 수정
 * - listForbiddenWords() - 금지어 목록 조회
 * - addForbiddenWord() - 금지어 추가
 * - removeForbiddenWord() - 금지어 삭제
 * - listUrlBlacklists() - URL 블랙리스트 조회
 * - addUrlBlacklist() - URL 블랙리스트 추가
 * - removeUrlBlacklist() - URL 블랙리스트 삭제
 * - listReviewQueue() - 검토 큐 목록 조회
 * - reviewQueueItem() - 검토 큐 항목 처리 (승인/삭제/차단)
 */
export function createAdminSpamRouter<
  TProcedure extends AnyProcedure,
  TProtectedProcedure extends AnyProcedure,
  TAdminProcedure extends AnyProcedure
>(trpc: {
  router: <T extends TRPCRouterRecord>(record: T) => T;
  publicProcedure: TProcedure;
  protectedProcedure: TProtectedProcedure;
  adminProcedure: TAdminProcedure;
}) {
  const { router, adminProcedure } = trpc;

  return router({
    /**
     * 스팸 필터 설정 조회 (REQ-SPAM-006)
     */
    getSettings: (adminProcedure as any)
      .input(z.object({ siteId: z.number().int().positive() }))
      .query(async ({ ctx, input }: { ctx: ProCtx; input: { siteId: number } }) => {
        try {
          // SiteSetting에서 스팸 필터 설정 조회
          const settings = await ctx.prisma.siteSetting.findUnique({
            where: {
              siteId_key: { siteId: input.siteId, key: 'spam_filter' },
            },
          });

          return (settings?.value as any) || {
            forbiddenWordsEnabled: true,
            urlBlacklistEnabled: true,
            duplicateContentEnabled: true,
            duplicateContentWindowMinutes: 1,
            reportThresholdDocument: 5,
            reportThresholdComment: 5,
            akismetEnabled: false,
            actionOnSpam: 'queue',
          };
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 스팸 필터 설정 수정 (REQ-SPAM-006)
     */
    updateSettings: (adminProcedure as any)
      .input(
        z.object({
          siteId: z.number().int().positive(),
          forbiddenWordsEnabled: z.boolean().optional(),
          urlBlacklistEnabled: z.boolean().optional(),
          duplicateContentEnabled: z.boolean().optional(),
          duplicateContentWindowMinutes: z.number().int().min(1).max(60).optional(),
          reportThresholdDocument: z.number().int().min(1).max(100).optional(),
          reportThresholdComment: z.number().int().min(1).max(100).optional(),
          akismetEnabled: z.boolean().optional(),
          akismetApiKey: z.string().optional(),
          akismetSiteUrl: z.string().url().optional(),
          actionOnSpam: z.enum(['block', 'queue']).optional(),
        }),
      )
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          const { siteId, ...settings } = input;

          await ctx.prisma.siteSetting.upsert({
            where: {
              siteId_key: { siteId, key: 'spam_filter' },
            },
            create: {
              siteId,
              key: 'spam_filter',
              value: settings as any,
            },
            update: {
              value: settings as any,
            },
          });

          return { success: true };
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 금지어 목록 조회 (REQ-SPAM-006)
     */
    listForbiddenWords: (adminProcedure as any)
      .input(z.object({ siteId: z.number().int().positive() }))
      .query(async ({ ctx, input }: { ctx: ProCtx; input: { siteId: number } }) => {
        try {
          return await ctx.prisma.spamDeniedWord.findMany({
            where: { siteId: input.siteId },
            orderBy: { word: 'asc' },
          });
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 금지어 추가 (REQ-SPAM-006)
     */
    addForbiddenWord: (adminProcedure as any)
      .input(
        z.object({
          siteId: z.number().int().positive(),
          word: z.string().min(1).max(200),
        }),
      )
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: { siteId: number; word: string } }) => {
        try {
          await ctx.prisma.spamDeniedWord.create({
            data: {
              siteId: input.siteId,
              word: input.word,
            },
          });
          return { success: true };
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 금지어 삭제 (REQ-SPAM-006)
     */
    removeForbiddenWord: (adminProcedure as any)
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: { id: number } }) => {
        try {
          await ctx.prisma.spamDeniedWord.delete({
            where: { id: input.id },
          });
          return { success: true };
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * URL 블랙리스트 조회 (REQ-SPAM-006)
     */
    listUrlBlacklists: (adminProcedure as any)
      .input(z.object({ siteId: z.number().int().positive() }))
      .query(async ({ ctx, input }: { ctx: ProCtx; input: { siteId: number } }) => {
        try {
          return await ctx.prisma.spamUrlBlacklist.findMany({
            where: { siteId: input.siteId },
            orderBy: { domain: 'asc' },
          });
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * URL 블랙리스트 추가 (REQ-SPAM-006)
     */
    addUrlBlacklist: (adminProcedure as any)
      .input(
        z.object({
          siteId: z.number().int().positive(),
          domain: z.string().min(1).max(200),
          isRegex: z.boolean().optional(),
          reason: z.string().optional(),
        }),
      )
      .mutation(
        async ({
          ctx,
          input,
        }: {
          ctx: ProCtx;
          input: { siteId: number; domain: string; isRegex?: boolean; reason?: string };
        }) => {
          try {
            await ctx.prisma.spamUrlBlacklist.create({
              data: {
                siteId: input.siteId,
                domain: input.domain,
                isRegex: input.isRegex ?? false,
                reason: input.reason,
              },
            });
            return { success: true };
          } catch (err) {
            mapDomainError(err);
          }
        },
      ),

    /**
     * URL 블랙리스트 삭제 (REQ-SPAM-006)
     */
    removeUrlBlacklist: (adminProcedure as any)
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: { id: number } }) => {
        try {
          await ctx.prisma.spamUrlBlacklist.delete({
            where: { id: input.id },
          });
          return { success: true };
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 검토 큐 목록 조회 (REQ-SPAM-005)
     */
    listReviewQueue: (adminProcedure as any)
      .input(
        z.object({
          siteId: z.number().int().positive(),
          status: z.enum(['pending', 'approved', 'deleted', 'banned']).optional(),
          type: z.enum(['document', 'comment']).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.number().int().optional(),
        }),
      )
      .query(async ({ ctx, input }: { ctx: ProCtx; input: any }) => {
        try {
          const where = {
            siteId: input.siteId,
            ...(input.status && { status: input.status }),
            ...(input.type && { type: input.type }),
          };

          const [items, total] = await Promise.all([
            ctx.prisma.spamReviewQueue.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              take: input.limit || 20,
              ...(input.cursor && { skip: 1, cursor: { id: input.cursor } }),
            }),
            ctx.prisma.spamReviewQueue.count({ where }),
          ]);

          return {
            items,
            total,
            hasMore: items.length === (input.limit || 20),
          };
        } catch (err) {
          mapDomainError(err);
        }
      }),

    /**
     * 검토 큐 항목 처리 (REQ-SPAM-005)
     */
    reviewQueueItem: (adminProcedure as any)
      .input(
        z.object({
          id: z.number().int().positive(),
          action: z.enum(['approve', 'delete', 'ban']),
        }),
      )
      .mutation(async ({ ctx, input }: { ctx: ProCtx; input: { id: number; action: string } }) => {
        try {
          const queueItem = await ctx.prisma.spamReviewQueue.findUnique({
            where: { id: input.id },
          });

          if (!queueItem) {
            throw new TRPCError({ code: 'NOT_FOUND', message: '검토 항목을 찾을 수 없습니다' });
          }

          const now = new Date();

          if (input.action === 'approve') {
            // 승인: 콘텐츠 공개 상태로 변경
            if (queueItem.type === 'document') {
              await ctx.prisma.document.update({
                where: { id: queueItem.contentId },
                data: { status: 'PUBLIC' },
              });
            } else {
              await ctx.prisma.comment.update({
                where: { id: queueItem.contentId },
                data: { status: 1 },
              });
            }

            await ctx.prisma.spamReviewQueue.update({
              where: { id: input.id },
              data: {
                status: 'approved',
                reviewedAt: now,
                reviewerId: ctx.session.user.id,
              },
            });
          } else if (input.action === 'delete') {
            // 삭제: 콘텐츠 삭제
            if (queueItem.type === 'document') {
              await ctx.prisma.document.update({
                where: { id: queueItem.contentId },
                data: { deletedAt: now },
              });
            } else {
              await ctx.prisma.comment.update({
                where: { id: queueItem.contentId },
                data: { deletedAt: now },
              });
            }

            await ctx.prisma.spamReviewQueue.update({
              where: { id: input.id },
              data: {
                status: 'deleted',
                reviewedAt: now,
                reviewerId: ctx.session.user.id,
              },
            });
          } else if (input.action === 'ban') {
            // 차단: IP 밴 및 콘텐츠 삭제
            // TODO: IP 밴 구현 필요
            if (queueItem.type === 'document') {
              await ctx.prisma.document.update({
                where: { id: queueItem.contentId },
                data: { deletedAt: now },
              });
            } else {
              await ctx.prisma.comment.update({
                where: { id: queueItem.contentId },
                data: { deletedAt: now },
              });
            }

            await ctx.prisma.spamReviewQueue.update({
              where: { id: input.id },
              data: {
                status: 'banned',
                reviewedAt: now,
                reviewerId: ctx.session.user.id,
              },
            });
          }

          return { success: true };
        } catch (err) {
          mapDomainError(err);
        }
      }),
  });
}
