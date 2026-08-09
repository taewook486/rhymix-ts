/**
 * admin.ts — SPEC-ADMIN-002 Slice 1E (전체 문서/댓글 관리)
 *
 * Cross-board document management for admin:
 * - listDocumentsAcrossAllBoards: 전체 게시판 문서 목록 (필터: module instance, author, status, search)
 * - bulkUpdateDocuments: 일괄 처리 (삭제/휴지통 이동/이동/상태 변경) with transaction + AdminLog
 *
 * @MX:ANCHOR [AUTO]: Cross-board document 조회/관리의 단일 진입점.
 * @MX:REASON: boardId 범위 없는 Document 쿼리와 일괄 처리 트랜잭션의 원자성 —
 *             fan_in >= 2 (admin tRPC, future bulk import tools).
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-070, REQ-ADMIN2-071
 */
import type { PrismaClient, Document, AdminLog } from '@prisma/client';
import { BoardPermissionDeniedError } from './document';

// ---------------------------------------------------------------------------
// 에러
// ---------------------------------------------------------------------------

export class BulkOperationFailedError extends Error {
  readonly code = 'BULK_OPERATION_FAILED';
  constructor(readonly failedIds: number[], message: string) {
    super(message);
    this.name = 'BulkOperationFailedError';
  }
}

// ---------------------------------------------------------------------------
// Actor 타입
// ---------------------------------------------------------------------------

interface Actor {
  userId: number;
  userGroupSrl: number;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// listDocumentsAcrossAllBoards
// ---------------------------------------------------------------------------

export interface DocumentWithBoard extends Document {
  board: {
    id: number;
    mid: string;
    name: string;
    moduleCode: string;
  };
}

export interface ListDocumentsAcrossAllResult {
  items: DocumentWithBoard[];
  nextCursor: string | null;
  total: number;
}

/**
 * 전체 게시판 문서 목록 조회 (admin 전용).
 *
 * 필터:
 * - moduleInstanceId: 특정 모듈 인스턴스 (boardId)
 * - authorId: 특정 작성자
 * - status: PUBLIC | SECRET | TEMP | DECLARED
 * - search: 제목 + 내용 full-text search
 *
 * @MX:WARN [AUTO]: full-table scan 방지 — index-backed 쿼리만 사용.
 * @MX:REASON: REG-ADMIN2-010: 대시보드/목록에서 unbounded scan 금지.
 */
export async function listDocumentsAcrossAllBoards(
  input: {
    moduleInstanceId?: number;
    authorId?: number;
    status?: 'PUBLIC' | 'SECRET' | 'TEMP' | 'DECLARED';
    search?: string;
    ip?: string;
    cursor?: string;
    limit?: number;
    actor: Actor;
  },
  ctx: { prisma: PrismaClient },
): Promise<ListDocumentsAcrossAllResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('list_documents_all');
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

  if (input.status !== undefined) {
    if (input.status === 'DECLARED') {
      // 신고 문서: reportCount > 0
      where.blamedCount = { gt: 0 };
    } else {
      where.status = input.status;
    }
  }

