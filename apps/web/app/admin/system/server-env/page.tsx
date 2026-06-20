/**
 * 서버 환경 view 페이지 — SPEC-ADMIN-002 Slice 3F.
 *
 * REQ-ADMIN2-144: 서버 환경 view (Node.js, Next.js, DB 버전, 환경변수).
 * REQ-ADMIN2-145: 민감 정보 마스킹 (SECRET, KEY, PASSWORD, TOKEN).
 *
 * @MX:NOTE: [AUTO] 읽기 전용 서버 환경 정보 표시.
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-144 REQ-ADMIN2-145
 */
import { getServerCaller } from '@/lib/trpc/server';

export const dynamic = 'force-dynamic';

export default async function ServerEnvPage() {
  const caller = await getServerCaller();
  const health = await caller.admin.system.health();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">서버 환경</h1>

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

      {/* Next.js 정보 */}
      <section className="mb-6">
        <h2 className="text-base font-medium mb-2">Next.js</h2>
        <table className="text-sm border-collapse w-full max-w-lg">
          <tbody>
            <tr>
              <td className="py-1 pr-4 text-zinc-500 w-32">버전</td>
              <td className="py-1 font-mono">{health.nextVersion}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* DB 정보 */}
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
            <tr className="border-b">
              <td className="py-1 pr-4 text-zinc-500">레이턴시</td>
              <td className="py-1 font-mono">
                {health.db.latencyMs >= 0 ? `${health.db.latencyMs}ms` : '-'}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-zinc-500">버전</td>
              <td className="py-1 font-mono">{health.dbVersion || '-'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 환경변수 목록 (민감 정보 마스킹됨) */}
      <section>
        <h2 className="text-base font-medium mb-2">
          환경변수 ({health.env.length}개)
        </h2>
        <p className="text-sm text-zinc-500 mb-3">
          * SECRET, KEY, PASSWORD, TOKEN 포함 키는 마스킹됩니다 (REQ-ADMIN2-145).
        </p>
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
  );
}
