/**
 * Layout 목록 관리 페이지 — SPEC-ADMIN-002 Slice 2A.
 *
 * 설치된 Layout 목록을 표시하고, 인스턴스 수를 포함한다 (REQ-ADMIN2-020).
 * Server Component: getServerCaller().admin.layout.list() 호출 후 테이블 렌더.
 *
 * @MX:SPEC: SPEC-ADMIN-002 REQ-ADMIN2-020
 */
import Link from 'next/link';
import { getServerCaller } from '@/lib/trpc/server';
import { Button } from '@rhymix-ts/ui/components';

export const dynamic = 'force-dynamic';

export default async function LayoutsPage() {
  const caller = await getServerCaller();
  const layouts = await caller.admin.layout.list();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">레이아웃 관리</h1>
          <p className="text-sm text-zinc-500 mt-1">
            설치된 레이아웃과 인스턴스를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/site/layouts/instances">인스턴스 관리</Link>
        </Button>
      </div>

      {layouts.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
          <p className="text-zinc-500 mb-4">설치된 레이아웃이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  인스턴스 수
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {layouts.map((layout) => (
                <tr key={layout.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-zinc-900">
                      {layout.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">{layout.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                      {layout.layoutType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-600">
                      {layout.instanceCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/site/layouts/${layout.id}`}>인스턴스 보기</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