  if (input.search && input.search.length > 0) {
    where.OR = [
      { title: { contains: input.search, mode: 'insensitive' } },
      { content: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  // REQ-CPAR-014a: IP 주소 필터 (목록 IP 클릭 → 해당 IP로 필터링, REQ-CPAR-014b)
  if (input.ip && input.ip.length > 0) {
    where.ipAddress = input.ip;
  }

  // 커서 페이지네이션
  let cursorTake = limit + 1;
  if (input.cursor) {
    where.id = { gt: Number(input.cursor) };
  }

  const items = await ctx.prisma.document.findMany({
    where,
    include: {
      board: {
        select: {
          id: true,
          name: true,
          moduleInstance: {
            select: { mid: true, moduleCode: true },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
    take: cursorTake,
  });

  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(result[result.length - 1]!.id) : null;

  // 전체 카운트 (페이지네이션 메타데이터)
  const total = await ctx.prisma.document.count({ where });

  // board.mid/moduleCode 는 ModuleInstance 소유 컬럼이므로 평탄화한다 (DocumentWithBoard 형태 유지).
  const flattened: DocumentWithBoard[] = result.map((item) => ({
    ...item,
    board: {
      id: item.board.id,
      name: item.board.name,
      mid: item.board.moduleInstance.mid,
      moduleCode: item.board.moduleInstance.moduleCode,
    },
  })) as DocumentWithBoard[];

  return { items: flattened, nextCursor, total };
}

// ---------------------------------------------------------------------------
// bulkUpdateDocuments
// ---------------------------------------------------------------------------

export type BulkAction = 'delete' | 'trash' | 'move' | 'status';

export interface BulkUpdateInput {
  documentIds: number[];
  action: BulkAction;
  // action=move: targetBoardId 필수
  targetBoardId?: number;
  // action=status: targetStatus 필수
  targetStatus?: 'PUBLIC' | 'SECRET' | 'TEMP';
  actor: Actor;
}

export interface BulkUpdateResult {
  success: number;
  failed: number;
  failedIds: number[];
  adminLogIds: bigint[];
}

/**
 * 문서 일괄 처리 (admin 전용).
 *
 * - delete: 영구 삭제 (cascade)
 * - trash: 휴지통 이동
 * - move: 다른 게시판으로 이동
 * - status: 상태 변경
 *
 * 모든 작업은 단일 트랜잭션 내에서 실행되며, AdminLog에 기록된다.
 *
 * @MX:WARN [AUTO]: 일괄 cascade — delete 선택 시 모든 관련 데이터 즉시 삭제. 복구 불가.
 * @MX:REASON: Document.delete cascade의 부수효과. 하드 딜리트는 롤백 불가능하므로
 *             작업 실패 시 트랜잭션 전체를 롤백하고 실패 목록을 반환한다.
 */
export async function bulkUpdateDocuments(
  input: BulkUpdateInput,
  ctx: { prisma: PrismaClient },
): Promise<BulkUpdateResult> {
  if (!input.actor.isAdmin) {
    throw new BoardPermissionDeniedError('bulk_update_documents');
  }

  if (input.documentIds.length === 0) {
    return { success: 0, failed: 0, failedIds: [], adminLogIds: [] };
  }

  return ctx.prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as PrismaClient;
    const failedIds: number[] = [];
    let success = 0;
    const adminLogIds: bigint[] = [];

    // 현재 시간 (AdminLog 통일)
    const now = new Date();

    for (const documentId of input.documentIds) {
      try {
        const doc = await txClient.document.findUnique({
          where: { id: documentId },
          include: { board: true },
        });

        if (!doc) {
          failedIds.push(documentId);
          continue;
        }

        // 액션별 처리
        switch (input.action) {
          case 'delete': {
            await txClient.document.delete({
              where: { id: documentId },
            });
            break;
          }

          case 'trash': {
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            await txClient.document.update({
              where: { id: documentId },
              data: { deletedAt: now },
            });
            await txClient.trash.upsert({
              where: { documentId },
              create: {
                documentId,
                deletedById: input.actor.userId,
                deletedAt: now,
                expiresAt,
              },
              update: {
                deletedById: input.actor.userId,
                deletedAt: now,
                expiresAt,
              },
            });
            break;
          }

          case 'move': {
            if (!input.targetBoardId) {
              throw new Error('targetBoardId is required for move action');
            }
            await txClient.document.update({
              where: { id: documentId },
              data: { boardId: input.targetBoardId },
            });
            break;
          }

          case 'status': {
            if (!input.targetStatus) {
              throw new Error('targetStatus is required for status action');
            }
            await txClient.document.update({
              where: { id: documentId },
              data: { status: input.targetStatus },
            });
            break;
          }
        }

        // AdminLog 기록
        const log = await txClient.adminLog.create({
          data: {
            actorId: input.actor.userId,
            action: `bulk_${input.action}`,
            target: `document:${documentId}`,
            diff: { action: input.action, targetBoardId: input.targetBoardId, targetStatus: input.targetStatus },
            createdAt: now,
          },
        });
        adminLogIds.push(log.id);

        success++;
      } catch (err) {
        failedIds.push(documentId);
      }
    }

    // 실패가 있으면 에러 반환
    if (failedIds.length > 0) {
      throw new BulkOperationFailedError(failedIds, `${failedIds.length} documents failed to process`);
    }

    return { success, failed: failedIds.length, failedIds, adminLogIds };
  });
}
