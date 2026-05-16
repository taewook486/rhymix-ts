/**
 * Admin 위젯 시스템 페이지 — SPEC-ADMIN-001 Slice G
 *
 * 등록된 위젯 목록을 표시한다.
 * 실제 운영에서는 모듈 로딩 시 registerWidget이 호출됨.
 */
import { listWidgets } from '@rhymix-ts/core/widgets'

export default function AdminWidgetsPage() {
  const widgets = listWidgets()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">위젯 시스템</h1>
      {widgets.length === 0 ? (
        <p className="text-sm text-zinc-500">등록된 위젯이 없습니다.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-100">
              <th className="text-left px-3 py-2 font-medium">이름</th>
              <th className="text-left px-3 py-2 font-medium">표시명</th>
            </tr>
          </thead>
          <tbody>
            {widgets.map((w) => (
              <tr key={w.name} className="border-t border-zinc-200">
                <td className="px-3 py-2 font-mono text-xs">{w.name}</td>
                <td className="px-3 py-2">{w.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
