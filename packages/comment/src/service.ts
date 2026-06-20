/**
 * service.ts — SPEC-COMMENT-001 Slice A/C
 *
 * Comment 도메인 — createComment / listComments / deleteComment / voteComment / reportComment.
 * Document.commentCount 의 원자성을 보장하기 위해 모든 mutation 은 $transaction 안에서 수행.
 *
 * REQ-COMMENT-010 (댓글 생성), REQ-COMMENT-012 (댓글 목록), REQ-COMMENT-013 (댓글 삭제).
 * REQ-COMMENT-030 (댓글 투표), REQ-COMMENT-040 (댓글 신고).
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
import { getCommentDepth } from './tree';
import { MAX_COMMENT_DEPTH } from './constants';
import { CommentStatus } from './types';
import {
  CommentDepthExceededError,
  CommentAlreadyVotedError,
  SelfVoteNotAllowedError,
  CommentAlreadyReportedError,
} from './errors';
import { emitCommentDeleted } from './events';
// SPEC-POINT-001 REQ-POINT-042: 포인트 훅 연동
import { pointHooks } from '@rhymix-ts/point';
// SPEC-NOTIFICATION-001 REQ-NOTIF-005: 알림 훅 연동
import { notificationHooks } from '@rhymix-ts/notification';

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
  isSecret: z.boolean().optional().default(false),
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

  // REQ-COMMENT-061: depth 제한 검사 (Slice C)
  if (parsed.parentId != null) {
    const allComments = await ctx.prisma.comment.findMany({
      where: { documentId: parsed.documentId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    const parentDepth = getCommentDepth(parsed.parentId, allComments);
    if (parentDepth + 1 >= MAX_COMMENT_DEPTH) {
      throw new CommentDepthExceededError(parentDepth + 1);
    }
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
        // REQ-COMMENT-050: 비밀 댓글 — isSecret=true 이면 status=SECRET(2)
        isSecret: parsed.isSecret ?? false,
        status: parsed.isSecret ? CommentStatus.SECRET : CommentStatus.PUBLIC,
      },
    });

    await tx.document.update({
      where: { id: parsed.documentId },
      data: { commentCount: { increment: 1 } },
    });

    // SPEC-POINT-001 REQ-POINT-042: 댓글 작성 포인트 지급
    if (parsed.authorId != null && doc.board.pointPerComment !== 0) {
      await pointHooks.onCommentCreated(ctx.prisma, {
        commentId: comment.id,
        authorId: parsed.authorId,
        boardId: doc.boardId,
        pointPerComment: doc.board.pointPerComment ?? 0,
      }, tx as unknown as import('@prisma/client').Prisma.TransactionClient);
    }

    // SPEC-NOTIFICATION-001 REQ-NOTIF-005: 댓글 작성 알림 생성
    if (doc.authorId != null) {
      let parentCommentAuthorId: number | null = null;
      if (parsed.parentId != null) {
        const parentComment = await tx.comment.findUnique({
          where: { id: parsed.parentId },
          select: { authorId: true },
        });
        parentCommentAuthorId = parentComment?.authorId ?? null;
      }

      await notificationHooks.onCommentCreated(
        ctx.prisma,
        {
          commentId: comment.id,
          documentId: doc.id,
          documentAuthorId: doc.authorId,
          commentAuthorId: parsed.authorId,
          commentAuthorNickname: parsed.nickName ?? 'unknown',
          parentCommentAuthorId,
        },
        tx as unknown as import('@prisma/client').Prisma.TransactionClient,
      );
    }

    return comment;
  });
}

// ---------------------------------------------------------------------------
// listComments
// ---------------------------------------------------------------------------

const ListCommentsSchema = z.object({
  documentId: z.number().int().positive(),
  actor: z
    .object({
      userId: z.number().int().positive().nullable(),
      isAdmin: z.boolean(),
    })
    .optional(),
});

export type ListCommentsInput = z.input<typeof ListCommentsSchema>;

/**
 * 댓글 목록 조회 (REQ-COMMENT-012 + REQ-COMMENT-052).
 * 비밀 댓글 가시성 필터 적용.
 */
