/**
 * admin.cache tRPC 라우터 — SPEC-ADMIN-001 Slice F + SPEC-ADMIN-002 Slice 3F.
 *
 * REQ-ADMIN-060: 캐시 무효화 scope 별 제어.
 * REQ-ADMIN-061: scope + id 기반 단일 태그 무효화.
 * REQ-ADMIN-062: scope='all' 전체 prefix 무효화.
 * REQ-ADMIN-063: 무효화된 태그 목록 반환.
 * REQ-ADMIN2-149: 코어파일 정리 (cleanup files) 기능.
 *
 * 감사 로그는 protectedAdminProcedure 의 auditLogger 미들웨어가 자동으로 기록.
 *
 * @MX:NOTE: [AUTO] cache.purge 는 auditLogger 미들웨어 체인에 포함되므로
 *           AdminLog.create 를 직접 호출하지 않는다.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-060~063
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-149
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { readdir, stat, unlink, rm } from 'fs/promises';
import { resolve, join, normalize } from 'path';
import { router, protectedAdminProcedure } from '../../trpc';
import { cacheAdapter } from '@/lib/cache/adapter';
import { CACHE_TAGS } from '@/lib/admin/cache-keys';

/**
 * 캐시 정리 대상 기본 디렉토리 (REQ-ADMIN2-149).
 *
 * .next/cache 디렉토리를 스캔하여 생성된 캐시 파일을 정리한다.
 */
const CACHE_CLEANUP_BASE_DIR = resolve(process.cwd(), '.next', 'cache');

/**
 * 경로가 허용된 기본 디렉토리 내부에 있는지 검증 (REQ-ADMIN2-149).
 *
 * 경로 트래버설 공격 방지를 위해 모든 경로를 검증한다.
 */
function isValidPath(targetPath: string, baseDir: string): boolean {
  const resolvedTarget = resolve(baseDir, targetPath);
  const normalizedBase = normalize(baseDir);
  const normalizedTarget = normalize(resolvedTarget);

  // targetPath가 baseDir로 시작하거나 baseDir 내부에 있는지 확인
  return normalizedTarget.startsWith(normalizedBase + '/') ||
         normalizedTarget === normalizedBase;
}

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

  /**
   * 캐시 파일 정리 후보 목록 조회 (REQ-ADMIN2-149).
   *
   * .next/cache 디렉토리를 스캔하여 삭제 가능한 파일 목록을 반환한다.
   * 실제 삭제는 수행하지 않는다 (dry-run).
   */
  listCleanupCandidates: protectedAdminProcedure
    .query(async () => {
      const candidates: Array<{ path: string; size: number; isFile: boolean }> = [];

      try {
        const entries = await readdir(CACHE_CLEANUP_BASE_DIR, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(CACHE_CLEANUP_BASE_DIR, entry.name);

          // 경로 검증 (이중 검사)
          if (!isValidPath(fullPath, CACHE_CLEANUP_BASE_DIR)) {
            continue;
          }

          try {
            const stats = await stat(fullPath);
            candidates.push({
              path: fullPath,
              size: stats.size,
              isFile: stats.isFile(),
            });
          } catch {
            // stat 실패 시 건너뜀
            continue;
          }
        }
      } catch {
        // 디렉토리 읽기 실패 시 빈 목록 반환
      }

      return { candidates };
    }),

  /**
   * 캐시 파일 삭제 (REQ-ADMIN2-149).
   *
   * 지정된 파일 목록을 삭제한다.
   * 모든 경로는 허용된 기본 디렉토리 내부에 있어야 한다.
   */
  cleanupFiles: protectedAdminProcedure
    .input(
      z.object({
        paths: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      // 사전 경로 검증: 모든 경로가 유효한지 먼저 확인 (REQ-ADMIN2-149)
      for (const rawPath of input.paths) {
        if (!isValidPath(rawPath, CACHE_CLEANUP_BASE_DIR)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid path: ${rawPath} (not in allowed directory)`,
          });
        }
      }

      let deleted = 0;
      const errors: Array<{ path: string; error: string }> = [];

      for (const rawPath of input.paths) {
        try {
          const resolvedPath = resolve(CACHE_CLEANUP_BASE_DIR, rawPath);

          // 파일 또는 디렉토리 삭제
          await rm(resolvedPath, { recursive: true, force: true });
          deleted++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ path: rawPath, error: errorMessage });
        }
      }

      return { deleted, errors };
    }),
});
