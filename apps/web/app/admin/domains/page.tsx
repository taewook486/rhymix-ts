/**
 * 도메인 관리 페이지 — SPEC-ADMIN-002 REQ-ADMIN2-125.
 *
 * Domain 모델 목록 표시:
 * - REQ-ADMIN2-125: /admin/domains page listing Domain model with isDefault flag and per-domain default module
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-125
 */
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { IndexModuleForm, type ModuleOption } from './IndexModuleForm'

export const dynamic = 'force-dynamic'

export default async function AdminDomainsPage() {
  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()
  const [domains, instances] = await Promise.all([
    caller.admin.domain.list({ siteId }),
    caller.admin.module.list({ siteId }),
  ])
  const moduleOptions: ModuleOption[] = instances.map((m) => ({
    id: m.id,
    mid: m.mid,
    name: m.name,
    moduleCode: m.moduleCode,
  }))

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">도메인 관리</h1>
        <p className="text-sm text-zinc-500 mt-1">
          사이트 도메인 설정을 관리합니다.
        </p>
      </header>

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  도메인
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  기본 도메인
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  HTTPS 강제
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  인덱스(홈) 모듈
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  언어/시간대
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                    등록된 도메인이 없습니다.
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900">{domain.hostname}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {domain.isDefault && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          기본
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        domain.forceHttps
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}>
                        {domain.forceHttps ? 'HTTPS' : 'HTTP'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                      <IndexModuleForm
                        domainId={domain.id}
                        currentModuleInstanceId={domain.indexModuleInstanceId}
                        options={moduleOptions}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                      <div>{domain.defaultLanguage || '미설정'}</div>
                      <div className="text-xs text-zinc-400">{domain.defaultTimezone || '미설정'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
