/**
 * Admin 페이지의 siteId 결정 헬퍼 — SPEC-ADMIN-001 Slice C.
 *
 * x-site-id 헤더를 사용하는 것이 아니라 createContext 의 hostname 기반 재해석을
 * 신뢰한다. 본 헬퍼는 Server Component / Server Action 에서 fallback 값을 제공한다.
 * Slice D 의 Site Settings UI 도입 시 multi-site 로직으로 확장 예정.
 */
import { headers } from 'next/headers'

export async function getCurrentSiteId(): Promise<number> {
  const h = await headers()
  const raw = h.get('x-site-id')
  if (raw) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 1
}
