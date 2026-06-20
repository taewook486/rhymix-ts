/**
 * admin.system tRPC 라우터 — SPEC-ADMIN-001 Slice F + SPEC-ADMIN-002 Slice 3F.
 *
 * REQ-ADMIN-080: 시스템 헬스 정보 (Node.js 버전, DB 연결 상태, 환경변수 목록).
 * REQ-ADMIN-081: 민감 환경변수 마스킹 (SECRET, KEY, PASSWORD, TOKEN 포함 키).
 * REQ-ADMIN2-144: 서버 환경 view (Next.js 버전, DB 버전 추가).
 * REQ-ADMIN2-145: 민감 정보 마스킹 (기존 SENSITIVE_PATTERNS로 충족).
 *
 * @MX:NOTE: [AUTO] 시스템 헬스 조회 전용 라우터. mutation 없음.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-080 REQ-ADMIN-081
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-144 REQ-ADMIN2-145
 */
import { router, protectedAdminProcedure } from '../../trpc';
import { readFileSync } from 'fs';
import { join } from 'path';

// Next.js 버전 읽기 (REQ-ADMIN2-144)
function getNextVersion(): string {
  try {
    const nextPackagePath = join(process.cwd(), 'node_modules', 'next', 'package.json');
    const pkg = JSON.parse(readFileSync(nextPackagePath, 'utf-8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** 민감 환경변수 키 마스킹 패턴 (REQ-ADMIN-081) */
const SENSITIVE_PATTERNS = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN'] as const;

/**
 * 환경변수 키가 민감 패턴을 포함하는지 확인한다.
 */
function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_PATTERNS.some((pattern) => upper.includes(pattern));
}

export const adminSystemRouter = router({
  /**
   * 시스템 헬스 정보 조회 (REQ-ADMIN-080, REQ-ADMIN-081, REQ-ADMIN2-144, REQ-ADMIN2-145).
   *
   * - node: process.version, process.platform
   * - db: prisma.$queryRaw`SELECT 1` 으로 latency 측정
   * - dbVersion: PostgreSQL 버전 (REQ-ADMIN2-144)
   * - nextVersion: Next.js 버전 (REQ-ADMIN2-144)
   * - env: 민감 키 마스킹 후 최대 50개 반환 (REQ-ADMIN2-145)
   */
  health: protectedAdminProcedure
    .query(async ({ ctx }) => {
      // Node.js 정보
      const node = {
        version: process.version,
        platform: process.platform as string,
      };

      // Next.js 버전 (REQ-ADMIN2-144)
      const nextVersion = getNextVersion();

      // DB 연결 상태 및 버전 (REQ-ADMIN2-144)
      let db: { connected: boolean; latencyMs: number };
      let dbVersion: string | null = null;
      try {
        const start = Date.now();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (ctx.prisma as any).$queryRaw`SELECT 1`;
        db = { connected: true, latencyMs: Date.now() - start };

        // PostgreSQL 버전 조회 (REQ-ADMIN2-144)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const versionResult = await (ctx.prisma as any).$queryRaw`SELECT version()`;
          if (versionResult && versionResult[0]) {
            dbVersion = versionResult[0].version || null;
          }
        } catch {
          dbVersion = null;
        }
      } catch {
        db = { connected: false, latencyMs: -1 };
        dbVersion = null;
      }

      // 환경변수 수집 (undefined 제외, 최대 200개, 민감 키 마스킹 REQ-ADMIN2-145)
      const env: Array<{ key: string; value: string }> = Object.entries(process.env)
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
        .slice(0, 200)
        .map(([key, value]) => ({
          key,
          value: isSensitiveKey(key) ? '***' : value,
        }));

      return { node, db, dbVersion, nextVersion, env };
    }),
});
