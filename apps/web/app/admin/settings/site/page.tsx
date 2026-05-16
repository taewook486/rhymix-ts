/**
 * Site 설정 페이지 — SPEC-ADMIN-001 Slice E-4.
 *
 * Server Component. admin.site.get / admin.site.domain.list 로 데이터 조회.
 * Site 기본 정보 + Domain 목록(forceHttps 토글) 렌더.
 *
 * @MX:NOTE: [AUTO] Site 설정은 싱글턴 레코드 기반. 멀티사이트는 Slice F+.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-050, REQ-ADMIN-051, REQ-ADMIN-052
 */
import { getServerCaller } from '@/lib/trpc/server'

export const dynamic = 'force-dynamic'

export default async function AdminSiteSettingsPage() {
  const caller = await getServerCaller()
  const [site, domains] = await Promise.all([
    caller.admin.site.get(),
    caller.admin.site.domain.list(),
  ])

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">사이트 설정</h1>

      {/* Site 기본 정보 */}
      <section>
        <h2 className="text-base font-semibold mb-4">기본 정보</h2>
        {site ? (
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-zinc-500 w-36 inline-block">기본 언어</span>
              <span>{site.defaultLanguage ?? '—'}</span>
            </div>
            <div>
              <span className="font-medium text-zinc-500 w-36 inline-block">기본 시간대</span>
              <span>{site.timeZone ?? '—'}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">사이트 정보가 없습니다.</p>
        )}
      </section>

      {/* Domain 목록 */}
      <section>
        <h2 className="text-base font-semibold mb-4">도메인 목록</h2>
        {domains.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 도메인이 없습니다.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-100">
                <th className="text-left px-3 py-2 font-medium">호스트명</th>
                <th className="text-left px-3 py-2 font-medium">기본 도메인</th>
                <th className="text-left px-3 py-2 font-medium">HTTPS 강제</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr key={domain.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2">{domain.hostname}</td>
                  <td className="px-3 py-2">{domain.isDefault ? '✓' : '—'}</td>
                  <td className="px-3 py-2">{domain.forceHttps ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
