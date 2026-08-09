/**
 * trash.ts — SPEC-CONTENT-PARITY-001 M2 (REQ-CPAR-008, design.md D-3)
 *
 * 댓글 휴지통(가상 뷰) 도메인 함수 — listDeletedComments / restoreComment / purgeComment.
 *
 * D-3 채택안: `Trash` 모델(documentId @unique, 문서 전용)을 확장하지 않고,
 * `Comment.deletedAt` 소프트 삭제 상태를 그대로 "가상 휴지통"으로 조회/복원/영구삭제한다.
 * 스키마 변경 없음 — Comment 모델의 기존 `deletedAt` 컬럼만 사용한다.
 *
 * @MX:ANCHOR [AUTO]: 댓글 휴지통 통합 뷰의 단일 진입점.
 * @MX:REASON: admin.trash 라우터(listComments/restoreComment/purgeComment)에서 호출되는
 *             fan_in >= 3 (list/restore/purge 각각 admin tRPC 경유) 진입점 — 트랜잭션
 *             원자성과 FK cascade 순서(자식 답글 우선 삭제)가 이 파일에 집중된다.
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-003~008
 */
import type { PrismaClient, Comment } from '@prisma/client';
import { BoardPermissionDeniedError } from '@rhymix-ts/document';
import { CommentNotFoundError } from './errors';

export { CommentNotFoundError };

// ---------------------------------------------------------------------------
// Actor 타입
// ---------------------------------------------------------------------------

interface Actor {
  userId: number;
  userGroupSrl: number;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// listDeletedComments
// ---------------------------------------------------------------------------

export interface DeletedCommentWithDocument extends Comment {
  document: { id: number; title: string } | null;
}

export interface ListDeletedCommentsResult {
  items: DeletedCommentWithDocument[];
  nextCursor: string | null;
}

/**
 * 소프트 삭제된(deletedAt IS NOT NULL) 댓글 목록을 조회한다 (admin 전용).
 */
export async function listDeletedComments(
  input: { cursor?: string; limit?: number; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<ListDeletedCommentsResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('list_deleted_comments');
  }

  const limit = input.limit ?? 20;
  const where: Record<string, unknown> = { deletedAt: { not: null } };

  if (input.cursor) {
    where.id = { gt: Number(input.cursor) };
  }

  const items = await ctx.prisma.comment.findMany({
    where,
    include: { document: { select: { id: true, title: true } } },
    orderBy: { deletedAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(result[result.length - 1]!.id) : null;

  return { items: result as DeletedCommentWithDocument[], nextCursor };
}

// ---------------------------------------------------------------------------
// restoreComment
// ---------------------------------------------------------------------------

/**
 * 소프트 삭제된 댓글을 복원한다 (admin 전용).
 *
 * deletedAt = null 로 되돌리고, deleteComment가 감소시켰던 document.commentCount를
 * 다시 증가시킨다 (deleteComment의 역연산 — packages/comment/src/service.ts 대응).
 */
export async function restoreComment(
  input: { commentId: number; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<Comment> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('restore_comment');
  }

  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;

    const comment = await txClient.comment.findUnique({
      where: { id: input.commentId },
    });

    if (!comment || comment.deletedAt == null) {
      throw new CommentNotFoundError(input.commentId);
    }

    const restored = await txClient.comment.update({
      where: { id: input.commentId },
      data: { deletedAt: null },
    });

    await txClient.document.update({
      where: { id: comment.documentId },
      data: { commentCount: { increment: 1 } },
    });

    return restored;
  });
}

// ---------------------------------------------------------------------------
// purgeComment
//
// @MX:WARN [AUTO]: 하드 삭제 — 답글(자식) 트리 전체가 함께 영구 삭제된다. 복구 불가.
// @MX:REASON: Comment.parent 관계가 onDelete: NoAction(자기참조)이므로, 답글이 남은 채로
//             부모를 삭제하면 FK 제약 위반이 발생한다. 깊이 역순(리프→루트)으로
//             deleteMany 를 나눠 호출해 제약을 우회한다 (design.md D-3).
//             CommentReport/CommentVoteLog는 onDelete: Cascade, FileAttachment.comment는
//             onDelete: SetNull이라 DB가 자동 정리한다 — 이 함수에서 별도 처리 불필요.
// ---------------------------------------------------------------------------

export interface PurgeCommentResult {
  commentId: number;
  purgedIds: number[];
}

/**
 * 댓글을 영구 삭제한다 (admin 전용, 자식 답글 포함 cascade).
 */
export async function purgeComment(
  input: { commentId: number; actor: Actor },
  ctx: { prisma: PrismaClient },
): Promise<PurgeCommentResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('purge_comment');
  }

  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;

    const comment = await txClient.comment.findUnique({
      where: { id: input.commentId },
    });

    if (!comment) {
      throw new CommentNotFoundError(input.commentId);
    }

    // 자식 답글 트리를 레벨별로 수집한다 (BFS). MAX_COMMENT_DEPTH(5)로 유계 —
    // 무한 루프 위험 없음.
    const levels: number[][] = [[input.commentId]];
    let frontier = [input.commentId];
    for (let depth = 0; depth < 10 && frontier.length > 0; depth += 1) {
      const children = await txClient.comment.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      if (children.length === 0) {
        break;
      }
      const childIds = children.map((c) => c.id);
      levels.push(childIds);
      frontier = childIds;
    }

    // 가장 깊은 레벨(리프)부터 삭제 → 마지막에 루트(commentId) 삭제.
    const purgedIds: number[] = [];
    for (let i = levels.length - 1; i >= 0; i -= 1) {
      const ids = levels[i]!;
      await txClient.comment.deleteMany({ where: { id: { in: ids } } });
      purgedIds.push(...ids);
    }

    return { commentId: input.commentId, purgedIds };
  });
}
