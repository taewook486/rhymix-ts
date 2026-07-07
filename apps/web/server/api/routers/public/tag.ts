/**
 * public.tag tRPC 라우터 — SPEC-TAG-001
 *
 * Public tag operations:
 * - autocomplete: 태그 자동완성 (REQ-TAG-001)
 * - tagCloud: 태그 클라우드 데이터 (REQ-TAG-005)
 */
import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import {
  getAutocompleteTags,
  getTagCloud,
} from '@rhymix-ts/tag';

export const publicTagRouter = router({
  /**
   * 태그 자동완성 검색 — REQ-TAG-001
   *
   * 기존 태그 목록에서 검색어가 포함된 태그를 반환한다.
   */
  autocomplete: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(50),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      getAutocompleteTags(
        { query: input.query, limit: input.limit },
        { prisma: ctx.prisma },
      ),
    ),

  /**
   * 태그 클라우드 데이터 — REQ-TAG-005
   *
   * 사용 빈도가 높은 상위 N개 태그를 반환한다.
   */
  tagCloud: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) =>
      getTagCloud({ limit: input.limit }, { prisma: ctx.prisma }),
    ),
});
