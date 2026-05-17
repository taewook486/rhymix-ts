/**
 * apps/web/instrumentation.ts — SPEC-CONTENT-001 Slice A
 *
 * Next.js 16 instrumentation hook. 서버 시작 시 한 번 호출 (Edge / Node 양쪽).
 * HMR 에서도 process 가 살아있는 한 module-scope 캐시는 유지된다.
 *
 * @MX:NOTE [AUTO]: Edge runtime 에서는 Prisma 사용 불가 — nodejs 분기만 initModules 호출.
 * @MX:SPEC: SPEC-CONTENT-001 REQ-CONTENT-001
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initModules } = await import('./lib/modules/register');
    initModules();
  }
}
