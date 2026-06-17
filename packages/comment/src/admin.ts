/**
 * admin.ts — SPEC-ADMIN-002 Slice 1E (전체 댓글 관리)
 *
 * Cross-board comment management for admin:
 * - listCommentsAcrossAllBoards: 전체 게시판 댓글 목록 (필터: module instance, author, search)
 * - bulkDeleteComments: 일괄 삭제 with cascade to replies + AdminLog
 *
 * @MX:ANCHOR [AUTO]: Cross-board comment 조회/관리의 단일 진입점.
 * @MX:REASON: boardId 범위 없는 Comment 쿼리와 cascade 일괄 처리 트랜잭션의 원자성 —
 *             fan_in >= 2 (admin tRPC, future bulk moderation tools).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-075, REQ-ADMIN2-076
 */
import type { PrismaClient, Comment, AdminLog } from '@prisma/client';
import { BoardPermissionDeniedError } from '@rhymix-ts/document';

// ---------------------------------------------------------------------------
// Actor 타입
// ---------------------------------------------------------------------------

interface Actor {
  userId: number;
  userGroupSrl: number;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// listCommentsAcrossAllBoards
// ---------------------------------------------------------------------------

export interface CommentWithDocument extends Comment {
  document: {
    id: number;
    title: string;
    boardId: number;
  };
}

export interface ListCommentsAcrossAllResult {
  items: CommentWithDocument[];
  nextCursor: string | null;
  total: number;
}

/**
 * 전체 게시판 댓글 목록 조회 (admin 전용).
 *
 * 필터:
 * - moduleInstanceId: 특정 모듈 인스턴스 (boardId)
 * - authorId: 특정 작성자
 * - search: 댓글 내용 검색
 *
 * @MX:WARN [AUTO]: full-table scan 방지 — index-backed 쿼리만 사용.
 * @MX:REASON: REQ-ADMIN2-010: 대시보드/목록에서 unbounded scan 금지.
 */
export async function listCommentsAcrossAllBoards(
  input: {
    moduleInstanceId?: number;
    authorId?: number;
    search?: string;
    cursor?: string;
    limit?: number;
    actor: Actor;
  },
  ctx: { prisma: PrismaClient },
): Promise<ListCommentsAcrossAllResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('list_comments_all');
  }

  const limit = input.limit ?? 50;
  const where: Record<string, unknown> = {};

  // 필터 구성
  if (input.moduleInstanceId !== undefined) {
    where.boardId = input.moduleInstanceId;
  }

  if (input.authorId !== undefined) {
    where.authorId = input.authorId;
  }

  if (input.search && input.search.length > 0) {
    where.content = { contains: input.search, mode: 'insensitive' };
  }

  // 커서 페이지네이션
  let cursorTake = limit + 1;
  if (input.cursor) {
    where.id = { gt: Number(input.cursor) };
  }

  const items = await ctx.prisma.comment.findMany({
    where,
    include: {
      document: {
        select: {
          id: true,
          title: true,
          boardId: true,
        },
      },
    },
    orderBy: { id: 'asc' },
    take: cursorTake,
  });

  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(result[result.length - 1]!.id) : null;

  // 전체 카운트
  const total = await ctx.prisma.comment.count({ where });

  return { items: result as CommentWithDocument[], nextCursor, total };
}

// ---------------------------------------------------------------------------
// bulkDeleteComments
// ---------------------------------------------------------------------------

export interface BulkDeleteCommentsInput {
  commentIds: number[];
  actor: Actor;
}

export interface BulkDeleteCommentsResult {
  success: number;
  failed: number;
  failedIds: number[];
  adminLogIds: bigint[];
}

/**
 * 댓글 일괄 삭제 (admin 전용, cascade to replies).
 *
 * 선택한 댓글과 그 답글을 모두 삭제하고, AdminLog에 기록한다.
 *
 * @MX:WARN [AUTO]: cascade 삭제 — 댓글 삭제 시 답글도 함께 삭제. 복구 불가.
 * @MX:REASON: Comment.replies 관계의 cascade 부수효과. 삭제 실패 시 트랜잭션 롤백.
 */
export async function bulkDeleteComments(
  input: BulkDeleteCommentsInput,
  ctx: { prisma: PrismaClient },
): Promise<BulkDeleteCommentsResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('bulk_delete_comments');
  }

  if (input.commentIds.length === 0) {
    return { success: 0, failed: 0, failedIds: [], adminLogIds: [] };
  }

  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;
    const failedIds: number[] = [];
    let success = 0;
    const adminLogIds: bigint[] = [];

    const now = new Date();

    for (const commentId of input.commentIds) {
      try {
        // 댓글 존재 확인
        const comment = await txClient.comment.findUnique({
          where: { id: commentId },
          include: { document: true },
        });

        if (!comment) {
          failedIds.push(commentId);
          continue;
        }

        // 댓글 삭제 (cascade to replies by Prisma schema)
        await txClient.comment.delete({
          where: { id: commentId },
        });

        // AdminLog 기록
        const log = await txClient.adminLog.create({
          data: {
            actorId: input.actor.userId,
            action: 'bulk_delete_comment',
            target: `comment:${commentId}`,
            diff: { documentId: comment.documentId },
            createdAt: now,
          },
        });
        adminLogIds.push(log.id);

        success++;
      } catch (err) {
        failedIds.push(commentId);
      }
    }

    // 실패가 있으면 에러 반환
    if (failedIds.length > 0) {
      throw new Error(`${failedIds.length} comments failed to delete`);
    }

    return { success, failed: failedIds.length, failedIds, adminLogIds };
  });
}
