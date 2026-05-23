/**
 * content.search tRPC 라우터 — SPEC-CONTENT-001 Slice C.
 *
 * 문서 FTS 검색 + 태그 자동완성 엔드포인트.
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { searchDocuments, searchTags } from '@rhymix-ts/board';

export const contentSearchRouter = router({
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