export async function listComments(
  input: ListCommentsInput,
  ctx: { prisma: PrismaClient },
): Promise<Comment[]> {
  const parsed = ListCommentsSchema.parse(input);

  const comments = await ctx.prisma.comment.findMany({
    where: {
      documentId: parsed.documentId,
      deletedAt: null,
    },
    orderBy: { listOrder: 'asc' },
  });

  // REQ-COMMENT-052: 비밀 댓글 가시성 필터 (Slice C)
  if (!parsed.actor) {
    return comments;
  }

  const actorId = parsed.actor.userId;
  const isAdmin = parsed.actor.isAdmin;

  // 댓글 맵 (조상 탐색용)
  const commentMap = new Map<number, Comment>();
  for (const c of comments) commentMap.set(c.id, c);

  // 비밀 댓글 중 작성자/admin/조상 체크에서 접근 불가한 것이 있으면 문서 작성자 조회
  const needsDocCheck = comments.some((c) => {
    if (c.status !== CommentStatus.SECRET) return false;
    if (isAdmin || c.authorId === actorId) return false;
    if (actorId != null && isAncestorAuthor(c.id, actorId, commentMap)) return false;
    return true;
  });

  let documentAuthorId: number | null = null;
  if (needsDocCheck) {
    const doc = await ctx.prisma.document?.findUniqueOrThrow({
      where: { id: parsed.documentId },
      select: { authorId: true },
    });
    documentAuthorId = doc?.authorId ?? null;
  }

  return comments.map((comment) => {
    if (comment.status !== CommentStatus.SECRET) {
      return comment;
    }

    if (isAdmin || comment.authorId === actorId) {
      return comment;
    }

    if (actorId != null && isAncestorAuthor(comment.id, actorId, commentMap)) {
      return comment;
    }

    if (actorId != null && actorId === documentAuthorId) {
      return comment;
    }

    return { ...comment, content: '비밀 댓글입니다.' } as Comment;
  });
}

