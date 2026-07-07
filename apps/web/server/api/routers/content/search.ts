/**
 * content.search tRPC 라우터 — SPEC-CONTENT-001 Slice C + SPEC-SEARCH-001.
 *
 * 문서 FTS 검색 + 태그 자동완성 엔드포인트 + 통합 검색.
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { searchDocuments, searchTags } from '@rhymix-ts/board';
import type { Document } from '@prisma/client';

export const contentSearchRouter = router({
  /**
   * 통합 검색 — 전체 게시판 대상 FTS (SPEC-SEARCH-001)
   */
  integrated: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(500),
        mid: z.string().optional(),
        field: z.enum(['title', 'content', 'author']).optional(),
        sort: z.enum(['relevance', 'latest']).default('relevance'),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { q, mid, field, sort, page } = input;
      const limit = 20;
      const offset = (page - 1) * limit;

      // mid로 boardId 조회
      let boardIdFilter = '';
      let boardId: number | undefined;
      if (mid) {
        const moduleInstance = await ctx.prisma.moduleInstance.findFirst({
          where: { mid },
          select: { id: true },
        });
        if (moduleInstance) {
          const board = await ctx.prisma.board.findFirst({
            where: { moduleInstanceId: moduleInstance.id },
            select: { id: true },
          });
          if (board) {
            boardId = board.id;
            boardIdFilter = `AND "board_id" = ${board.id}`;
          }
        }
      }

      // 필드별 검색 조건
      let whereClause = '';
      const safeQuery = q.replace(/'/g, "''");

      if (field === 'author') {
        // 작성자 검색: nickName ILIKE
        whereClause = `"nickName" ILIKE '%${safeQuery}%'`;
      } else if (field === 'title') {
        // 제목만 검색: title만 포함한 tsvector
        whereClause = `"search_vector" @@ plainto_tsquery('simple', '${safeQuery}')`;
      } else {
        // 통합 검색 (기본): title + content
        whereClause = `"search_vector" @@ plainto_tsquery('simple', '${safeQuery}')`;
      }

      // 정렬 조건
      let orderBy = '';
      if (sort === 'relevance' && field !== 'author') {
        orderBy = `ORDER BY ts_rank("search_vector", plainto_tsquery('simple', '${safeQuery}')) DESC, "id" DESC`;
      } else {
        orderBy = 'ORDER BY "regdate" DESC, "id" DESC';
      }

      // FTS 쿼리 실행
      const sql = `
        SELECT
          id,
          board_id,
          title,
          "contentText" as content,
          "authorId",
          "nickName",
          regdate,
          ${sort === 'relevance' && field !== 'author' ? `ts_rank("search_vector", plainto_tsquery('simple', '${safeQuery}')) as rank,` : '0 as rank,'}
          COUNT(*) OVER() as "totalCount"
        FROM documents
        WHERE "status" = 'PUBLIC'
          AND "deleted_at" IS NULL
          ${boardIdFilter}
          AND ${whereClause}
        ${orderBy}
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const rows = await ctx.prisma.$queryRawUnsafe<(Document & { rank: number; totalCount: bigint })[]>(sql);

      // 전체 결과 수
      const totalCount = rows.length > 0 ? Number(rows[0]!.totalCount) : 0;

      // board 정보 로드 (그룹핑용)
      const boardIds = [...new Set(rows.map((r) => r.boardId))];
      const boards = await ctx.prisma.board.findMany({
        where: { id: { in: boardIds } },
        include: {
          moduleInstance: {
            select: { mid: true },
          },
        },
      });

      const boardMap = new Map(boards.map((b) => [b.id, { name: b.name, mid: b.moduleInstance.mid }]));

      // 결과에 board 정보 추가
      const results = rows.map((row) => ({
        ...row,
        boardName: boardMap.get(row.boardId)?.name ?? 'Unknown',
        boardMid: boardMap.get(row.boardId)?.mid ?? '',
      }));

      return {
        results,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      };
    }),

  /**
   * 문서 검색 — FTS + 필터 + cursor pagination.
   */
  documents: publicProcedure
    .input(
      z.object({
        boardId: z.number().int().positive(),
        query: z.string().min(1).max(500).optional(),
        categoryId: z.number().int().positive().optional(),
        tags: z.array(z.string()).max(10).optional(),
        authorId: z.number().int().positive().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        minVoted: z.number().int().min(0).optional(),
        minComment: z.number().int().min(0).optional(),
        sort: z.enum(['list_order', 'update_order']).default('list_order'),
        sortDir: z.enum(['asc', 'desc']).default('desc'),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) =>
      searchDocuments(input, { prisma: ctx.prisma }),
    ),

  /**
   * 태그 자동완성 — prefix ILIKE 검색.
   */
  tags: publicProcedure
    .input(
      z.object({
        boardId: z.number().int().positive(),
        prefix: z.string().min(1).max(100),
      }),
    )
    .query(async ({ ctx, input }) =>
      searchTags(input, { prisma: ctx.prisma }),
    ),
});
