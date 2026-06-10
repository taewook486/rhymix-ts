/**
 * comment.ts — SPEC-CONTENT-001 Slice B (T-007)
 *
 * Comment 도메인 — createComment / listComments / deleteComment.
 * Document.commentCount 의 원자성을 보장하기 위해 모든 mutation 은 $transaction 안에서 수행.
 *
 * REQ-CONTENT-020 (댓글 생성), REQ-CONTENT-030 (댓글 삭제).
 */
import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _DOMPurify: any = null;
import type { PrismaClient, Comment } from '@prisma/client';
import { canPerformAction } from '@rhymix-ts/document';
import {
  BoardPermissionDeniedError,
  DocumentOwnershipError,
} from '@rhymix-ts/document';

// ---------------------------------------------------------------------------
// HTML sanitize
// ---------------------------------------------------------------------------

function sanitizeHtml(html: string): string {
  if (!_DOMPurify) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _DOMPurify = require('isomorphic-dompurify');
  }
  return _DOMPurify.sanitize(html);
}

// ---------------------------------------------------------------------------
// createComment
// ---------------------------------------------------------------------------

const CreateCommentSchema = z.object({
  documentId: z.number().int().positive(),
  parentId: z.number().int().positive().nullable().default(null),
  content: z.string().min(1),
  authorId: z.number().int().positive().nullable(),
  nickName: z.string().min(1).max(80).nullable().default(null),
  actor: z.object({
    userGroupSrl: z.number().int().min(0),
    isAdmin: z.boolean(),
  }),
});

export type CreateCommentInput = z.input<typeof CreateCommentSchema>;

/**
 * 댓글을 생성한다.
 *
 * @MX:WARN [AUTO]: 트랜잭션 필수 — comment_count 원자성 보장.
 * @MX:REASON: 트랜잭션 없이 실행 시 comment_count 불일치 발생.
 *             동시 호출 시 race condition 으로 카운트가 누락될 수 있음.
 */
export async function createComment(
  input: CreateCommentInput,
  ctx: { prisma: PrismaClient },
): Promise<Comment> {
  const parsed = CreateCommentSchema.parse(input);

  const doc = await ctx.prisma.document.findUniqueOrThrow({
    where: { id: parsed.documentId },
    include: { board: true },
  });

  if (!canPerformAction(doc.board, 'write_comment', parsed.actor)) {
    throw new BoardPermissionDeniedError('write_comment');
  }

  const safeContent = sanitizeHtml(parsed.content);

  return ctx.prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        documentId: parsed.documentId,
        boardId: doc.boardId,
        parentId: parsed.parentId,
        content: safeContent,
        authorId: parsed.authorId,
        nickName: parsed.nickName,
      },
    });

    await tx.document.update({
      where: { id: parsed.documentId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  });
}

// ---------------------------------------------------------------------------
// listComments
// ---------------------------------------------------------------------------

const ListCommentsSchema = z.object({
  documentId: z.number().int().positive(),
});

export type ListCommentsInput = z.input<typeof ListCommentsSchema>;

export async function listComments(
  input: ListCommentsInput,
  ctx: { prisma: PrismaClient },
): Promise<Comment[]> {
  const parsed = ListCommentsSchema.parse(input);

  return ctx.prisma.comment.findMany({
    where: {
      documentId: parsed.documentId,
      deletedAt: null,
    },
    orderBy: { listOrder: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------

const DeleteCommentSchema = z.object({
  id: z.number().int().positive(),
  actor: z.object({
    userId: z.number().int().positive(),
    userGroupSrl: z.number().int().min(0),
    isAdmin: z.boolean(),
  }),
});

export type DeleteCommentInput = z.input<typeof DeleteCommentSchema>;

/**
 * 댓글을 soft delete 한다 (deletedAt 세팅 + commentCount--).
 *
 * @MX:WARN [AUTO]: 트랜잭션 필수 — comment_count 원자성 보장.
 * @MX:REASON: 트랜잭션 없이 실행 시 comment_count 불일치 발생.
 */
export async function deleteComment(
  input: DeleteCommentInput,
  ctx: { prisma: PrismaClient },
): Promise<Comment> {
  const parsed = DeleteCommentSchema.parse(input);

  const comment = await ctx.prisma.comment.findUniqueOrThrow({
    where: { id: parsed.id },
  });

  // 소유권 검사 — admin 이거나 본인
  if (!parsed.actor.isAdmin && comment.authorId !== parsed.actor.userId) {
    throw new DocumentOwnershipError(parsed.id);
  }

  return ctx.prisma.$transaction(async (tx) => {
    const updated = await tx.comment.update({
      where: { id: parsed.id },
      data: { deletedAt: new Date() },
    });

    await tx.document.update({
      where: { id: comment.documentId },
      data: { commentCount: { decrement: 1 } },
    });

    return updated;
  });
}
