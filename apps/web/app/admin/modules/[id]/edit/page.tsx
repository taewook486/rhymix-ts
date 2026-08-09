/**
 * 모듈 인스턴스 편집 페이지 — SPEC-CONTENT-PARITY-001 M5 (REQ-CPAR-024).
 *
 * `/admin/modules/[id]` 상세 화면의 '설정 편집' 링크가 가리키던 dead link를 해소한다.
 * Server Component: admin.module.getById 로 현재 값을 조회한 뒤
 * ModuleEditForm(Client Component) 으로 초기값을 전달한다.
 *
 * @MX:SPEC: SPEC-CONTENT-PARITY-001 REQ-CPAR-024
 */
import { notFound } from 'next/navigation'
import { getServerCaller } from '@/lib/trpc/server'
import { ModuleEditForm } from './_components/ModuleEditForm'

export const dynamic = 'force-dynamic'

export default async function ModuleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const instanceId = parseInt(id, 10)
  if (isNaN(instanceId)) {
    notFound()
  }

  const caller = await getServerCaller()

  try {
    const instance = await caller.admin.module.getById({ instanceId })

    return (
      <section className="max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">모듈 편집</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {instance.title} ({instance.mid})
          </p>
        </header>
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <ModuleEditForm
            instanceId={instanceId}
            initialTitle={instance.title}
            initialBrowserTitle={instance.browserTitle ?? ''}
            initialDescription={instance.description ?? ''}
          />
        </div>
      </section>
    )
  } catch (error) {
    notFound()
  }
}
