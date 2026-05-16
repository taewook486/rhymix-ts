/**
 * Server-side tRPC caller 헬퍼 — SPEC-ADMIN-001 Slice C.
 *
 * Server Component / Server Action 에서 tRPC 프로시저를 직접 호출할 때 사용한다.
 * React Query / TRPCProvider 없이 SSR 과 Server Action 에서 tRPC 를 활용하는 패턴.
 *
 * @MX:ANCHOR: [AUTO] 모든 Server Component / Server Action 의 tRPC 호출 진입점.
 * @MX:REASON: context 일관성 — caller 가 createContext 를 매번 동일하게 호출해야
 *             siteId 재해석과 헤더 스푸핑 차단이 일관됨. fan_in 은 즉시 5 이상이며
 *             Slice D 의 Menu / Site / Members 슬라이스에서 더 증가.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-020
 */
import { headers } from 'next/headers'
import { appRouter } from '@/server/api/root'
import { createContext } from '@/server/api/context'

export async function getServerCaller() {
  const h = await headers()
  // headers() 를 Request 로 변환 — host/cookie 헤더를 createContext 가 필요로 함
  const headerInit: Record<string, string> = {}
  h.forEach((value, key) => {
    headerInit[key] = value
  })
  const req = new Request('http://internal', { headers: headerInit })
  const ctx = await createContext({ req })
  return appRouter.createCaller(ctx)
}
