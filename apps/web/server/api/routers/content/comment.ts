/**
 * content.comment tRPC 라우터 — SPEC-COMMENT-001 Slice C.
 *
 * Comment 도메인 함수를 tRPC 엔드포인트로 노출.
 *   - list (public)
 *   - create / delete / vote / report (protected)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import {
  listComments,
  createComment,
  deleteComment,
  voteComment,
  reportComment,
  CommentDepthExceededError,
  SelfVoteNotAllowedError,
  CommentAlreadyReportedError,
} from '@rhymix-ts/comment';
import { BoardPermissionDeniedError, DocumentOwnershipError } from '@rhymix-ts/document';

function buildActor(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userGroupSrl: number; isAdmin: boolean } {
  const groupId =
    Array.isArray(session.user.groups) && session.user.groups.length > 0
      ? session.user.groups[0]?.id ?? 1
      : 1;
  return { userGroupSrl: groupId, isAdmin: session.user.isAdmin };
}

function buildActorWithId(session: {
  user: { id: number; isAdmin: boolean; groups?: Array<{ id?: number; isAdmin?: boolean }> };
}): { userId: number; userGroupSrl: number; isAdmin: boolean } {
  const { userGroupSrl, isAdmin } = buildActor(session);
  return { userId: session.user.id, userGroupSrl, isAdmin };
}

function mapDomainError(err: unknown): never {
  if (err instanceof BoardPermissionDeniedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof DocumentOwnershipError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof CommentDepthExceededError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
  }
  if (err instanceof SelfVoteNotAllowedError) {
    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
  }
  if (err instanceof CommentAlreadyReportedError) {
    throw new TRPCError({ code: 'CONFLICT', message: err.message });
  }
  throw err;
}

export const contentCommentRouter = router({
  list: publicProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => listComments(input, { prisma: ctx.prisma })),

  create: protectedProcedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().optional(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // REQ-ADMIN2-122: 스팸 필터 가드 (Prisma 생성 이전에 실행)
        const { checkSpamGuard, SpamGuardError } = await import('@rhymix-ts/admin/spamfilter');
        try {
          await checkSpamGuard(
            input.content,
            ctx.ip ?? '127.0.0.1',
            ctx.session.user.id,
            'comment.create',
            ctx.prisma,
          );
        } catch (err) {
          if (err instanceof Error && err.name === 'SpamGuardError') {
            // 스팸 필터링 에러를 그대로 전파
            throw err;
          }
          // 기타 에러는 다시 throw
          throw err;
        }

        // SPEC-SPAM-001: URL 블랙리스트 + 중복 콘텐츠 검사 (AC-SPAM-002, AC-SPAM-004)
        const { SpamFilter } = await import('@rhymix-ts/spam');
        const spamFilter = new SpamFilter(ctx.prisma);

        // 스팸 필터 설정 조회 (기본값 사용)
        const spamSettings = await ctx.prisma.siteSetting.findUnique({
          where: { siteId_key: { siteId: 1, key: 'spam_filter' } },
        });

        const spamConfig = (spamSettings?.value as any) || {
          forbiddenWordsEnabled: false, // 이미 checkSpamGuard에서 검사했으므로 비활성화
          urlBlacklistEnabled: true,
          duplicateContentEnabled: true,
          duplicateContentWindowMinutes: 1,
          reportThresholdDocument: 5,
          reportThresholdComment: 5,
          akismetEnabled: false,
          actionOnSpam: 'block',
        };

        const spamCheckResult = await spamFilter.check(
          {
            type: 'comment',
            content: input.content,
            authorId: ctx.session.user.id,
            authorIp: ctx.ip ?? '127.0.0.1',
            siteId: 1,
          },
          spamConfig,
        );

        if (spamCheckResult.isSpam) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: spamCheckResult.reason || '스팸으로 판단되어 저장할 수 없습니다',
          });
        }

        const actorUser = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { nickName: true },
        });

        return await createComment(
          {
            documentId: input.documentId,
            parentId: input.parentId ?? null,
            content: input.content,
            authorId: ctx.session.user.id,
            nickName: actorUser?.nickName ?? null,
            actor: buildActor(ctx.session),
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteComment(
          { id: input.id, actor: buildActorWithId(ctx.session) },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  vote: protectedProcedure
    .input(
      z.object({
        commentId: z.number().int().positive(),
        voteType: z.number().int().refine((v) => v === 1 || v === -1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await voteComment(
          {
            commentId: input.commentId,
            memberId: ctx.session.user.id,
            voteType: input.voteType,
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),

  report: protectedProcedure
    .input(
      z.object({
        commentId: z.number().int().positive(),
        reason: z.string().min(1).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await reportComment(
          {
            commentId: input.commentId,
            reporterId: ctx.session.user.id,
            reporterIp: null, // TODO: extract from request headers
            reason: input.reason,
          },
          { prisma: ctx.prisma },
        );
      } catch (err) {
        mapDomainError(err);
      }
    }),
});
