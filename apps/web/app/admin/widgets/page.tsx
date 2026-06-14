/**
 * Admin 위젯 시스템 메인 페이지 — SPEC-WIDGET-001 Slice D + SPEC-ADMIN-EXTRAS-001 Slice B.
 *
 * 등록된 위젯 정의 목록과 DB 인스턴스 목록을 표시한다.
 * SPEC-ADMIN-EXTRAS-001 Slice B: 위젯 프리셋 라이브러리 섹션 추가.
 * @MX:SPEC: SPEC-WIDGET-001 REQ-WIDGET-D-001, SPEC-ADMIN-EXTRAS-001 REQ-WIDGET-PRESET-001~004
 */
import Link from 'next/link'
import { listWidgets } from '@rhymix-ts/core/widgets'
import { listWidgetInstances } from '@rhymix-ts/core/widgets'
import { prisma } from '@rhymix-ts/db'

export const dynamic = 'force-dynamic'

export default async function AdminWidgetsPage() {
  // 등록된 위젯 정의 목록 (레지스트리)
  const widgets = listWidgets()
  // DB 위젯 인스턴스 목록 (registered 여부 포함)
  const instances = await listWidgetInstances(prisma)

  // 프리셋 그룹화: widgetName별로 그룹화
  const presetsByWidget = instances.reduce((acc, inst) => {
    // 프리셋인 인스턴스만 필터링 (isPreset 필드가 있는지 확인 필요)
    // 현재는 모든 인스턴스를 프리셋 후보로 처리
    const widgetName = inst.widgetName
    if (!acc[widgetName]) {
      acc[widgetName] = []
    }
    acc[widgetName].push(inst)
    return acc
  }, {} as Record<string, typeof instances>)

  return (
    <section className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">위젯 시스템</h1>
          <p className="text-sm text-zinc-500 mt-1">
            등록된 위젯 정의 및 인스턴스를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/widgets/generator"
            className="px-3 py-2 text-sm rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-300"
          >
            코드 생성기
          </Link>
          <Link
            href="/admin/widgets/instances/new"
            className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            인스턴스 추가
          </Link>
        </div>
      </header>

      {/* 프리셋 라이브러리 섹션 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">위젯 프리셋 라이브러리</h2>
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              // TODO: 프리셋 생성 다이얼로그 오픈
              console.log('프리셋 생성')
            }}
          >
            + 프리셋 저장
          </button>
        </div>
        {Object.keys(presetsByWidget).length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center border border-zinc-200 rounded-md">
            저장된 프리셋이 없습니다.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(presetsByWidget).map(([widgetName, presets]) => {
              const widget = widgets.find((w) => w.name === widgetName)
              return (
                <div key={widgetName}>
                  <h3 className="text-sm font-medium text-zinc-700 mb-2">
                    {widget?.displayName ?? widgetName}
                  </h3>
                  <div className="border border-zinc-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">레이블</th>
                          <th className="text-left px-4 py-2 font-medium">등록 상태</th>
                          <th className="text-left px-4 py-2 font-medium">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presets.map((inst) => (
                          <tr key={inst.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                            <td className="px-4 py-2">{inst.label}</td>
                            <td className="px-4 py-2">
                              {inst.registered ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                  등록됨
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                                  미등록
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                className="text-blue-600 hover:underline text-xs mr-3"
                                onClick={() => {
                                  // TODO: 프리셋 선택으로 생성기 폼 프리필
                                  console.log('프리셋 선택:', inst.id)
                                }}
                              >
                                적용
                              </button>
                              <Link
                                href={`/admin/widgets/instances/${inst.id}/edit`}
                                className="text-blue-600 hover:underline text-xs mr-3"
                              >
                                수정
                              </Link>
                              <button
                                className="text-red-600 hover:underline text-xs"
                                onClick={() => {
                                  // TODO: 프리셋 삭제
                                  console.log('프리셋 삭제:', inst.id)
                                }}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 등록된 위젯 정의 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">등록된 위젯 정의</h2>
        {widgets.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center border border-zinc-200 rounded-md">
            등록된 위젯이 없습니다.
          </p>
        ) : (
          <div className="border border-zinc-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">이름</th>
                  <th className="text-left px-4 py-2 font-medium">표시명</th>
                  <th className="text-left px-4 py-2 font-medium">카테고리</th>
                  <th className="text-left px-4 py-2 font-medium">설명</th>
                </tr>
              </thead>
              <tbody>
                {widgets.map((w) => (
                  <tr key={w.name} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">{w.name}</td>
                    <td className="px-4 py-2">{w.displayName}</td>
                    <td className="px-4 py-2 text-zinc-500">{w.category ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-500">{w.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 위젯 인스턴스 목록 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">위젯 인스턴스</h2>
        {instances.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center border border-zinc-200 rounded-md">
            생성된 위젯 인스턴스가 없습니다.
          </p>
        ) : (
          <div className="border border-zinc-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">ID</th>
                  <th className="text-left px-4 py-2 font-medium">위젯</th>
                  <th className="text-left px-4 py-2 font-medium">레이블</th>
                  <th className="text-left px-4 py-2 font-medium">등록 상태</th>
                  <th className="text-left px-4 py-2 font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((inst) => (
                  <tr key={inst.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-400 text-xs">{inst.id}</td>
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">
                      {inst.widgetName}
                    </td>
                    <td className="px-4 py-2">{inst.label}</td>
                    <td className="px-4 py-2">
                      {inst.registered ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          등록됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                          미등록
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/widgets/instances/${inst.id}/edit`}
                        className="text-blue-600 hover:underline text-xs mr-3"
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
