/**
 * admin.cache tRPC 라우터 — SPEC-ADMIN-001 Slice F.
 *
 * REQ-ADMIN-060: 캐시 무효화 scope 별 제어.
 * REQ-ADMIN-061: scope + id 기반 단일 태그 무효화.
 * REQ-ADMIN-062: scope='all' 전체 prefix 무효화.
 * REQ-ADMIN-063: 무효화된 태그 목록 반환.
 *
 * 감사 로그는 protectedAdminProcedure 의 auditLogger 미들웨어가 자동으로 기록.
 *
 * @MX:NOTE: [AUTO] cache.purge 는 auditLogger 미들웨어 체인에 포함되므로
 *           AdminLog.create 를 직접 호출하지 않는다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-060~063
 */
import { z } from 'zod';
import { router, protectedAdminProcedure } from '../../trpc';
import { cacheAdapter } from '@/lib/cache/adapter';
import { CACHE_TAGS } from '@/lib/admin/cache-keys';

export const adminCacheRouter = router({
  /**
   * 캐시 무효화 mutation (REQ-ADMIN-060~063).
   *
   * scope='all' 이면 ALL_PREFIXES 전체를 revalidate.
   * scope=특정값 이면 prefix:id 형태로 단일 태그만 revalidate.
   */
  purge: protectedAdminProcedure
    .input(
      z.object({
        scope: z.enum(['all', 'module', 'menu', 'widget', 'domain']),
        id: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const invalidated: string[] = [];

      if (input.scope === 'all') {
        // 전체 prefix 무효화 (REQ-ADMIN-062)
        for (const prefix of CACHE_TAGS.ALL_PREFIXES) {
          await cacheAdapter.revalidate(prefix);
          invalidated.push(prefix);
        }
      } else {
        // 단일 scope 무효화 (REQ-ADMIN-061)
        const tag = input.id ? `${input.scope}:${input.id}` : input.scope;
        await cacheAdapter.revalidate(tag);
        invalidated.push(tag);
      }

      return { invalidated };
    }),
});
