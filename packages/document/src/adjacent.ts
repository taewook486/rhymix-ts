/**
 * adjacent.ts — SPEC-BOARD-UI-001 이전글/다음글 조회
 *
 * 문서의 이전/다음 글을 조회하는 도메인 함수.
 *
 * @MX:NOTE [AUTO]: 공지사항은 isNotice=true 로 필터링하여 조회 스캔에서 제외.
 * @MX:REASON: 공지사항은 목록 상단 고정으로 정렬 순서에서 벗어나므로 prev/next 대상이 아님.
 * @MX:SPEC: SPEC-BOARD-UI-001 REQ-BUI-007
 */
import { z } from 'zod';
import type { PrismaClient, Document } from '@prisma/client';

// ---------------------------------------------------------------------------
// 스키마 / 타입
// ---------------------------------------------------------------------------

const GetAdjacentDocumentsSchema = z.object({
  documentId: z.number().int().positive(),
  boardId: z.number().int().positive(),
  sort: z.enum(['list_order', 'update_order']).default('list_order'),
});

export type GetAdjacentDocumentsInput = z.input<typeof GetAdjacentDocumentsSchema>;

export interface AdjacentResult {
  prev: { id: number; title: string } | null;
  next: { id: number; title: string } | null;
}

// ---------------------------------------------------------------------------
// getAdjacentDocuments
// ---------------------------------------------------------------------------

/**
 * 문서의 이전/다음 글을 조회한다.
 *
 * 정렬 기준:
 *   - list_order: listOrder 내림차순 (최신순, 기본값)
 *   - update_order: updateOrder 내림차순 (수정일순)
 *
 * 제외 조건:
 *   - status != 'PUBLIC'인 문서
 *   - isNotice = true인 공지사항
 *   - 동일 boardId가 아닌 문서
 */
export async function getAdjacentDocuments(
  input: GetAdjacentDocumentsInput,
  ctx: { prisma: PrismaClient },
): Promise<AdjacentResult> {
  const parsed = GetAdjacentDocumentsSchema.parse(input);

  // 현재 문서 조회
  const current = await ctx.prisma.document.findUnique({
    where: { id: parsed.documentId },
    select: {
      id: true,
      boardId: true,
      listOrder: true,
      updateOrder: true,
      status: true,
      isNotice: true,
    },
  });

  if (!current || current.boardId !== parsed.boardId) {
    // 현재 문서가 없거나 다른 게시판이면 빈 결과
    return { prev: null, next: null };
  }

  // 정렬 필드 결정
  const sortField = parsed.sort === 'update_order' ? 'updateOrder' : 'listOrder';
  const currentOrderValue = current[sortField] as bigint;

  // 공통 where 조건
  const baseWhere = {
    boardId: parsed.boardId,
    status: 'PUBLIC' as const,
    isNotice: false, // @MX:NOTE 공지사항 제외
    deletedAt: null,
  };

  // 다음 글 조회 (sortField > currentOrderValue 중 최소값)
  const nextDoc = await ctx.prisma.document.findFirst({
    where: {
      ...baseWhere,
      [sortField]: { gt: currentOrderValue },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: [{ [sortField]: 'asc' }, { id: 'asc' }], // 오름차순으로 가장 가까운 다음 글
  });

  // 이전 글 조회 (sortField < currentOrderValue 중 최대값)
  const prevDoc = await ctx.prisma.document.findFirst({
    where: {
      ...baseWhere,
      [sortField]: { lt: currentOrderValue },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: [{ [sortField]: 'desc' }, { id: 'desc' }], // 내림차순으로 가장 가까운 이전 글
  });

  return {
    prev: prevDoc ? { id: prevDoc.id, title: prevDoc.title } : null,
    next: nextDoc ? { id: nextDoc.id, title: nextDoc.title } : null,
  };
}
