/**
 * router.ts — SPEC-COMMENT-001 Slice B/C
 *
 * Comment tRPC router 정의.
 *
 * REQ-COMMENT-070~073: tRPC commentRouter (create, list, delete, vote, report).
 */
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import {
  createComment,
  listComments,
  deleteComment,
  voteComment,
  reportComment,
  type CreateCommentInput,
  type ListCommentsInput,
  type DeleteCommentInput,
  type VoteCommentInput,
  type ReportCommentInput,
} from './service';

// tRPC 컨텍스트 타입 — prisma 인젝션
type Context = { prisma: PrismaClient };
const t = initTRPC.context<Context>().create();

export const commentRouter = t.router({
  /**
   * 댓글 목록 조회 (REQ-COMMENT-012).
   */
  list: t.procedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(({ input, ctx }) => listComments(input as ListCommentsInput, ctx)),

  /**
   * 댓글 생성 (REQ-COMMENT-010).
   */
  create: t.procedure
    .input(
      z.object({
        documentId: z.number().int().positive(),
        parentId: z.number().int().positive().nullable().default(null),
        content: z.string().min(1),
        authorId: z.number().int().positive().nullable().optional(),
        nickName: z.string().min(1).max(80).nullable().default(null),
        actor: z.object({
          userGroupSrl: z.number().int().min(0),
          isAdmin: z.boolean(),
        }),
      }),
    )
    .mutation(({ input, ctx }) =>
      createComment(input as CreateCommentInput, ctx),
    ),

  /**
   * 댓글 삭제 (REQ-COMMENT-013).
   */
  delete: t.procedure
    .input(
      z.object({
        id: z.number().int().positive(),
        actor: z.object({
          userId: z.number().int().positive(),
          userGroupSrl: z.number().int().min(0),
          isAdmin: z.boolean(),
        }),
      }),
    )
    .mutation(({ input, ctx }) =>
      deleteComment(input as DeleteCommentInput, ctx),
    ),

  /**
   * Slice C: 댓글 투표 (REQ-COMMENT-030).
   */
  vote: t.procedure
    .input(
      z.object({
        commentId: z.number().int().positive(),
        memberId: z.number().int().positive(),
        voteType: z.number().int().refine((v) => v === 1 || v === -1),
      }),
    )
    .mutation(({ input, ctx }) =>
      voteComment(input as VoteCommentInput, ctx),
    ),

  /**
   * Slice C: 댓글 신고 (REQ-COMMENT-040).
   */
  report: t.procedure
    .input(
      z.object({
        commentId: z.number().int().positive(),
        reporterId: z.number().int().positive(),
        reporterIp: z.string().ip().nullable().optional(),
        reason: z.string().min(1).max(500).optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      reportComment(input as ReportCommentInput, ctx),
    ),
});

export type CommentRouter = typeof commentRouter;
