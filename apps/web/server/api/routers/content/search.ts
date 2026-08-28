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
            boardIdFilter = `AND "boardId" = ${board.id}`;
          }
        }
      }

      // 검색어는 문자열로 이어붙이지 않고 바인딩 파라미터($1)로 넘긴다.
      // (예전에는 작은따옴표만 이중화해 넣었다 — 이스케이프 규칙 하나에 기대는 구조였다.)
      const QUERY_PARAM = '$1';
      const useRank = sort === 'relevance' && field !== 'author';

      // 필드별 검색 조건. 컬럼명은 스키마의 camelCase 를 그대로 쓴다
      // (테이블은 snake_case 지만 컬럼은 camelCase 다 — 예전 board_id /
      //  deleted_at / search_vector 표기는 전부 존재하지 않는 컬럼이었다).
      let whereClause = '';
      if (field === 'author') {
        whereClause = `"nickName" ILIKE '%' || ${QUERY_PARAM} || '%'`;
      } else {
        // title(가중치 A) + contentText(가중치 B) 로 생성되는 tsvector
        whereClause = `"searchVector" @@ plainto_tsquery('simple', ${QUERY_PARAM})`;
      }

      // 정렬 조건
      let orderBy = '';
      if (useRank) {
        orderBy = `ORDER BY ts_rank("searchVector", plainto_tsquery('simple', ${QUERY_PARAM})) DESC, "id" DESC`;
      } else {
        orderBy = 'ORDER BY "regdate" DESC, "id" DESC';
      }

      // FTS 쿼리 실행
      const sql = `
        SELECT
          id,
          "boardId",
          title,
          "contentText" as content,
          "authorId",
          "nickName",
          regdate,
          ${useRank ? `ts_rank("searchVector", plainto_tsquery('simple', ${QUERY_PARAM})) as rank,` : '0 as rank,'}
          COUNT(*) OVER() as "totalCount"
        FROM documents
        WHERE "status" = 'PUBLIC'
          AND "deletedAt" IS NULL
          ${boardIdFilter}
          AND ${whereClause}
        ${orderBy}
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const rows = await ctx.prisma.$queryRawUnsafe<(Document & { rank: number; totalCount: bigint })[]>(sql, q);

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
