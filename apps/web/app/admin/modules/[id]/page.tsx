/**
 * 모듈 인스턴스 상세 보기 — SPEC-ADMIN-002 REQ-ADMIN2-146.
 *
 * 모듈 상세 정보 표시:
 * - REQ-ADMIN2-146: Module detail/info view showing config, grant settings, category assignment
 * - REQ-CPAR-025 (SPEC-CONTENT-PARITY-001 M5): board 타입 모듈은 per-board 관리 화면
 *   (분류/확장 변수/권한/피드) 진입 링크를 노출한다.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-146, SPEC-CONTENT-PARITY-001 REQ-CPAR-025
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerCaller } from '@/lib/trpc/server'
import { getCurrentSiteId } from '@/lib/admin/site-context'
import { Button } from '@rhymix-ts/ui/components'

export const dynamic = 'force-dynamic'

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const instanceId = parseInt(id, 10)
  if (isNaN(instanceId)) {
    notFound()
  }

  const siteId = await getCurrentSiteId()
  const caller = await getServerCaller()

  try {
    const instance = await caller.admin.module.getById({ instanceId })

    return (
      <section>
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{instance.title}</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {instance.moduleCode} ({instance.mid})
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/modules/${instanceId}/edit`}>설정 편집</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-zinc-500">모듈 이름</dt>
                <dd className="text-sm font-medium text-zinc-900">{instance.title}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">모듈 코드</dt>
                <dd className="text-sm font-medium text-zinc-900">{instance.moduleCode}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">MID</dt>
                <dd className="text-sm font-medium text-zinc-900">{instance.mid}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">브라우저 제목</dt>
                <dd className="text-sm font-medium text-zinc-900">
                  {instance.browserTitle || '미설정'}
                </dd>
              </div>
            </dl>
          </div>

          {/* 권한 설정 (REQ-ADMIN2-146 grant settings) */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold mb-4">권한 설정</h2>
            <div className="space-y-4">
              {instance.config && typeof instance.config === 'object' && 'grant' in instance.config ? (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-zinc-500">권한 타입</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {(instance.config as any).grant?.permission || '미설정'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-zinc-500">접근 그룹</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {(instance.config as any).grant?.groupIds?.length
                        ? (instance.config as any).grant.groupIds.join(', ')
                        : '전체'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-zinc-500">권한 설정이 없습니다.</p>
              )}
            </div>
          </div>

          {/* per-board 관리 화면 링크 (REQ-CPAR-025) — board 타입 모듈에만 노출 */}
          {instance.moduleCode === 'board' && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold mb-4">게시판 관리</h2>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/admin/boards/${instance.mid}/categories`}>분류 관리</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/admin/boards/${instance.mid}/extra-keys`}>확장 변수</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/admin/boards/${instance.mid}/permissions`}>권한 관리</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/admin/boards/${instance.mid}/feed`}>피드 설정</Link>
                </Button>
              </div>
            </div>
          )}

          {/* 추가 설정 */}
          {instance.config && Object.keys(instance.config).length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-lg font-semibold mb-4">추가 설정</h2>
              <pre className="text-xs bg-zinc-50 p-4 rounded overflow-auto">
                {JSON.stringify(instance.config, null, 2)}
              </pre>
            </div>
          )}

          {/* 작업 영역 */}
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/modules">목록으로</Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/modules/${instanceId}/edit`}>편집</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  } catch (error) {
    notFound()
  }
}