function isAncestorAuthor(
  commentId: number,
  userId: number,
  commentMap: Map<number, Comment>,
): boolean {
  const comment = commentMap.get(commentId);
  if (!comment || comment.parentId == null) return false;
  let currentId: number | null = comment.parentId;
  while (currentId != null) {
    const ancestor = commentMap.get(currentId);
    if (!ancestor) break;
    if (ancestor.authorId === userId) return true;
    currentId = ancestor.parentId;
  }
  return false;
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

  const updated = await ctx.prisma.$transaction(async (tx) => {
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

  // 이벤트 발행: 파일 cascade delete 트리거
  emitCommentDeleted({
    commentId: updated.id,
    documentId: updated.documentId,
    boardId: updated.boardId,
    deletedById: parsed.actor.userId,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// voteComment (REQ-COMMENT-030)
// ---------------------------------------------------------------------------

const VoteCommentSchema = z.object({
  commentId: z.number().int().positive(),
  memberId: z.number().int().positive(),
  voteType: z.number().int().refine((v) => v === 1 || v === -1),
});

export type VoteCommentInput = z.input<typeof VoteCommentSchema>;

/**
 * 댓글 투표 (추천/비추천).
 *
 * @MX:WARN [AUTO]: 트랜잭션 필수 — votedCount/blamedCount 원자성 보장.
 * @MX:REASON: 트랜잭션 없이 실행 시 카운트 불일치 발생.
 */
export async function voteComment(
  input: VoteCommentInput,
  ctx: { prisma: PrismaClient },
) {
  const parsed = VoteCommentSchema.parse(input);

  // REQ-COMMENT-032: 기존 투표 확인 (tx 외부)
  const existingLog = await ctx.prisma.commentVoteLog.findUnique({
    where: {
      commentId_memberId: {
        commentId: parsed.commentId,
        memberId: parsed.memberId,
      },
    },
  });

  // REQ-COMMENT-033: 같은 타입이면 no-op
  if (existingLog && existingLog.voteType === parsed.voteType) {
    return existingLog;
  }

  return ctx.prisma.$transaction(async (tx) => {
    // REQ-COMMENT-031: 자기 댓글 투표 불가 (tx 내부에서 일관성 보장)
    const comment = await tx.comment.findUniqueOrThrow({
      where: { id: parsed.commentId },
      select: { authorId: true },
    });
    if (comment.authorId === parsed.memberId) {
      throw new SelfVoteNotAllowedError(parsed.commentId);
    }
    if (existingLog) {
      // REQ-COMMENT-033: 반대 타입으로 전환 (old counter--, new counter++)
      const oldType = existingLog.voteType;
      const newType = parsed.voteType;

      // 기존 카운터 감소
      if (oldType === 1) {
        await tx.comment.update({
          where: { id: parsed.commentId },
          data: { votedCount: { decrement: 1 } },
        });
      } else {
        await tx.comment.update({
          where: { id: parsed.commentId },
          data: { blamedCount: { decrement: 1 } },
        });
      }

      // 새 카운터 증가
      if (newType === 1) {
        await tx.comment.update({
          where: { id: parsed.commentId },
          data: { votedCount: { increment: 1 } },
        });
      } else {
        await tx.comment.update({
          where: { id: parsed.commentId },
          data: { blamedCount: { increment: 1 } },
        });
      }

      // 로그 업데이트
      return tx.commentVoteLog.update({
        where: { id: existingLog.id },
        data: { voteType: newType },
      });
    } else {
      // REQ-COMMENT-030: 신규 투표 (로그 생성 + 카운터 증가)
      const log = await tx.commentVoteLog.create({
        data: {
          commentId: parsed.commentId,
          memberId: parsed.memberId,
          voteType: parsed.voteType,
        },
      });

      if (parsed.voteType === 1) {
        await tx.comment.update({
          where: { id: parsed.commentId },
          data: { votedCount: { increment: 1 } },
        });
      } else {
        await tx.comment.update({
          where: { id: parsed.commentId },
          data: { blamedCount: { increment: 1 } },
        });
      }
      return log;
    }
  });
}

// ---------------------------------------------------------------------------
// reportComment (REQ-COMMENT-040)
// ---------------------------------------------------------------------------

const ReportCommentSchema = z.object({
  commentId: z.number().int().positive(),
  reporterId: z.number().int().positive(),
  reporterIp: z.string().ip().nullable().optional(),
  reason: z.string().min(1).max(500).optional(),
});

export type ReportCommentInput = z.input<typeof ReportCommentSchema>;

/**
 * 댓글 신고.
 *
 * @MX:WARN [AUTO]: 트랜잭션 필수 — blamedCount 원자성 보장.
 * @MX:REASON: 트랜잭션 없이 실행 시 카운트 불일치 발생.
 */
export async function reportComment(
  input: ReportCommentInput,
  ctx: { prisma: PrismaClient },
) {
  const parsed = ReportCommentSchema.parse(input);

  // REQ-COMMENT-041: 중복 신고 확인 (findFirst — compound unique 이름 불필요)
  const existingReport = await ctx.prisma.commentReport.findFirst({
    where: {
      commentId: parsed.commentId,
      reporterId: parsed.reporterId,
    },
  });

  if (existingReport) {
    throw new CommentAlreadyReportedError(parsed.commentId, parsed.reporterId);
  }

  // REQ-COMMENT-040: 신고 생성 + blamedCount++ (단일 트랜잭션)
  return ctx.prisma.$transaction(async (tx) => {
    const report = await tx.commentReport.create({
      data: {
        commentId: parsed.commentId,
        reporterId: parsed.reporterId,
        reporterIp: parsed.reporterIp,
        reason: parsed.reason,
      },
    });

    await tx.comment.update({
      where: { id: parsed.commentId },
      data: { blamedCount: { increment: 1 } },
    });

    return report;
  });
}
