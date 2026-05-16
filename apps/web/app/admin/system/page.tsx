/**
 * 시스템 헬스 페이지 — SPEC-ADMIN-001 Slice F.
 *
 * Server Component. getServerCaller() 로 admin.system.health 를 호출하여
 * Node.js 정보, DB 연결 상태, 환경변수 목록을 표시한다.
 *
 * @MX:NOTE: [AUTO] 데이터 표시 전용 페이지. mutation 없음.
 * @MX:SPEC: SPEC-ADMIN-001 REQ-ADMIN-080 REQ-ADMIN-081
 */
import { getServerCaller } from '@/lib/trpc/server'

export const dynamic = 'force-dynamic'

export default async function AdminSystemPage() {
  const caller = await getServerCaller()
  const health = await caller.admin.system.health()

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">시스템 헬스</h1>

      {/* Node.js 정보 */}
      <section className="mb-6">
        <h2 className="text-base font-medium mb-2">Node.js</h2>
        <table className="text-sm border-collapse w-full max-w-lg">
          <tbody>
            <tr className="border-b">
              <td className="py-1 pr-4 text-zinc-500 w-32">버전</td>
              <td className="py-1 font-mono">{health.node.version}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-zinc-500">플랫폼</td>
              <td className="py-1 font-mono">{health.node.platform}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* DB 연결 상태 */}
      <section className="mb-6">
        <h2 className="text-base font-medium mb-2">데이터베이스</h2>
        <table className="text-sm border-collapse w-full max-w-lg">
          <tbody>
            <tr className="border-b">
              <td className="py-1 pr-4 text-zinc-500 w-32">상태</td>
              <td className="py-1">
                {health.db.connected ? (
                  <span className="text-green-600">✓ 연결됨</span>
                ) : (
                  <span className="text-red-600">✗ 연결 실패</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-zinc-500">레이턴시</td>
              <td className="py-1 font-mono">
                {health.db.latencyMs >= 0 ? `${health.db.latencyMs}ms` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 환경변수 목록 */}
      <section>
        <h2 className="text-base font-medium mb-2">
          환경변수 ({health.env.length}개)
        </h2>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-1 pr-4 font-normal w-64">키</th>
                <th className="py-1 font-normal">값</th>
              </tr>
            </thead>
            <tbody>
              {health.env.map(({ key, value }) => (
                <tr key={key} className="border-b last:border-0">
                  <td className="py-1 pr-4 font-mono text-xs text-zinc-600">{key}</td>
                  <td className="py-1 font-mono text-xs break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
