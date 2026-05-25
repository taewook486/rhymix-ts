/**
 * 캐시 관리 페이지 — SPEC-ADMIN-001 Slice F.
 *
 * Server Action 패턴으로 캐시 무효화를 수행한다.
 * 각 버튼은 form action 으로 admin.cache.purge 를 호출한다.
 *
 * @MX:NOTE: [AUTO] Server Action 으로 tRPC mutation 호출 — 기존 프로젝트 패턴 유지.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-060~063
 */
import { getServerCaller } from '@/lib/trpc/server'

/**
 * 캐시 무효화 Server Action.
 */
async function purgeCacheAction(formData: FormData) {
  'use server'
  const scope = formData.get('scope') as 'all' | 'module' | 'menu' | 'widget' | 'domain'
  const caller = await getServerCaller()
  await caller.admin.cache.purge({ scope })
}

export default function AdminCachePage() {
  const buttons: Array<{
    scope: 'all' | 'module' | 'menu' | 'widget' | 'domain'
    label: string
  }> = [
    { scope: 'all',    label: '전체 캐시 비우기' },
    { scope: 'module', label: '모듈 캐시' },
    { scope: 'menu',   label: '메뉴 캐시' },
    { scope: 'widget', label: '위젯 캐시' },
    { scope: 'domain', label: '도메인 캐시' },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">캐시 관리</h1>
      <p className="text-sm text-zinc-500 mb-6">
        버튼을 클릭하면 해당 범위의 Next.js 캐시가 즉시 무효화됩니다.
      </p>
      <div className="flex flex-wrap gap-3">
        {buttons.map(({ scope, label }) => (
          <form key={scope} action={purgeCacheAction}>
            <input type="hidden" name="scope" value={scope} />
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded border border-zinc-300 bg-white hover:bg-zinc-50 transition-colors"
            >
              {label}
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}
